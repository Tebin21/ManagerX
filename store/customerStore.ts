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
} from '@/lib/sqlite';
import type { CustomerWithStats, UpdateSaleInput } from '@/types/customers';
import type { Sale } from '@/types/sales';
import type { Debt } from '@/types/sales';

interface CustomerState {
  customers: CustomerWithStats[];
  isLoading: boolean;

  loadCustomers: () => Promise<void>;
  reloadAfterSale: () => Promise<void>;
  searchCustomers: (query: string) => CustomerWithStats[];
  getCustomerById: (id: number) => CustomerWithStats | undefined;

  editCustomer: (id: number, data: Partial<{ name: string; phone: string; address: string; notes: string }>) => Promise<void>;
  deleteCustomer: (id: number) => Promise<void>;
  addDebtPayment: (debtId: number, amount: number) => Promise<void>;
  editSaleInfo: (saleId: number, data: UpdateSaleInput) => Promise<void>;
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

  editCustomer: async (id, data) => {
    await updateCustomer(id, data);
    const customers = await getAllCustomersWithStats();
    set({ customers });
  },

  deleteCustomer: async (id: number) => {
    await deleteCustomerFromDB(id);
    const customers = await getAllCustomersWithStats();
    set({ customers });
  },

  addDebtPayment: async (debtId: number, amount: number) => {
    await addPaymentToDebt(debtId, amount);
    const customers = await getAllCustomersWithStats();
    set({ customers });
  },

  editSaleInfo: async (saleId: number, data: UpdateSaleInput) => {
    await updateSaleInfo(saleId, data);
    const customers = await getAllCustomersWithStats();
    set({ customers });
  },
}));

// Convenience helpers for screens to fetch per-customer data
export async function fetchCustomerSales(customerId: number): Promise<Sale[]> {
  return getSalesByCustomerId(customerId);
}

export async function fetchCustomerDebts(customerId: number): Promise<Debt[]> {
  return getDebtsByCustomerId(customerId);
}
