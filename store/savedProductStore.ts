import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { migratedAsyncStorage } from '@/lib/migratedStorage';
import type { InventoryProduct } from '@/types/inventory';

export interface SavedProductPreset {
  id: string;
  name: string;
  description: string | null;
  imageUri: string;
  itemId: string | null;
  category: string | null;
  updatedAt: string;
}

export interface SavedProductState {
  savedPresets: SavedProductPreset[];
  savePreset: (preset: {
    name?: string | null;
    description?: string | null;
    imageUri: string;
    itemId?: string | null;
    category?: string | null;
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
        if (!preset.imageUri) return;

        const rawName = preset.name?.trim() || '';
        const existing = get().savedPresets;
        const now = new Date().toISOString();

        // If no name provided, generate a friendly fallback like "وێنەی پاشەکەوتکراو #1"
        const finalName = rawName || `وێنەی پاشەکەوتکراو #${existing.length + 1}`;
        const normalizedName = finalName.toLowerCase();

        // Check if an entry with this name already exists (case-insensitive)
        const existingIdx = rawName
          ? existing.findIndex((p) => p.name.trim().toLowerCase() === normalizedName)
          : -1;

        if (existingIdx !== -1) {
          const updated = [...existing];
          const curr = updated[existingIdx];
          updated[existingIdx] = {
            ...curr,
            name: finalName,
            description: preset.description !== undefined ? (preset.description?.trim() || null) : curr.description,
            imageUri: preset.imageUri,
            itemId: preset.itemId?.trim() || curr.itemId,
            category: preset.category?.trim() || curr.category,
            updatedAt: now,
          };
          // Move the updated one to top
          const [item] = updated.splice(existingIdx, 1);
          set({ savedPresets: [item, ...updated] });
        } else {
          const newPreset: SavedProductPreset = {
            id: `preset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: finalName,
            description: preset.description?.trim() || null,
            imageUri: preset.imageUri,
            itemId: preset.itemId?.trim() || null,
            category: preset.category?.trim() || null,
            updatedAt: now,
          };
          set({ savedPresets: [newPreset, ...existing] });
        }
      },

      deletePreset: (id: string) => {
        set((state) => ({
          savedPresets: state.savedPresets.filter((p) => p.id !== id),
        }));
      },

      syncFromInventory: (products: InventoryProduct[]) => {
        if (!Array.isArray(products) || products.length === 0) return;

        const current = get().savedPresets;
        const nameMap = new Map<string, SavedProductPreset>();

        // Index existing presets by normalized name
        current.forEach((p) => {
          nameMap.set(p.name.trim().toLowerCase(), p);
        });

        let hasNew = false;
        const additions: SavedProductPreset[] = [];

        products.forEach((prod) => {
          const uri = prod.imageUri || prod.imageRemoteUrl;
          const name = prod.name?.trim();
          if (!uri || !name) return;

          const key = name.toLowerCase();
          if (!nameMap.has(key)) {
            const desc = prod.itemDescription?.trim() || prod.description?.trim() || null;
            const newPreset: SavedProductPreset = {
              id: `inv_${prod.id}_${Date.now()}`,
              name,
              description: desc,
              imageUri: uri,
              itemId: prod.itemId?.trim() || null,
              category: prod.category?.trim() || null,
              updatedAt: new Date().toISOString(),
            };
            nameMap.set(key, newPreset);
            additions.push(newPreset);
            hasNew = true;
          }
        });

        if (hasNew) {
          set({ savedPresets: [...additions, ...current] });
        }
      },

      findByName: (name: string) => {
        const trimmed = name.trim().toLowerCase();
        if (!trimmed) return undefined;
        return get().savedPresets.find(
          (p) => p.name.trim().toLowerCase() === trimmed
        );
      },

      findByCode: (code: string) => {
        const trimmed = code.trim().toLowerCase();
        if (!trimmed) return undefined;
        return get().savedPresets.find(
          (p) => p.itemId && p.itemId.trim().toLowerCase() === trimmed
        );
      },

      searchPresets: (query: string) => {
        const q = query.trim().toLowerCase();
        const all = get().savedPresets;
        if (!q) return all;

        return all.filter((p) => {
          const matchName = p.name.toLowerCase().includes(q);
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
        return {
          ...currentState,
          savedPresets: Array.isArray(p?.savedPresets) ? p.savedPresets : [],
        };
      },
    }
  )
);
