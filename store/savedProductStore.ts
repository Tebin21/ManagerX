import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { migratedAsyncStorage } from '@/lib/migratedStorage';
import type { InventoryProduct } from '@/types/inventory';

export interface SavedProductPreset {
  id: string;
  name: string;
  description: string | null;
  imageUri: string | null;
  itemId: string | null;
  category: string | null;
  buyPriceIQD?: number;
  buyPriceUSD?: number;
  sellPriceIQD?: number;
  sellPriceUSD?: number;
  supplierName?: string | null;
  supplierPhone?: string | null;
  supplierAddress?: string | null;
  selectedSupplierId?: number | null;
  supplierImageUri?: string | null;
  warranty?: string | null;
  notes?: string | null;
  websiteDescription?: string | null;
  updatedAt: string;
}

export interface SavedProductState {
  savedPresets: SavedProductPreset[];
  savePreset: (preset: {
    name?: string | null;
    description?: string | null;
    imageUri?: string | null;
    itemId?: string | null;
    category?: string | null;
    buyPriceIQD?: number;
    buyPriceUSD?: number;
    sellPriceIQD?: number;
    sellPriceUSD?: number;
    supplierName?: string | null;
    supplierPhone?: string | null;
    supplierAddress?: string | null;
    selectedSupplierId?: number | null;
    supplierImageUri?: string | null;
    warranty?: string | null;
    notes?: string | null;
    websiteDescription?: string | null;
  }) => void;
  deletePreset: (id: string) => void;
  syncFromInventory: (products: InventoryProduct[]) => void;
  findByName: (name: string) => SavedProductPreset | undefined;
  findByCode: (code: string) => SavedProductPreset | undefined;
  searchPresets: (query: string) => SavedProductPreset[];
}

export const useSavedProductStore = create<SavedProductState>()(
  persist(
    (set, get) => ({
      savedPresets: [],

      savePreset: (preset) => {
        const rawName = preset.name?.trim() || '';
        const rawItemId = preset.itemId?.trim() || null;
        if (!rawName && !rawItemId) return;

        const existing = (get().savedPresets || []).filter(Boolean);
        const now = new Date().toISOString();

        const finalName = rawName || `بەرهەمی بێ ناو (${rawItemId})`;
        const normalizedName = finalName.toLowerCase();

        // Check if an entry with this name OR item_id already exists
        const existingIdx = existing.findIndex((p) => {
          if (!p) return false;
          if (rawName && p.name?.trim().toLowerCase() === normalizedName) return true;
          if (rawItemId && p.itemId && p.itemId.trim().toLowerCase() === rawItemId.toLowerCase()) return true;
          return false;
        });

        if (existingIdx !== -1) {
          const updated = [...existing];
          const curr = updated[existingIdx];
          if (!curr) return;
          updated[existingIdx] = {
            ...curr,
            name: rawName || curr.name,
            description: preset.description !== undefined ? (preset.description?.trim() || null) : curr.description,
            imageUri: preset.imageUri !== undefined ? (preset.imageUri?.trim() || null) : curr.imageUri,
            itemId: rawItemId || curr.itemId,
            category: preset.category?.trim() || curr.category,
            buyPriceIQD: preset.buyPriceIQD !== undefined ? preset.buyPriceIQD : curr.buyPriceIQD,
            buyPriceUSD: preset.buyPriceUSD !== undefined ? preset.buyPriceUSD : curr.buyPriceUSD,
            sellPriceIQD: preset.sellPriceIQD !== undefined ? preset.sellPriceIQD : curr.sellPriceIQD,
            sellPriceUSD: preset.sellPriceUSD !== undefined ? preset.sellPriceUSD : curr.sellPriceUSD,
            supplierName: preset.supplierName !== undefined ? preset.supplierName : curr.supplierName,
            supplierPhone: preset.supplierPhone !== undefined ? preset.supplierPhone : curr.supplierPhone,
            supplierAddress: preset.supplierAddress !== undefined ? preset.supplierAddress : curr.supplierAddress,
            selectedSupplierId: preset.selectedSupplierId !== undefined ? preset.selectedSupplierId : curr.selectedSupplierId,
            supplierImageUri: preset.supplierImageUri !== undefined ? preset.supplierImageUri : curr.supplierImageUri,
            warranty: preset.warranty !== undefined ? preset.warranty : curr.warranty,
            notes: preset.notes !== undefined ? preset.notes : curr.notes,
            websiteDescription: preset.websiteDescription !== undefined ? preset.websiteDescription : curr.websiteDescription,
            updatedAt: now,
          };
          // Move the updated one to top safely
          const [item] = updated.splice(existingIdx, 1);
          if (item) {
            set({ savedPresets: [item, ...updated.filter(Boolean)] });
          } else {
            set({ savedPresets: updated.filter(Boolean) });
          }
        } else {
          const newPreset: SavedProductPreset = {
            id: `preset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: finalName,
            description: preset.description?.trim() || null,
            imageUri: preset.imageUri?.trim() || null,
            itemId: rawItemId,
            category: preset.category?.trim() || null,
            buyPriceIQD: preset.buyPriceIQD,
            buyPriceUSD: preset.buyPriceUSD,
            sellPriceIQD: preset.sellPriceIQD,
            sellPriceUSD: preset.sellPriceUSD,
            supplierName: preset.supplierName ?? null,
            supplierPhone: preset.supplierPhone ?? null,
            supplierAddress: preset.supplierAddress ?? null,
            selectedSupplierId: preset.selectedSupplierId ?? null,
            supplierImageUri: preset.supplierImageUri ?? null,
            warranty: preset.warranty ?? null,
            notes: preset.notes ?? null,
            websiteDescription: preset.websiteDescription ?? null,
            updatedAt: now,
          };
          set({ savedPresets: [newPreset, ...existing.filter(Boolean)] });
        }
      },

      deletePreset: (id: string) => {
        set((state) => ({
          savedPresets: (state.savedPresets || []).filter((p) => p && p.id !== id),
        }));
      },

      syncFromInventory: (products: InventoryProduct[]) => {
        if (!Array.isArray(products) || products.length === 0) return;

        const current = (get().savedPresets || []).filter(Boolean);
        const presetMap = new Map<string, SavedProductPreset>();
        const codeMap = new Map<string, SavedProductPreset>();

        // 1. Index existing presets by normalized name and code
        current.forEach((p) => {
          if (!p || !p.name) return;
          presetMap.set(p.name.trim().toLowerCase(), p);
          if (p.itemId && p.itemId.trim()) {
            codeMap.set(p.itemId.trim().toLowerCase(), p);
          }
        });

        let hasNew = false;
        const allPresets = [...current];

        // 2. Loop through inventory products
        products.forEach((prod) => {
          if (!prod) return;
          const name = prod.name?.trim();
          if (!name) return;

          const uri = prod.imageUri || prod.imageRemoteUrl || null;
          const key = name.toLowerCase();
          const codeKey = prod.itemId?.trim().toLowerCase();

          const existing = presetMap.get(key) || (codeKey ? codeMap.get(codeKey) : undefined);

          if (existing) {
            // Enrich existing preset with prices or supplier if missing
            let changed = false;

            if (!existing.imageUri && uri) { existing.imageUri = uri; changed = true; }
            if (!existing.itemId && prod.itemId) { existing.itemId = prod.itemId.trim(); changed = true; }
            if (!existing.category && prod.category) { existing.category = prod.category.trim(); changed = true; }
            if (existing.buyPriceIQD === undefined && prod.purchasePrice > 0) { existing.buyPriceIQD = prod.purchasePrice; changed = true; }
            if (existing.sellPriceIQD === undefined && prod.sellingPrice > 0) { existing.sellPriceIQD = prod.sellingPrice; changed = true; }
            if (existing.supplierName === undefined && prod.supplierName) { existing.supplierName = prod.supplierName; changed = true; }

            if (changed) {
              hasNew = true;
            }
          } else {
            // Only add to saved presets if it actually has an image
            if (!uri || !uri.trim()) return;

            const desc = prod.itemDescription?.trim() || prod.description?.trim() || null;
            const newPreset: SavedProductPreset = {
              id: `inv_${prod.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name,
              description: desc,
              imageUri: uri.trim(),
              itemId: prod.itemId?.trim() || null,
              category: prod.category?.trim() || null,
              buyPriceIQD: prod.purchasePrice || undefined,
              buyPriceUSD: prod.buyPriceUsd || undefined,
              sellPriceIQD: prod.sellingPrice || undefined,
              sellPriceUSD: prod.sellPriceUsd || undefined,
              supplierName: prod.supplierName ?? null,
              supplierPhone: prod.supplierPhone ?? null,
              supplierAddress: prod.supplierAddress ?? null,
              updatedAt: new Date().toISOString(),
            };
            presetMap.set(key, newPreset);
            if (codeKey) codeMap.set(codeKey, newPreset);
            allPresets.unshift(newPreset);
            hasNew = true;
          }
        });

        if (hasNew) {
          // Keep only presets with real images
          const combined = allPresets.filter(
            (p) => Boolean(p && typeof p.imageUri === 'string' && p.imageUri.trim().length > 0)
          );
          set({ savedPresets: combined });
        }
      },

      findByName: (name: string) => {
        const trimmed = name.trim().toLowerCase();
        if (!trimmed) return undefined;
        return (get().savedPresets || []).find(
          (p) => Boolean(p && p.name && p.name.trim().toLowerCase() === trimmed)
        );
      },

      findByCode: (code: string) => {
        const trimmed = code.trim().toLowerCase();
        if (!trimmed) return undefined;
        return (get().savedPresets || []).find(
          (p) => Boolean(p && p.itemId && p.itemId.trim().toLowerCase() === trimmed)
        );
      },

      searchPresets: (query: string) => {
        const q = query.trim().toLowerCase();
        const all = (get().savedPresets || []).filter(
          (p) => Boolean(p && typeof p.imageUri === 'string' && p.imageUri.trim().length > 0)
        );
        if (!q) return all;

        return all.filter((p) => {
          if (!p) return false;
          const matchName = p.name ? p.name.toLowerCase().includes(q) : false;
          const matchDesc = p.description?.toLowerCase().includes(q) ?? false;
          const matchCode = p.itemId?.toLowerCase().includes(q) ?? false;
          return matchName || matchDesc || matchCode;
        });
      },
    }),
    {
      name: '@froshiar_saved_products',
      storage: createJSONStorage(() => migratedAsyncStorage),
      merge: (persistedState: unknown, currentState: SavedProductState): SavedProductState => {
        const p = persistedState as Partial<SavedProductState> | null;
        const rawPresets = Array.isArray(p?.savedPresets) ? p.savedPresets : [];
        // Only keep presets that actually have an image and are valid
        const validPresets = rawPresets.filter(
          (x): x is SavedProductPreset => Boolean(x && typeof x.imageUri === 'string' && x.imageUri.trim().length > 0)
        );
        return {
          ...currentState,
          savedPresets: validPresets,
        };
      },
    }
  )
);
