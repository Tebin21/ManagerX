import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModuleId } from '@/constants/config';

interface ModuleConfig {
  enabled: boolean;
  order: number;
}

interface ModuleState {
  modules: Record<ModuleId, ModuleConfig>;
  toggleModule: (id: ModuleId) => void;
  reorderModules: (orderedIds: ModuleId[]) => void;
}

const defaultModules: Record<ModuleId, ModuleConfig> = {
  purchases: { enabled: true, order: 0 },
  sales:     { enabled: true, order: 1 },
  inventory: { enabled: true, order: 2 },
  reports:   { enabled: true, order: 3 },
  history:   { enabled: true, order: 4 },
  debt:      { enabled: true, order: 5 },
};

export const useModuleStore = create<ModuleState>()(
  persist(
    (set) => ({
      modules: defaultModules,

      toggleModule: (id) =>
        set((state) => {
          const current = state.modules[id] ?? defaultModules[id] ?? { enabled: true, order: 99 };
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
            const current = updated[id] ?? defaultModules[id] ?? { enabled: true, order: index };
            updated[id] = { ...current, order: index };
          });
          return { modules: updated };
        }),
    }),
    {
      name: '@managerx_modules',
      storage: createJSONStorage(() => AsyncStorage),
      // Deep-merge the modules sub-object so that any module IDs added after
      // the user's first install (e.g. 'suppliers') get their default config
      // rather than being silently undefined after rehydration.
      merge: (persistedState: unknown, currentState: ModuleState): ModuleState => {
        const p = persistedState as Partial<ModuleState> | null;
        return {
          ...currentState,
          ...p,
          modules: {
            ...defaultModules,      // guarantees all known IDs are present
            ...(p?.modules ?? {}),  // saved values win where they exist
          } as Record<ModuleId, ModuleConfig>,
        };
      },
    }
  )
);
