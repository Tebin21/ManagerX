import { create } from 'zustand';
import {
  getAllInventoryProducts,
  getInventoryProductById,
  getInventoryStats,
  getProductCategories,
  updateProduct,
  deleteProduct,
  getAllManagedCategories,
  addManagedCategory,
  deleteManagedCategory,
  renameManagedCategory,
  getAllInventoryHistory,
  permanentDeleteFromHistory,
  restoreProductFromHistory,
} from '@/lib/sqlite';
import { useSettingsStore } from '@/store/settingsStore';
import { computeProductLowStock } from '@/lib/lowStock';
import type { Product } from '@/types/sales';
import type {
  InventoryProduct,
  InventoryStats,
  InventoryFilter,
  InventorySortOrder,
  NewProductData,
  InventoryHistoryItem,
} from '@/types/inventory';

function computeLowStockCount(
  products: InventoryProduct[],
  globalEnabled: boolean,
  globalThreshold: number
): number {
  return products.filter((p) => computeProductLowStock(p, globalEnabled, globalThreshold)).length;
}

interface InventoryState {
  products: InventoryProduct[];
  stats: InventoryStats | null;
  categories: string[];
  managedCategories: Array<{ name: string; productCount: number; isDefault: boolean }>;
  isLoading: boolean;
  filter: InventoryFilter;
  sortOrder: InventorySortOrder;
  selectedCategory: string;
  inventoryHistory: InventoryHistoryItem[];

  loadInventory: () => Promise<void>;
  reloadAfterSale: () => Promise<void>;
  reloadAfterPurchase: () => Promise<void>;
  setFilter: (f: InventoryFilter) => void;
  setSortOrder: (s: InventorySortOrder) => void;
  setCategory: (c: string) => void;
  editProduct: (id: number, data: Partial<NewProductData>) => Promise<void>;
  removeProduct: (id: number) => Promise<void>;
  /** Re-fetches just one product row + the aggregate stats and splices it into
   *  the in-memory list, instead of re-fetching the entire products table. */
  refreshProduct: (id: number) => Promise<void>;
  getProductById: (id: number) => InventoryProduct | undefined;
  getFilteredProducts: (query: string) => InventoryProduct[];
  loadManagedCategories: () => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
  renameCategory: (oldName: string, newName: string) => Promise<void>;
  loadInventoryHistory: () => Promise<void>;
  permanentDeleteHistoryItem: (historyId: number) => Promise<void>;
  restoreFromHistory: (historyId: number) => Promise<void>;

  // Legacy — used by Sales module
  searchProducts: (query: string, category?: string) => Product[];
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  stats: null,
  categories: [],
  managedCategories: [],
  isLoading: false,
  filter: 'all',
  sortOrder: 'newest',
  selectedCategory: 'all',
  inventoryHistory: [],

  loadInventory: async () => {
    set({ isLoading: true });
    try {
      const [products, rawStats, categories, inventoryHistory] = await Promise.all([
        getAllInventoryProducts(),
        getInventoryStats(),
        getProductCategories(),
        getAllInventoryHistory(),
      ]);
      const { globalLowStockEnabled, globalLowStockThreshold } = useSettingsStore.getState();
      const stats = { ...rawStats, lowStockCount: computeLowStockCount(products, globalLowStockEnabled, globalLowStockThreshold) };
      set({ products, stats, categories, inventoryHistory, isLoading: false });
    } catch (err) {
      console.error('Failed to load inventory:', err);
      set({ isLoading: false });
    }
  },

  reloadAfterSale: async () => {
    try {
      const [products, rawStats, categories, inventoryHistory] = await Promise.all([
        getAllInventoryProducts(),
        getInventoryStats(),
        getProductCategories(),
        getAllInventoryHistory(),
      ]);
      const { globalLowStockEnabled, globalLowStockThreshold } = useSettingsStore.getState();
      const stats = { ...rawStats, lowStockCount: computeLowStockCount(products, globalLowStockEnabled, globalLowStockThreshold) };
      set({ products, stats, categories, inventoryHistory });
    } catch (err) {
      console.error('Failed to reload inventory after sale:', err);
    }
  },

  reloadAfterPurchase: async () => {
    try {
      const [products, rawStats, categories] = await Promise.all([
        getAllInventoryProducts(),
        getInventoryStats(),
        getProductCategories(),
      ]);
      const { globalLowStockEnabled, globalLowStockThreshold } = useSettingsStore.getState();
      const stats = { ...rawStats, lowStockCount: computeLowStockCount(products, globalLowStockEnabled, globalLowStockThreshold) };
      set({ products, stats, categories });
    } catch (err) {
      console.error('Failed to reload inventory after purchase:', err);
    }
  },

  setFilter: (filter) => set({ filter }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setCategory: (selectedCategory) => set({ selectedCategory }),

  // categories (the managed-categories list) deliberately isn't re-fetched by
  // any of the handlers below — it comes from the separate `categories` table
  // and only changes via addCategory/deleteCategory/renameCategory, which
  // already refresh it themselves. Re-querying it on every product edit was
  // pure redundant I/O for data that never changed.

  refreshProduct: async (id) => {
    try {
      const [updated, rawStats] = await Promise.all([
        getInventoryProductById(id),
        getInventoryStats(),
      ]);
      const { globalLowStockEnabled, globalLowStockThreshold } = useSettingsStore.getState();
      set((state) => {
        const products = updated
          ? state.products.map((p) => (p.id === id ? updated : p))
          : state.products.filter((p) => p.id !== id);
        return {
          products,
          stats: { ...rawStats, lowStockCount: computeLowStockCount(products, globalLowStockEnabled, globalLowStockThreshold) },
        };
      });
    } catch (err) {
      console.error('Failed to refresh product, falling back to full reload:', err);
      await get().loadInventory();
    }
  },

  editProduct: async (id, data) => {
    await updateProduct(id, data);
    await get().refreshProduct(id);
    try {
      const { useReportStore } = await import('@/store/reportStore');
      await useReportStore.getState().reloadAfterMutation();
    } catch (e) {
      if (__DEV__) console.warn('[inventoryStore] report sync failed after editProduct:', e);
    }
    try {
      const { usePurchaseStore } = await import('@/store/purchaseStore');
      await usePurchaseStore.getState().loadPurchases();
    } catch (e) {
      if (__DEV__) console.warn('[inventoryStore] purchase sync failed after editProduct:', e);
    }
  },

  removeProduct: async (id) => {
    await deleteProduct(id);
    const [rawStats, inventoryHistory] = await Promise.all([
      getInventoryStats(),
      getAllInventoryHistory(),
    ]);
    const { globalLowStockEnabled, globalLowStockThreshold } = useSettingsStore.getState();
    set((state) => {
      const products = state.products.filter((p) => p.id !== id);
      return {
        products,
        stats: { ...rawStats, lowStockCount: computeLowStockCount(products, globalLowStockEnabled, globalLowStockThreshold) },
        inventoryHistory,
      };
    });
    try {
      const { useReportStore } = await import('@/store/reportStore');
      await useReportStore.getState().reloadAfterMutation();
    } catch (e) {
      if (__DEV__) console.warn('[inventoryStore] report sync failed after removeProduct:', e);
    }
  },

  getProductById: (id) => get().products.find((p) => p.id === id),

  getFilteredProducts: (query: string) => {
    const { products, filter, sortOrder, selectedCategory } = get();
    const q = query.toLowerCase().trim();

    let result = products.filter((p) => {
      if (p.quantity <= 0) return false;
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

      if (filter === 'lowStock') {
        const { globalLowStockEnabled, globalLowStockThreshold } = useSettingsStore.getState();
        return p.isActive && computeProductLowStock(p, globalLowStockEnabled, globalLowStockThreshold);
      }
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

  loadManagedCategories: async () => {
    try {
      const managedCategories = await getAllManagedCategories();
      set({ managedCategories });
    } catch (err) {
      console.error('Failed to load managed categories:', err);
    }
  },

  addCategory: async (name: string) => {
    await addManagedCategory(name);
    const [categories, managedCategories] = await Promise.all([
      getProductCategories(),
      getAllManagedCategories(),
    ]);
    set({ categories, managedCategories });
  },

  deleteCategory: async (name: string) => {
    await deleteManagedCategory(name);
    const [categories, managedCategories] = await Promise.all([
      getProductCategories(),
      getAllManagedCategories(),
    ]);
    const { selectedCategory } = get();
    set({
      categories,
      managedCategories,
      ...(selectedCategory === name ? { selectedCategory: 'all' } : {}),
    });
  },

  renameCategory: async (oldName: string, newName: string) => {
    await renameManagedCategory(oldName, newName);
    // Rename touches every product row that used the old name, not just the
    // categories list — a full reload keeps `products` consistent too.
    await get().loadInventory();
    const { selectedCategory } = get();
    if (selectedCategory === oldName) set({ selectedCategory: newName.trim() });
  },

  loadInventoryHistory: async () => {
    try {
      const inventoryHistory = await getAllInventoryHistory();
      set({ inventoryHistory });
    } catch (err) {
      console.error('Failed to load inventory history:', err);
    }
  },

  permanentDeleteHistoryItem: async (historyId) => {
    await permanentDeleteFromHistory(historyId);
    const inventoryHistory = await getAllInventoryHistory();
    set({ inventoryHistory });
  },

  restoreFromHistory: async (historyId) => {
    const newProductId = await restoreProductFromHistory(historyId);
    const [restored, rawStats, inventoryHistory] = await Promise.all([
      newProductId ? getInventoryProductById(newProductId) : Promise.resolve(null),
      getInventoryStats(),
      getAllInventoryHistory(),
    ]);
    const { globalLowStockEnabled, globalLowStockThreshold } = useSettingsStore.getState();
    set((state) => {
      const products = restored ? [restored, ...state.products] : state.products;
      return {
        products,
        stats: { ...rawStats, lowStockCount: computeLowStockCount(products, globalLowStockEnabled, globalLowStockThreshold) },
        inventoryHistory,
      };
    });
    try {
      const { useReportStore } = await import('@/store/reportStore');
      await useReportStore.getState().reloadAfterMutation();
    } catch (e) {
      if (__DEV__) console.warn('[inventoryStore] report sync failed after restoreFromHistory:', e);
    }
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
