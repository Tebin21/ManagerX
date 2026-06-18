import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      },
    }),
    {
      name: '@managerx_language',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
