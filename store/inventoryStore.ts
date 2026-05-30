import { create } from 'zustand';
import {
  getAllInventoryProducts,
  getInventoryStats,
  getProductCategories,
  updateProduct,
  deleteProduct,
} from '@/lib/sqlite';
import type { Product } from '@/types/sales';
import type {
  InventoryProduct,
  InventoryStats,
  InventoryFilter,
  InventorySortOrder,
  NewProductData,
} from '@/types/inventory';

const LOW_STOCK_THRESHOLD = 3;

interface InventoryState {
  products: InventoryProduct[];
  stats: InventoryStats | null;
  categories: string[];
  isLoading: boolean;
  filter: InventoryFilter;
  sortOrder: InventorySortOrder;
  selectedCategory: string;

  loadInventory: () => Promise<void>;
  reloadAfterSale: () => Promise<void>;
  reloadAfterPurchase: () => Promise<void>;
  setFilter: (f: InventoryFilter) => void;
  setSortOrder: (s: InventorySortOrder) => void;
  setCategory: (c: string) => void;
  editProduct: (id: number, data: Partial<NewProductData>) => Promise<void>;
  removeProduct: (id: number) => Promise<void>;
  getProductById: (id: number) => InventoryProduct | undefined;
  getFilteredProducts: (query: string) => InventoryProduct[];

  // Legacy — used by Sales module
  searchProducts: (query: string, category?: string) => Product[];
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  stats: null,
  categories: [],
  isLoading: false,
  filter: 'all',
  sortOrder: 'newest',
  selectedCategory: 'all',

  loadInventory: async () => {
    set({ isLoading: true });
    try {
      const [products, stats, categories] = await Promise.all([
        getAllInventoryProducts(),
        getInventoryStats(),
        getProductCategories(),
      ]);
      set({ products, stats, categories, isLoading: false });
    } catch (err) {
      console.error('Failed to load inventory:', err);
      set({ isLoading: false });
    }
  },

  reloadAfterSale: async () => {
    try {
      const [products, stats, categories] = await Promise.all([
        getAllInventoryProducts(),
        getInventoryStats(),
        getProductCategories(),
      ]);
      set({ products, stats, categories });
    } catch (err) {
      console.error('Failed to reload inventory after sale:', err);
    }
  },

  reloadAfterPurchase: async () => {
    try {
      const [products, stats, categories] = await Promise.all([
        getAllInventoryProducts(),
        getInventoryStats(),
        getProductCategories(),
      ]);
      set({ products, stats, categories });
    } catch (err) {
      console.error('Failed to reload inventory after purchase:', err);
    }
  },

  setFilter: (filter) => set({ filter }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setCategory: (selectedCategory) => set({ selectedCategory }),

  editProduct: async (id, data) => {
    await updateProduct(id, data);
    const [products, stats] = await Promise.all([
      getAllInventoryProducts(),
      getInventoryStats(),
    ]);
    set({ products, stats });
  },

  removeProduct: async (id) => {
    await deleteProduct(id);
    const [products, stats, categories] = await Promise.all([
      getAllInventoryProducts(),
      getInventoryStats(),
      getProductCategories(),
    ]);
    set({ products, stats, categories });
  },

  getProductById: (id) => get().products.find((p) => p.id === id),

  getFilteredProducts: (query: string) => {
    const { products, filter, sortOrder, selectedCategory } = get();
    const q = query.toLowerCase().trim();

    let result = products.filter((p) => {
      if (q) {
        const matchesQuery =
          p.name.toLowerCase().includes(q) ||
          (p.itemId?.toLowerCase().includes(q) ?? false) ||
          (p.supplierName?.toLowerCase().includes(q) ?? false) ||
          (p.purchaseDate?.includes(q) ?? false) ||
          p.category.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;

      if (filter === 'lowStock') return p.isActive && p.quantity <= LOW_STOCK_THRESHOLD;
      if (filter === 'paid')     return p.paymentStatus === 'paid';
      if (filter === 'debt')     return p.paymentStatus === 'debt';

      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortOrder === 'newest')   return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOrder === 'oldest')   return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortOrder === 'name_asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'qty_asc')  return a.quantity - b.quantity;
      return 0;
    });

    return result;
  },

  // Legacy method for Sales module compatibility
  searchProducts: (query: string, category?: string) => {
    const { products } = get();
    const q = query.toLowerCase().trim();

    return products.filter((p) => {
      if (!p.isActive || p.quantity <= 0) return false;

      const matchesQuery =
        q === '' ||
        p.name.toLowerCase().includes(q) ||
        (p.itemId?.toLowerCase().includes(q) ?? false);

      const matchesCategory =
        !category || category === 'all' || p.category === category;

      return matchesQuery && matchesCategory;
    });
  },
}));
