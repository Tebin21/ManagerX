import { create } from 'zustand';
import {
  getAllSuppliersWithStats,
  updateSupplier,
  deleteSupplier as dbDeleteSupplier,
} from '@/lib/sqlite';
import type { SupplierWithStats } from '@/types/suppliers';

interface SupplierState {
  suppliers: SupplierWithStats[];
  isLoading: boolean;
  loadSuppliers: () => Promise<void>;
  searchSuppliers: (query: string) => SupplierWithStats[];
  getSupplierById: (id: number) => SupplierWithStats | undefined;
  editSupplier: (id: number, data: { name?: string; phone?: string | null; address?: string | null; notes?: string | null }) => Promise<void>;
  deleteSupplier: (id: number) => Promise<void>;
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
  suppliers: [],
  isLoading: false,

  loadSuppliers: async () => {
    set({ isLoading: true });
    try {
      const suppliers = await getAllSuppliersWithStats();
      set({ suppliers, isLoading: false });
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      set({ isLoading: false });
    }
  },

  searchSuppliers: (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return get().suppliers;
    return get().suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone?.toLowerCase().includes(q) ?? false)
    );
  },

  getSupplierById: (id: number) => get().suppliers.find((s) => s.id === id),

  editSupplier: async (id, data) => {
    await updateSupplier(id, data);
    await get().loadSuppliers();
  },

  deleteSupplier: async (id: number) => {
    await dbDeleteSupplier(id);
    set((state) => ({ suppliers: state.suppliers.filter((s) => s.id !== id) }));
  },
}));
