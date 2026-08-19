import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { migratedAsyncStorage } from '@/lib/migratedStorage';
import i18n from '@/lib/i18n';

type Language = 'en' | 'ku';

interface LanguageState {
  language: Language | null;
  isRTL:    boolean;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: null,
      isRTL:    false,

      setLanguage: (lang) => {
        const isRTL = lang === 'ku';

        // Sync i18next translations
        i18n.changeLanguage(lang).catch(() => {});

        set({ language: lang, isRTL });

        // Piggyback on the business-profile root doc, same as settingsStore's
        // preferences (see lib/cloudSync/pushEngine.ts's pushBusinessProfile) —
        // never throws, a device with no signed-in user just stays local-only.
        (async () => {
          try {
            const { enqueueBusinessProfilePush } = await import('@/lib/sqlite');
            await enqueueBusinessProfilePush();
            const { useAuthStore } = await import('@/store/authStore');
            const uid = useAuthStore.getState().user?.id;
            if (uid) {
              const { scheduleCloudPush } = await import('@/lib/cloudSync');
              scheduleCloudPush(uid);
            }
          } catch { /* non-critical */ }
        })();
      },
    }),
    {
      name: '@froshiar_language',
      storage: createJSONStorage(() => migratedAsyncStorage),
    }
  )
);
