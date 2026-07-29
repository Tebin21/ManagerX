import { create } from 'zustand';
import {
  getAllSales,
  insertSale,
  deleteSale as dbDeleteSale,
  updateSaleComplete,
  generateInvoiceNumber,
  upsertCustomer,
  getSaleItemsSearchIndex,
} from '@/lib/sqlite';
import { useInventoryStore } from './inventoryStore';
import { useSettingsStore } from './settingsStore';
import { roundToNearest250 } from '@/utils/rounding';
import type { Sale, SaleItem, CartItem, CustomerInput, PaymentMethod, UpdateSaleCompleteInput, GlobalDiscountType } from '@/types/sales';

interface CartStateArg {
  items: CartItem[];
  customerInput: CustomerInput;
  paymentMethod: PaymentMethod;
  paidAmount: string;
  saleNotes: string;
  saleDate?: Date;
  subtotal: () => number;
  discountTotal: () => number;
  globalDiscountType: GlobalDiscountType;
  globalDiscountAmount: () => number;
  grandTotal: () => number;
  remainingDebt: () => number;
}

interface SalesState {
  sales: Sale[];
  isLoading: boolean;
  /** saleId -> "productName itemId productName itemId …", used only by searchSales. */
  saleItemsIndex: Record<number, string>;
  loadSales: () => Promise<void>;
  createSale: (cart: CartStateArg) => Promise<Sale>;
  updateSale: (saleId: number, input: UpdateSaleCompleteInput) => Promise<void>;
  deleteSale: (id: number) => Promise<void>;
  refreshSales: () => Promise<void>;
  searchSales: (query: string) => Sale[];
}

export const useSalesStore = create<SalesState>((set, get) => ({
  sales: [],
  isLoading: false,
  saleItemsIndex: {},

  loadSales: async () => {
    set({ isLoading: true });
    try {
      const [sales, saleItemsIndex] = await Promise.all([getAllSales(), getSaleItemsSearchIndex()]);
      set({ sales, saleItemsIndex, isLoading: false });
    } catch (err) {
      console.error('Failed to load sales:', err);
      set({ isLoading: false });
    }
  },

  createSale: async (cart: CartStateArg): Promise<Sale> => {
    const invoiceNumber = await generateInvoiceNumber();

    const subtotal = cart.subtotal();
    const discountTotal = cart.discountTotal();
    const globalDiscountAmount = cart.globalDiscountAmount();
    const grandTotal = cart.grandTotal();
    const paid = roundToNearest250(parseFloat(cart.paidAmount) || 0);
    const remaining = cart.remainingDebt();

    const customer = cart.customerInput;
    let customerId: number | null = null;
    if (customer.name.trim()) {
      customerId = await upsertCustomer({
        name:       customer.name.trim(),
        phone:      customer.phone.trim(),
        address:    customer.address.trim() || undefined,
        selectedId: customer.selectedCustomerId,
      });
    }

    const saleItems: Omit<SaleItem, 'id' | 'saleId'>[] = cart.items.map((ci) => ({
      productId: ci.product.id,
      productName: ci.product.name,
      itemId: ci.product.itemId,
      idMode: ci.product.idMode,
      purchasePrice: ci.product.purchasePrice,
      sellingPrice: ci.sellingPrice,
      quantity: ci.quantity,
      discount: ci.discount,
      lineTotal: ci.lineTotal,
    }));

    const exchangeRateUsed = useSettingsStore.getState().exchangeRate;

    const saleData = {
      invoiceNumber,
      customerId,
      customerName: customer.name.trim() || null,
      customerPhone: customer.phone.trim() || null,
      customerAddress: customer.address.trim() || null,
      warranty: customer.warranty.trim() || null,
      notes: cart.saleNotes.trim() || null,
      paymentMethod: cart.paymentMethod,
      subtotal,
      discountTotal,
      globalDiscountType: cart.globalDiscountType,
      globalDiscount: globalDiscountAmount,
      grandTotal,
      paidAmount: cart.paymentMethod === 'debt' ? paid : grandTotal,
      remainingDebt: remaining,
      status: 'completed' as const,
      exchangeRateUsed,
      date: (cart.saleDate ?? new Date()).toISOString(),
    };

    const saleId = await insertSale(saleData, saleItems);

    await useInventoryStore.getState().reloadAfterSale();

    // Keep customer list in sync without a circular import
    try {
      const { useCustomerStore } = await import('@/store/customerStore');
      await useCustomerStore.getState().reloadAfterSale();
    } catch {}

    try {
      const { useDebtStore } = await import('@/store/debtStore');
      await useDebtStore.getState().reloadAfterSale();
    } catch {}

    try {
      const { useReportStore } = await import('@/store/reportStore');
      await useReportStore.getState().reloadAfterMutation();
    } catch {}

    const ts = (cart.saleDate ?? new Date()).toISOString();
    const newSale: Sale = {
      ...saleData,
      id: saleId,
      createdAt: ts,
      updatedAt: ts,
      items: saleItems.map((item, i) => ({ ...item, id: i, saleId })),
    };

    const itemsText = saleItems
      .map((item) => (item.itemId ? `${item.productName} ${item.itemId}` : item.productName))
      .join(' ');

    set((state) => ({
      sales: [newSale, ...state.sales],
      saleItemsIndex: { ...state.saleItemsIndex, [saleId]: itemsText },
    }));
    return newSale;
  },

  updateSale: async (saleId: number, input: UpdateSaleCompleteInput) => {
    await updateSaleComplete(saleId, input);
    const [sales, saleItemsIndex] = await Promise.all([getAllSales(), getSaleItemsSearchIndex()]);
    set({ sales, saleItemsIndex });
    await useInventoryStore.getState().reloadAfterSale();
    try {
      const { useCustomerStore } = await import('@/store/customerStore');
      await useCustomerStore.getState().reloadAfterSale();
    } catch {}
    try {
      const { useDebtStore } = await import('@/store/debtStore');
      await useDebtStore.getState().reloadAfterSale();
    } catch {}
    try {
      const { useReportStore } = await import('@/store/reportStore');
      await useReportStore.getState().reloadAfterMutation();
    } catch {}
  },

  deleteSale: async (id: number) => {
    await dbDeleteSale(id);
    await useInventoryStore.getState().reloadAfterSale();
    set((state) => {
      const saleItemsIndex = { ...state.saleItemsIndex };
      delete saleItemsIndex[id];
      return { sales: state.sales.filter((s) => s.id !== id), saleItemsIndex };
    });
    try {
      const { useCustomerStore } = await import('@/store/customerStore');
      await useCustomerStore.getState().reloadAfterSale();
    } catch {}
    try {
      const { useDebtStore } = await import('@/store/debtStore');
      await useDebtStore.getState().reloadAfterSale();
    } catch {}
    try {
      const { useReportStore } = await import('@/store/reportStore');
      await useReportStore.getState().reloadAfterMutation();
    } catch {}
  },

  refreshSales: async () => {
    const [sales, saleItemsIndex] = await Promise.all([getAllSales(), getSaleItemsSearchIndex()]);
    set({ sales, saleItemsIndex });
  },

  searchSales: (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return get().sales;
    const qDigits = q.replace(/\D/g, '');
    const itemsIndex = get().saleItemsIndex;
    return get().sales.filter((s) => {
      if (s.invoiceNumber.toLowerCase().includes(q)) return true;
      if (qDigits && s.invoiceNumber.replace(/\D/g, '').includes(qDigits)) return true;
      if (s.customerName?.toLowerCase().includes(q)) return true;
      if (s.customerPhone) {
        if (s.customerPhone.toLowerCase().includes(q)) return true;
        if (qDigits && s.customerPhone.replace(/\D/g, '').includes(qDigits)) return true;
      }
      const itemsText = itemsIndex[s.id];
      if (itemsText && itemsText.toLowerCase().includes(q)) return true;
      return false;
    });
  },
}));
