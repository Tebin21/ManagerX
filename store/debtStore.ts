import { create } from 'zustand';
import {
  getAllSalesDebtsDetailed,
  getAllPurchaseDebts,
  addPaymentToDebt,
  addPaymentToPurchaseDebt,
  getDebtOverviewSummary,
} from '@/lib/sqlite';
import type { SalesDebtDetail, PurchaseDebt, DebtOverviewSummary } from '@/types/debt';

interface DebtState {
  salesDebts: SalesDebtDetail[];
  purchaseDebts: PurchaseDebt[];
  summary: DebtOverviewSummary | null;
  isLoading: boolean;
  loadAll: () => Promise<void>;
  reloadAfterSale: () => Promise<void>;
  paySalesDebt: (id: number, amount: number) => Promise<void>;
  payPurchaseDebt: (id: number, amount: number) => Promise<void>;
  searchSalesDebts: (q: string) => SalesDebtDetail[];
  searchPurchaseDebts: (q: string) => PurchaseDebt[];
}

export const useDebtStore = create<DebtState>((set, get) => ({
  salesDebts: [],
  purchaseDebts: [],
  summary: null,
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true });
    try {
      const [salesDebts, purchaseDebts, summary] = await Promise.all([
        getAllSalesDebtsDetailed(),
        getAllPurchaseDebts(),
        getDebtOverviewSummary(),
      ]);
      set({ salesDebts, purchaseDebts, summary, isLoading: false });
    } catch (err) {
      console.error('Failed to load debts:', err);
      set({ isLoading: false });
    }
  },

  reloadAfterSale: async () => {
    try {
      const [salesDebts, purchaseDebts, summary] = await Promise.all([
        getAllSalesDebtsDetailed(),
        getAllPurchaseDebts(),
        getDebtOverviewSummary(),
      ]);
      set({ salesDebts, purchaseDebts, summary });
    } catch (err) {
      console.error('Failed to silently reload debts:', err);
    }
  },

  paySalesDebt: async (id: number, amount: number) => {
    await addPaymentToDebt(id, amount);
    await get().reloadAfterSale();
    try {
      const { useReportStore } = await import('@/store/reportStore');
      useReportStore.getState().reload();
    } catch {}
  },

  payPurchaseDebt: async (id: number, amount: number) => {
    await addPaymentToPurchaseDebt(id, amount);
    await get().reloadAfterSale();
    try {
      const { useReportStore } = await import('@/store/reportStore');
      useReportStore.getState().reload();
    } catch {}
  },

  searchSalesDebts: (q: string) => {
    const lower = q.toLowerCase().trim();
    if (!lower) return get().salesDebts;
    return get().salesDebts.filter(
      (d) =>
        d.customerName.toLowerCase().includes(lower) ||
        (d.customerPhone?.toLowerCase().includes(lower) ?? false) ||
        d.invoiceNumber.toLowerCase().includes(lower)
    );
  },

  searchPurchaseDebts: (q: string) => {
    const lower = q.toLowerCase().trim();
    if (!lower) return get().purchaseDebts;
    return get().purchaseDebts.filter(
      (d) =>
        d.supplierName.toLowerCase().includes(lower) ||
        (d.supplierPhone?.toLowerCase().includes(lower) ?? false) ||
        (d.purchaseNumber?.toLowerCase().includes(lower) ?? false)
    );
  },
}));
