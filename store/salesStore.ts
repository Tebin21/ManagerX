import { create } from 'zustand';
import {
  getAllSales,
  insertSale,
  deleteSale as dbDeleteSale,
  updateSaleComplete,
  generateInvoiceNumber,
  upsertCustomer,
  getOrCreateDirectCustomer,
  DIRECT_CUSTOMER_NAME,
  isDirectCustomerName,
  getSaleItemsSearchIndex,
} from '@/lib/sqlite';
import { useInventoryStore } from './inventoryStore';
import { useSettingsStore } from './settingsStore';
import { roundToNearest250 } from '@/utils/rounding';
import { toEnglishDigits } from '@/utils/formatters';
import type { Sale, SaleItem, CartItem, CustomerInput, PaymentMethod, UpdateSaleCompleteInput, GlobalDiscountType } from '@/types/sales';

interface CartStateArg {
  items: CartItem[];
  customerInput: CustomerInput;
  paymentMethod: PaymentMethod;
  paidAmount: string;
  initialPaymentMethod?: 'cash' | 'fib';
  saleNotes: string;
  saleDate?: Date;
  installmentMonths?: number;
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
    const { assertSalesLimit } = await import('@/lib/usageLimits');
    await assertSalesLimit();

    const invoiceNumber = await generateInvoiceNumber();

    const subtotal = cart.subtotal();
    const discountTotal = cart.discountTotal();
    const globalDiscountAmount = cart.globalDiscountAmount();
    const grandTotal = cart.grandTotal();
    if (grandTotal <= 0) {
      throw new Error('ZERO_TOTAL_NOT_ALLOWED');
    }
    const { baseCurrency, exchangeRate: rateSetting } = useSettingsStore.getState();
    const isUSD = baseCurrency === 'USD';
    const exchangeRateUsed = rateSetting || 1310;
    const rawPaid = parseFloat(toEnglishDigits(cart.paidAmount).replace(/,/g, '')) || 0;
    const enteredPaid = isUSD ? roundToNearest250(rawPaid * exchangeRateUsed) : roundToNearest250(rawPaid);
    const maxPaidIQD = isUSD
      ? Math.min(
          roundToNearest250(Math.max(0, Math.round(((grandTotal / exchangeRateUsed) - 0.01) * 100) / 100) * exchangeRateUsed),
          Math.max(0, grandTotal - 250)
        )
      : Math.max(0, grandTotal - 250);
    const isDebt = cart.paymentMethod === 'debt';
    const isInstallment = cart.paymentMethod === 'installment';
    const isPartial = isDebt || isInstallment;
    const paid = isPartial
      ? Math.max(0, Math.min(enteredPaid, maxPaidIQD))
      : grandTotal;
    const remaining = isPartial ? Math.max(0, grandTotal - paid) : 0;

    const customer = cart.customerInput;
    let customerId: number | null = null;
    const isDirect = !customer.name.trim() || isDirectCustomerName(customer.name);

    if (isDirect) {
      if (isInstallment) {
        throw new Error('DIRECT_CUSTOMER_NOT_ALLOWED_FOR_INSTALLMENT');
      }
      customerId = await getOrCreateDirectCustomer();
    } else if (customer.name.trim()) {
      customerId = await upsertCustomer({
        name:       customer.name.trim(),
        phone:      customer.phone.trim(),
        address:    customer.address.trim() || undefined,
        selectedId: customer.selectedCustomerId,
      });
    }

    const customerName = isDirect
      ? DIRECT_CUSTOMER_NAME
      : (customer.name.trim() || null);

    const saleItems: Omit<SaleItem, 'id' | 'saleId'>[] = cart.items.map((ci) => ({
      productId: ci.product.id,
      productName: ci.product.name,
      itemId: ci.product.itemId,
      idMode: ci.product.idMode,
      purchasePrice: ci.selectedBatch?.buyPriceIQD || ci.product.purchasePrice,
      sellingPrice: ci.sellingPrice,
      quantity: ci.quantity,
      discount: ci.discount,
      lineTotal: ci.lineTotal,
      batchNumber: ci.selectedBatch?.batchNum ?? 1,
      purchaseId: ci.selectedBatch?.purchaseId ?? null,
    }));

    const authUser = (await import('@/store/authStore')).useAuthStore.getState().user;
    const mgmt = (await import('@/store/managementStore')).useManagementStore.getState();
    const createdBy = mgmt.isEmployee
      ? (mgmt.currentEmployeeAccount?.displayName || mgmt.currentEmployeeAccount?.email || 'کارمەند')
      : (authUser?.displayName || authUser?.email || 'فرۆشیار');
    const createdByEmail = mgmt.isEmployee
      ? (mgmt.currentEmployeeAccount?.email?.toLowerCase() || '')
      : (authUser?.email?.toLowerCase() || '');

    const months = isInstallment ? Math.max(1, cart.installmentMonths || 6) : null;
    const monthlyAmount = isInstallment && months ? Math.round((remaining / months) * 100) / 100 : null;

    const saleData = {
      invoiceNumber,
      customerId,
      customerName,
      customerPhone: isDirect ? null : (customer.phone.trim() || null),
      customerAddress: isDirect ? null : (customer.address.trim() || null),
      warranty: customer.warranty.trim() || null,
      notes: cart.saleNotes.trim() || null,
      paymentMethod: cart.paymentMethod,
      initialPaymentMethod: isPartial && paid > 0 ? (cart.initialPaymentMethod ?? 'cash') : null,
      subtotal,
      discountTotal,
      globalDiscountType: cart.globalDiscountType,
      globalDiscount: globalDiscountAmount,
      grandTotal,
      paidAmount: isPartial ? paid : grandTotal,
      remainingDebt: remaining,
      status: 'completed' as const,
      exchangeRateUsed,
      date: (cart.saleDate ?? new Date()).toISOString(),
      createdBy,
      createdByEmail,
      installmentMonths: months,
      installmentDownPayment: isInstallment ? paid : null,
      installmentMonthlyAmount: monthlyAmount,
    };

    const saleId = await insertSale(saleData, saleItems);

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

    // Keep customer list, inventory, debt and reports in sync concurrently in background without blocking sale creation
    Promise.all([
      useInventoryStore.getState().reloadAfterSale().catch(() => {}),
      import('@/store/customerStore').then(({ useCustomerStore }) => useCustomerStore.getState().reloadAfterSale()).catch(() => {}),
      import('@/store/debtStore').then(({ useDebtStore }) => useDebtStore.getState().reloadAfterSale()).catch(() => {}),
      import('@/store/reportStore').then(({ useReportStore }) => useReportStore.getState().reloadAfterMutation()).catch(() => {}),
    ]).catch((err) => console.warn('[SalesStore] Background stores refresh error:', err));

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
    try {
      const { useManagementStore } = await import('@/store/managementStore');
      const { isEmployee, currentPermissions } = useManagementStore.getState();
      if (isEmployee && currentPermissions && !currentPermissions.canDeleteInvoice) {
        throw new Error('PERMISSION_DENIED_DELETE_INVOICE');
      }
    } catch (e: any) {
      if (e?.message === 'PERMISSION_DENIED_DELETE_INVOICE') throw e;
    }

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
