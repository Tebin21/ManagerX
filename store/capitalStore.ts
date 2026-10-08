import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { migratedAsyncStorage } from '@/lib/migratedStorage';
import { getCashDrawerStats, type CashDrawerStats } from '@/lib/sqlite';

export interface CapitalTransaction {
  id: string;
  type: 'initial' | 'deposit' | 'withdrawal';
  amount: number;
  date: string;
  note?: string;
}

export interface DrawerFullStats {
  initialCapital: number;
  netCapital: number;
  salesCash: number;
  customerDebtCash: number;
  purchasesCash: number;
  supplierDebtCash: number;
  expensesCash: number;
  currentBalance: number;
}

interface CapitalState {
  isEnabled: boolean;
  initialCapital: number;
  activatedAt: string | null;
  deposits: CapitalTransaction[];

  activate: (amount: number, note?: string) => void;
  addDeposit: (amount: number, note?: string) => void;
  withdraw: (amount: number, note?: string) => void;
  deactivate: () => void;

  getDrawerBalance: () => Promise<number>;
  loadDrawerStats: () => Promise<DrawerFullStats>;
}

export const useCapitalStore = create<CapitalState>()(
  persist(
    (set, get) => ({
      isEnabled: false,
      initialCapital: 0,
      activatedAt: null,
      deposits: [],

      activate: (amount: number, note?: string) => {
        const now = new Date().toISOString();
        const initialTx: CapitalTransaction = {
          id: `cap_init_${Date.now()}`,
          type: 'initial',
          amount,
          date: now,
          note: note?.trim() || undefined,
        };
        set({
          isEnabled: true,
          initialCapital: amount,
          activatedAt: now,
          deposits: [initialTx],
        });
      },

      addDeposit: (amount: number, note?: string) => {
        const now = new Date().toISOString();
        const tx: CapitalTransaction = {
          id: `cap_dep_${Date.now()}`,
          type: 'deposit',
          amount,
          date: now,
          note: note?.trim() || undefined,
        };
        set((state) => ({
          deposits: [tx, ...state.deposits],
        }));
      },

      withdraw: (amount: number, note?: string) => {
        const now = new Date().toISOString();
        const tx: CapitalTransaction = {
          id: `cap_wd_${Date.now()}`,
          type: 'withdrawal',
          amount,
          date: now,
          note: note?.trim() || undefined,
        };
        set((state) => ({
          deposits: [tx, ...state.deposits],
        }));
      },

      deactivate: () => {
        set({
          isEnabled: false,
          initialCapital: 0,
          activatedAt: null,
          deposits: [],
        });
      },

      getDrawerBalance: async () => {
        const state = get();
        if (!state.isEnabled) return Infinity;

        const netCapital = state.deposits.reduce((sum, tx) => {
          if (tx.type === 'initial' || tx.type === 'deposit') {
            return sum + tx.amount;
          }
          return sum - tx.amount;
        }, 0);

        try {
          const stats = await getCashDrawerStats(state.activatedAt || undefined);
          return (
            netCapital +
            stats.salesCash +
            stats.customerDebtCash -
            stats.purchasesCash -
            stats.supplierDebtCash -
            stats.expensesCash
          );
        } catch (err) {
          console.error('[capitalStore] Error calculating drawer balance:', err);
          return netCapital;
        }
      },

      loadDrawerStats: async (): Promise<DrawerFullStats> => {
        const state = get();
        const netCapital = state.deposits.reduce((sum, tx) => {
          if (tx.type === 'initial' || tx.type === 'deposit') {
            return sum + tx.amount;
          }
          return sum - tx.amount;
        }, 0);

        if (!state.isEnabled) {
          return {
            initialCapital: 0,
            netCapital: 0,
            salesCash: 0,
            customerDebtCash: 0,
            purchasesCash: 0,
            supplierDebtCash: 0,
            expensesCash: 0,
            currentBalance: 0,
          };
        }

        try {
          const stats = await getCashDrawerStats(state.activatedAt || undefined);
          const currentBalance =
            netCapital +
            stats.salesCash +
            stats.customerDebtCash -
            stats.purchasesCash -
            stats.supplierDebtCash -
            stats.expensesCash;
          return {
            initialCapital: state.initialCapital,
            netCapital,
            salesCash: stats.salesCash,
            customerDebtCash: stats.customerDebtCash,
            purchasesCash: stats.purchasesCash,
            supplierDebtCash: stats.supplierDebtCash,
            expensesCash: stats.expensesCash,
            currentBalance,
          };
        } catch (err) {
          console.error('[capitalStore] Error loading drawer stats:', err);
          return {
            initialCapital: state.initialCapital,
            netCapital,
            salesCash: 0,
            customerDebtCash: 0,
            purchasesCash: 0,
            supplierDebtCash: 0,
            expensesCash: 0,
            currentBalance: netCapital,
          };
        }
      },
    }),
    {
      name: 'froshiar_capital_store',
      storage: createJSONStorage(() => migratedAsyncStorage),
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        initialCapital: state.initialCapital,
        activatedAt: state.activatedAt,
        deposits: state.deposits,
      }),
    }
  )
);
