import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { migratedAsyncStorage } from '@/lib/migratedStorage';
import { ModuleId } from '@/constants/config';

export type ModuleLayout = 'half' | 'full';

export interface ModuleConfig {
  enabled: boolean;
  order: number;
  layout?: ModuleLayout;
}

export interface ModuleState {
  modules: Record<ModuleId, ModuleConfig>;
  toggleModule: (id: ModuleId) => void;
  reorderModules: (orderedIds: ModuleId[]) => void;
  setModuleLayout: (id: ModuleId, layout: ModuleLayout) => void;
  setAllLayouts: (layout: ModuleLayout) => void;
  toggleModuleLayout: (id: ModuleId) => void;
  swapModules: (id1: ModuleId, id2: ModuleId) => void;
  moveModule: (id: ModuleId, direction: 'up' | 'down') => void;
  resetToDefaultLayout: () => void;
}

const defaultModules: Record<ModuleId, ModuleConfig> = {
  sales:     { enabled: true, order: 0, layout: 'half' },
  purchases: { enabled: true, order: 1, layout: 'half' },
  reports:   { enabled: true, order: 2, layout: 'half' },
  inventory: { enabled: true, order: 3, layout: 'half' },
  debt:      { enabled: true, order: 4, layout: 'half' },
  history:   { enabled: true, order: 5, layout: 'half' },
  expenses:  { enabled: true, order: 6, layout: 'half' },
  dashboard: { enabled: true, order: 7, layout: 'half' },
};

export const useModuleStore = create<ModuleState>()(
  persist(
    (set) => ({
      modules: defaultModules,

      toggleModule: (id) =>
        set((state) => {
          const current = state.modules[id] ?? defaultModules[id] ?? { enabled: true, order: 99, layout: 'half' };
          return {
            modules: {
              ...state.modules,
              [id]: { ...current, enabled: !current.enabled },
            },
          };
        }),

      reorderModules: (orderedIds) =>
        set((state) => {
          const updated = { ...state.modules };
          orderedIds.forEach((id, index) => {
            const current = updated[id] ?? defaultModules[id] ?? { enabled: true, order: index, layout: 'half' };
            updated[id] = { ...current, order: index };
          });
          return { modules: updated };
        }),

      setModuleLayout: (id, layout) =>
        set((state) => {
          const current = state.modules[id] ?? defaultModules[id] ?? { enabled: true, order: 99, layout: 'half' };
          return {
            modules: {
              ...state.modules,
              [id]: { ...current, layout },
            },
          };
        }),

      setAllLayouts: (layout) =>
        set((state) => {
          const updated = { ...state.modules };
          for (const key of Object.keys(updated) as ModuleId[]) {
            const current = updated[key] ?? defaultModules[key] ?? { enabled: true, order: 99, layout: 'half' };
            updated[key] = { ...current, layout };
          }
          return { modules: updated };
        }),

      toggleModuleLayout: (id) =>
        set((state) => {
          const current = state.modules[id] ?? defaultModules[id] ?? { enabled: true, order: 99, layout: 'half' };
          const currentLayout = current.layout ?? (id === 'expenses' ? 'full' : 'half');
          const nextLayout: ModuleLayout = currentLayout === 'half' ? 'full' : 'half';
          return {
            modules: {
              ...state.modules,
              [id]: { ...current, layout: nextLayout },
            },
          };
        }),

      swapModules: (id1, id2) =>
        set((state) => {
          const mod1 = state.modules[id1] ?? defaultModules[id1];
          const mod2 = state.modules[id2] ?? defaultModules[id2];
          const order1 = mod1.order;
          const order2 = mod2.order;
          return {
            modules: {
              ...state.modules,
              [id1]: { ...mod1, order: order2 },
              [id2]: { ...mod2, order: order1 },
            },
          };
        }),

      moveModule: (id, direction) =>
        set((state) => {
          const allEntries = (Object.keys(state.modules) as ModuleId[]).map((mId) => ({
            id: mId,
            order: state.modules[mId]?.order ?? defaultModules[mId]?.order ?? 99,
          }));
          allEntries.sort((a, b) => a.order - b.order);

          const idx = allEntries.findIndex((e) => e.id === id);
          if (idx === -1) return state;

          const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= allEntries.length) return state;

          const currentId = allEntries[idx].id;
          const targetId = allEntries[targetIdx].id;

          const curMod = state.modules[currentId] ?? defaultModules[currentId];
          const tgtMod = state.modules[targetId] ?? defaultModules[targetId];

          return {
            modules: {
              ...state.modules,
              [currentId]: { ...curMod, order: tgtMod.order },
              [targetId]:  { ...tgtMod, order: curMod.order },
            },
          };
        }),

      resetToDefaultLayout: () => set({ modules: defaultModules }),
    }),
    {
      name: '@froshiar_modules',
      storage: createJSONStorage(() => migratedAsyncStorage),
      merge: (persistedState: unknown, currentState: ModuleState): ModuleState => {
        const p = persistedState as Partial<ModuleState> | null;
        const mergedModules = { ...defaultModules };
        if (p?.modules) {
          for (const key of Object.keys(defaultModules) as ModuleId[]) {
            if (p.modules[key]) {
              mergedModules[key] = {
                ...defaultModules[key],
                ...p.modules[key],
                layout: p.modules[key].layout ?? defaultModules[key].layout ?? 'half',
              };
            }
          }
        }
        return {
          ...currentState,
          ...p,
          modules: mergedModules,
        };
      },
    }
  )
);
