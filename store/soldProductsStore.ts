import { create } from 'zustand';
import { getSoldProducts } from '@/lib/sqlite';
import type { SoldProductRecord, SoldSortBy, SoldPaymentFilter } from '@/types/soldProducts';

interface SoldProductsState {
  records: SoldProductRecord[];
  isLoading: boolean;
  search: string;
  sortBy: SoldSortBy;
  sortDir: 'asc' | 'desc';
  paymentFilter: SoldPaymentFilter;

  load: () => Promise<void>;
  setSearch: (q: string) => void;
  setSortBy: (by: SoldSortBy) => void;
  toggleSortDir: () => void;
  setPaymentFilter: (f: SoldPaymentFilter) => void;
  getFiltered: () => SoldProductRecord[];
}

export const useSoldProductsStore = create<SoldProductsState>((set, get) => ({
  records: [],
  isLoading: false,
  search: '',
  sortBy: 'date',
  sortDir: 'desc',
  paymentFilter: 'all',

  load: async () => {
    set({ isLoading: true });
    try {
      const records = await getSoldProducts();
      set({ records, isLoading: false });
    } catch (err) {
      console.error('Failed to load sold products:', err);
      set({ isLoading: false });
    }
  },

  setSearch: (search) => set({ search }),
  setSortBy: (sortBy) => set({ sortBy }),
  toggleSortDir: () => set((s) => ({ sortDir: s.sortDir === 'desc' ? 'asc' : 'desc' })),
  setPaymentFilter: (paymentFilter) => set({ paymentFilter }),

  getFiltered: () => {
    const { records, search, sortBy, sortDir, paymentFilter } = get();
    const q = search.toLowerCase().trim();

    let result = records.filter((r) => {
      if (paymentFilter !== 'all' && r.paymentMethod !== paymentFilter) return false;
      if (q) {
        return (
          r.productName.toLowerCase().includes(q) ||
          (r.customerName?.toLowerCase().includes(q) ?? false) ||
          r.invoiceNumber.toLowerCase().includes(q) ||
          (r.itemId?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date')     cmp = new Date(a.soldDate).getTime() - new Date(b.soldDate).getTime();
      if (sortBy === 'customer') cmp = (a.customerName ?? '').localeCompare(b.customerName ?? '');
      if (sortBy === 'product')  cmp = a.productName.localeCompare(b.productName);
      if (sortBy === 'profit')   cmp = a.profit - b.profit;
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  },
}));
