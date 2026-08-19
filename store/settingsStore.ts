import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { migratedAsyncStorage } from '@/lib/migratedStorage';

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

// These preference stores are plain AsyncStorage, never touching a SQLite row
// or the cloud_sync_queue trigger mechanism — so a change here needs its own
// explicit nudge to reach the cloud, piggybacked onto the same users/{uid} root
// doc as the business profile/counters (see lib/cloudSync/pushEngine.ts's
// pushBusinessProfile). Never throws — a device with no signed-in user, or
// mid-startup before authStore has hydrated, just leaves the change local-only
// until the next real sync trigger picks it up naturally.
async function notifyPreferencesChanged(): Promise<void> {
  try {
    const { enqueueBusinessProfilePush } = await import('@/lib/sqlite');
    await enqueueBusinessProfilePush();
    const { useAuthStore } = await import('@/store/authStore');
    const uid = useAuthStore.getState().user?.id;
    if (uid) {
      const { scheduleCloudPush } = await import('@/lib/cloudSync');
      scheduleCloudPush(uid);
    }
  } catch { /* non-critical — the next interval-driven push cycle still picks this up */ }
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

      setDarkMode:               (val) => { set({ isDarkMode: val }); notifyPreferencesChanged(); },
      setAccentColor:            (color) => { set({ accentColor: color }); notifyPreferencesChanged(); },
      setGlobalLowStockEnabled:  (val) => { set({ globalLowStockEnabled: val }); notifyPreferencesChanged(); },
      setGlobalLowStockThreshold:(val) => { set({ globalLowStockThreshold: val }); notifyPreferencesChanged(); },

      setExchangeRate: async (rate: number) => {
        const now = new Date().toISOString();
        set({ exchangeRate: rate, rateUpdatedAt: now });
        // Persist to SQLite audit log (non-blocking)
        try {
          const { saveExchangeRateHistory } = await import('@/lib/sqlite');
          await saveExchangeRateHistory(rate);
        } catch { /* non-critical — Zustand persist is the source of truth */ }
        notifyPreferencesChanged();
      },
    }),
    {
      name: '@froshiar_settings',
      storage: createJSONStorage(() => migratedAsyncStorage),
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
