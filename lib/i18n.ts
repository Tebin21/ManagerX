import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import 'intl-pluralrules';
import en from '../locales/en.json';
import ku from '../locales/ku.json';
import { getItemWithLegacyFallback } from './migratedStorage';

// The zustand languageStore persists under this key as a JSON envelope:
//   {"state":{"language":"en","isRTL":false},"version":0}
// We must parse that envelope to extract the actual language code.
const LANGUAGE_KEY = '@froshiar_language';

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const raw = await getItemWithLegacyFallback(LANGUAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const lang: string = parsed?.state?.language ?? 'en';
        callback(['en', 'ku'].includes(lang) ? lang : 'en');
      } else {
        callback('en');
      }
    } catch {
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: () => {
    // Language is owned by languageStore / zustand; i18n follows it,
    // not the other way around.  Writing here would corrupt the JSON
    // envelope that zustand expects.
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ku: { translation: ku },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
