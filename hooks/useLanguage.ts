import { useLanguageStore } from '@/store/languageStore';
import i18n from '@/lib/i18n';

export function useLanguage() {
  const store = useLanguageStore();

  const changeLanguage = async (lang: 'en' | 'ku') => {
    store.setLanguage(lang);
    await i18n.changeLanguage(lang);
  };

  return { ...store, changeLanguage };
}
