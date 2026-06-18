import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_EXCHANGE_RATE = 1310;

interface SettingsState {
  isDarkMode:    boolean;
  exchangeRate:  number;
  rateUpdatedAt: string | null;
  accentColor:             string | null;
  globalLowStockEnabled:   boolean;
  globalLowStockThreshold: number;

  setDarkMode:                (val: boolean) => void;
  setExchangeRate:            (rate: number) => Promise<void>;
  setAccentColor:             (color: string | null) => void;
  setGlobalLowStockEnabled:   (val: boolean) => void;
  setGlobalLowStockThreshold: (val: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isDarkMode:    false,
      exchangeRate:  DEFAULT_EXCHANGE_RATE,
      rateUpdatedAt: null,
      accentColor:             null,
      globalLowStockEnabled:   true,
      globalLowStockThreshold: 5,

      setDarkMode:               (val) => set({ isDarkMode: val }),
      setAccentColor:            (color) => set({ accentColor: color }),
      setGlobalLowStockEnabled:  (val) => set({ globalLowStockEnabled: val }),
      setGlobalLowStockThreshold:(val) => set({ globalLowStockThreshold: val }),

      setExchangeRate: async (rate: number) => {
        const now = new Date().toISOString();
        set({ exchangeRate: rate, rateUpdatedAt: now });
        // Persist to SQLite audit log (non-blocking)
        try {
          const { saveExchangeRateHistory } = await import('@/lib/sqlite');
          await saveExchangeRateHistory(rate);
        } catch { /* non-critical — Zustand persist is the source of truth */ }
      },
    }),
    {
      name: '@managerx_settings',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted: unknown, current: SettingsState): SettingsState => {
        const p = persisted as Partial<SettingsState> | null;
        return {
          ...current,
          ...p,
          exchangeRate:  p?.exchangeRate  ?? DEFAULT_EXCHANGE_RATE,
          rateUpdatedAt: p?.rateUpdatedAt ?? null,
          accentColor:             p?.accentColor   ?? null,
          globalLowStockEnabled:   p?.globalLowStockEnabled   ?? true,
          globalLowStockThreshold: p?.globalLowStockThreshold ?? 5,
        };
      },
    }
  )
);
