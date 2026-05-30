import { create } from 'zustand';
import {
  getAllSales,
  insertSale,
  deleteSale as dbDeleteSale,
  generateInvoiceNumber,
  upsertCustomer,
} from '@/lib/sqlite';
import { useInventoryStore } from './inventoryStore';
import type { Sale, SaleItem, CartItem, CustomerInput, PaymentMethod } from '@/types/sales';

interface CartStateArg {
  items: CartItem[];
  customerInput: CustomerInput;
  paymentMethod: PaymentMethod;
  paidAmount: string;
  saleNotes: string;
  subtotal: () => number;
  discountTotal: () => number;
  grandTotal: () => number;
  remainingDebt: () => number;
}

interface SalesState {
  sales: Sale[];
  isLoading: boolean;
  loadSales: () => Promise<void>;
  createSale: (cart: CartStateArg) => Promise<Sale>;
  deleteSale: (id: number) => Promise<void>;
  refreshSales: () => Promise<void>;
  searchSales: (query: string) => Sale[];
}

export const useSalesStore = create<SalesState>((set, get) => ({
  sales: [],
  isLoading: false,

  loadSales: async () => {
    set({ isLoading: true });
    try {
      const sales = await getAllSales();
      set({ sales, isLoading: false });
    } catch (err) {
      console.error('Failed to load sales:', err);
      set({ isLoading: false });
    }
  },

  createSale: async (cart: CartStateArg): Promise<Sale> => {
    const invoiceNumber = await generateInvoiceNumber();

    const subtotal = cart.subtotal();
    const discountTotal = cart.discountTotal();
    const grandTotal = cart.grandTotal();
    const paid = parseFloat(cart.paidAmount) || 0;
    const remaining = cart.remainingDebt();

    const customer = cart.customerInput;
    let customerId: number | null = null;
    if (customer.name.trim()) {
      customerId = await upsertCustomer({
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim() || undefined,
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
      grandTotal,
      paidAmount: cart.paymentMethod === 'debt' ? paid : grandTotal,
      remainingDebt: remaining,
      status: 'completed' as const,
    };

    const saleId = await insertSale(saleData, saleItems);

    await useInventoryStore.getState().reloadAfterSale();

    // Keep customer list in sync without a circular import
    try {
      const { useCustomerStore } = await import('@/store/customerStore');
      useCustomerStore.getState().reloadAfterSale();
    } catch {}

    try {
      const { useDebtStore } = await import('@/store/debtStore');
      useDebtStore.getState().reloadAfterSale();
    } catch {}

    try {
      const { useReportStore } = await import('@/store/reportStore');
      useReportStore.getState().reload();
    } catch {}

    const newSale: Sale = {
      ...saleData,
      id: saleId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: saleItems.map((item, i) => ({ ...item, id: i, saleId })),
    };

    set((state) => ({ sales: [newSale, ...state.sales] }));
    return newSale;
  },

  deleteSale: async (id: number) => {
    await dbDeleteSale(id);
    await useInventoryStore.getState().reloadAfterSale();
    set((state) => ({ sales: state.sales.filter((s) => s.id !== id) }));
    try {
      const { useCustomerStore } = await import('@/store/customerStore');
      useCustomerStore.getState().reloadAfterSale();
    } catch {}
    try {
      const { useDebtStore } = await import('@/store/debtStore');
      useDebtStore.getState().reloadAfterSale();
    } catch {}
    try {
      const { useReportStore } = await import('@/store/reportStore');
      useReportStore.getState().reload();
    } catch {}
  },

  refreshSales: async () => {
    const sales = await getAllSales();
    set({ sales });
  },

  searchSales: (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return get().sales;
    return get().sales.filter(
      (s) =>
        s.invoiceNumber.toLowerCase().includes(q) ||
        (s.customerName?.toLowerCase().includes(q) ?? false)
    );
  },
}));
