import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_EXCHANGE_RATE = 1310;

interface NotificationSettings {
  lowStock:        boolean;
  debtReminder:    boolean;
  paymentReminder: boolean;
  dailySummary:    boolean;
}

interface SettingsState {
  isDarkMode:    boolean;
  pinEnabled:    boolean;
  exchangeRate:  number;
  rateUpdatedAt: string | null;
  notifications: NotificationSettings;

  setDarkMode:      (val: boolean) => void;
  setPinEnabled:    (val: boolean) => void;
  setNotification:  (key: keyof NotificationSettings, val: boolean) => void;
  setExchangeRate:  (rate: number) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isDarkMode:    false,
      pinEnabled:    false,
      exchangeRate:  DEFAULT_EXCHANGE_RATE,
      rateUpdatedAt: null,
      notifications: {
        lowStock:        true,
        debtReminder:    true,
        paymentReminder: true,
        dailySummary:    false,
      },

      setDarkMode:     (val) => set({ isDarkMode: val }),
      setPinEnabled:   (val) => set({ pinEnabled: val }),

      setNotification: (key, val) =>
        set((state) => ({
          notifications: { ...state.notifications, [key]: val },
        })),

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
          notifications: {
            ...current.notifications,
            ...(p?.notifications ?? {}),
          },
        };
      },
    }
  )
);
