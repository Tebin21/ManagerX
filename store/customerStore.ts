import { create } from 'zustand';
import {
  getAllCustomersWithStats,
  getCustomerByIdWithStats,
  updateCustomer,
  deleteCustomer as deleteCustomerFromDB,
  getSalesByCustomerId,
  getDebtsByCustomerId,
  addPaymentToDebt,
  updateSaleInfo,
  getSaleById,
  getCustomerFinancialTimeline,
} from '@/lib/sqlite';
import type { CustomerWithStats, UpdateSaleInput } from '@/types/customers';
import type { Sale } from '@/types/sales';
import type { Debt } from '@/types/sales';
import type { FinancialLedgerEvent } from '@/types/debt';

interface CustomerState {
  customers: CustomerWithStats[];
  isLoading: boolean;

  loadCustomers: () => Promise<void>;
  reloadAfterSale: () => Promise<void>;
  searchCustomers: (query: string) => CustomerWithStats[];
  getCustomerById: (id: number) => CustomerWithStats | undefined;

  editCustomer: (id: number, data: Partial<{ name: string; phone: string | null; address: string | null; notes: string | null }>) => Promise<void>;
  deleteCustomer: (id: number) => Promise<void>;
  addDebtPayment: (debtId: number, amount: number, customerId: number, paymentMethod?: string) => Promise<void>;
  editSaleInfo: (saleId: number, data: UpdateSaleInput) => Promise<void>;
  /** Replaces one customer's row in place; falls back to a full reload if the
   *  row is missing (e.g. it was deleted from another device mid-session). */
  refreshCustomer: (id: number) => Promise<void>;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  isLoading: false,

  loadCustomers: async () => {
    set({ isLoading: true });
    try {
      const customers = await getAllCustomersWithStats();
      set({ customers, isLoading: false });
    } catch (err) {
      console.error('Failed to load customers:', err);
      set({ isLoading: false });
    }
  },

  reloadAfterSale: async () => {
    try {
      const customers = await getAllCustomersWithStats();
      set({ customers });
    } catch (err) {
      console.error('Failed to reload customers:', err);
    }
  },

  searchCustomers: (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return get().customers;
    return get().customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone?.toLowerCase().includes(q) ?? false)
    );
  },

  getCustomerById: (id: number) => get().customers.find((c) => c.id === id),

  refreshCustomer: async (id: number) => {
    try {
      const updated = await getCustomerByIdWithStats(id);
      set({
        customers: updated
          ? get().customers.map((c) => (c.id === id ? updated : c))
          : get().customers.filter((c) => c.id !== id),
      });
    } catch (err) {
      console.error('Failed to refresh customer, falling back to full reload:', err);
      await get().loadCustomers();
    }
  },

  editCustomer: async (id, data) => {
    await updateCustomer(id, data);
    await get().loadCustomers();
    try {
      const { useSalesStore } = await import('./salesStore');
      await useSalesStore.getState().loadSales();
    } catch (e) {
      console.warn('Could not reload salesStore:', e);
    }
    try {
      const { useDebtStore } = await import('./debtStore');
      await useDebtStore.getState().loadAll();
    } catch (e) {
      console.warn('Could not reload debtStore:', e);
    }
    try {
      const { useReportStore } = await import('./reportStore');
      await useReportStore.getState().reload();
    } catch (e) {
      console.warn('Could not reload reportStore:', e);
    }
  },

  deleteCustomer: async (id: number) => {
    await deleteCustomerFromDB(id);
    set({ customers: get().customers.filter((c) => c.id !== id) });
  },

  addDebtPayment: async (debtId: number, amount: number, customerId: number, paymentMethod?: string) => {
    await addPaymentToDebt(debtId, amount, undefined, paymentMethod);
    await get().refreshCustomer(customerId);
  },

  editSaleInfo: async (saleId: number, data: UpdateSaleInput) => {
    await updateSaleInfo(saleId, data);
    const sale = await getSaleById(saleId);
    if (sale?.customerId) {
      await get().refreshCustomer(sale.customerId);
    } else {
      await get().loadCustomers();
    }
  },
}));

// Convenience helpers for screens to fetch per-customer data
export async function fetchCustomerSales(customerId: number): Promise<Sale[]> {
  return getSalesByCustomerId(customerId);
}

export async function fetchCustomerDebts(customerId: number): Promise<Debt[]> {
  return getDebtsByCustomerId(customerId);
}

export async function fetchCustomerFinancialTimeline(customerId: number): Promise<FinancialLedgerEvent[]> {
  return getCustomerFinancialTimeline(customerId);
}
