import { create } from 'zustand';
import {
  getAllSalesDebtsDetailed,
  getAllPurchaseDebts,
  addPaymentToDebt,
  addPaymentToPurchaseDebt,
  getDebtOverviewSummary,
  getSalesDebtById,
  getPurchaseDebtById,
} from '@/lib/sqlite';
import type { SalesDebtDetail, PurchaseDebt, DebtOverviewSummary } from '@/types/debt';

interface DebtState {
  salesDebts: SalesDebtDetail[];
  purchaseDebts: PurchaseDebt[];
  summary: DebtOverviewSummary | null;
  isLoading: boolean;
  loadAll: () => Promise<void>;
  reloadAfterSale: () => Promise<void>;
  /** Splices one sales/purchase debt row in place (or drops it once fully
   *  settled, since getAllSalesDebtsDetailed/getAllPurchaseDebts only ever
   *  return remaining_amount > 0 rows) instead of re-running all three full
   *  debt queries for a single payment. */
  refreshSalesDebt: (id: number) => Promise<void>;
  refreshPurchaseDebt: (id: number) => Promise<void>;
  paySalesDebt: (id: number, amount: number, paymentDate?: string) => Promise<void>;
  payPurchaseDebt: (id: number, amount: number, paymentDate?: string) => Promise<void>;
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

  refreshSalesDebt: async (id: number) => {
    try {
      const [updated, summary] = await Promise.all([
        getSalesDebtById(id),
        getDebtOverviewSummary(),
      ]);
      set((state) => ({
        salesDebts: updated && updated.remainingAmount > 0
          ? state.salesDebts.map((d) => (d.id === id ? updated : d))
          : state.salesDebts.filter((d) => d.id !== id),
        summary,
      }));
    } catch (err) {
      console.error('Failed to refresh sales debt, falling back to full reload:', err);
      await get().reloadAfterSale();
    }
  },

  refreshPurchaseDebt: async (id: number) => {
    try {
      const [updated, summary] = await Promise.all([
        getPurchaseDebtById(id),
        getDebtOverviewSummary(),
      ]);
      set((state) => ({
        purchaseDebts: updated && updated.remainingAmount > 0
          ? state.purchaseDebts.map((d) => (d.id === id ? updated : d))
          : state.purchaseDebts.filter((d) => d.id !== id),
        summary,
      }));
    } catch (err) {
      console.error('Failed to refresh purchase debt, falling back to full reload:', err);
      await get().reloadAfterSale();
    }
  },

  paySalesDebt: async (id: number, amount: number, paymentDate?: string) => {
    await addPaymentToDebt(id, amount, paymentDate);
    await get().refreshSalesDebt(id);
    try {
      const { useReportStore } = await import('@/store/reportStore');
      await useReportStore.getState().reloadAfterMutation();
    } catch {}
  },

  payPurchaseDebt: async (id: number, amount: number, paymentDate?: string) => {
    await addPaymentToPurchaseDebt(id, amount, paymentDate);
    await get().refreshPurchaseDebt(id);
    try {
      const { useReportStore } = await import('@/store/reportStore');
      await useReportStore.getState().reloadAfterMutation();
    } catch {}
    // addPaymentToPurchaseDebt only flips purchases.payment_status / the
    // matching products' payment_status to 'paid' when the debt is fully
    // settled (see lib/sqlite.ts) — only those two screens' data actually
    // changes in that case, so only cascade-reload them then, not on every
    // partial payment.
    const stillOwes = get().purchaseDebts.some((d) => d.id === id);
    if (!stillOwes) {
      try {
        const { useInventoryStore } = await import('@/store/inventoryStore');
        await useInventoryStore.getState().loadInventory();
      } catch {}
      try {
        const { usePurchaseStore } = await import('@/store/purchaseStore');
        await usePurchaseStore.getState().loadPurchases();
      } catch {}
    }
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
