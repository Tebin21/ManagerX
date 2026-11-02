'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  type StoreLocale,
  type StoreTranslations,
  STORE_TRANSLATIONS,
} from '@/lib/storefront/storeI18n';

interface StoreLanguageContextValue {
  locale: StoreLocale;
  setLocale: (loc: StoreLocale) => void;
  cycleLocale: () => void;
  t: (key: keyof StoreTranslations, params?: Record<string, string | number>) => string;
  isRTL: boolean;
  dir: 'rtl' | 'ltr';
}

const StoreLanguageContext = createContext<StoreLanguageContextValue | null>(null);

export function StoreLanguageProvider({
  children,
  slug = 'default',
  initialLocale = 'ku',
}: {
  children: React.ReactNode;
  slug?: string;
  initialLocale?: StoreLocale;
}) {
  const safeSlug = useMemo(() => (slug || 'default').trim().toLowerCase(), [slug]);
  const storageKey = useMemo(() => `froshiar_store_lang_${safeSlug}`, [safeSlug]);

  const [locale, setLocaleState] = useState<StoreLocale>(initialLocale);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load language strictly for this store on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'ku' || stored === 'ar' || stored === 'en') {
        setLocaleState(stored);
      }
    } catch (err) {
      console.error('[StoreLanguage] Failed to load locale:', err);
    } finally {
      setIsHydrated(true);
    }
  }, [storageKey]);

  const setLocale = useCallback(
    (newLoc: StoreLocale) => {
      setLocaleState(newLoc);
      try {
        localStorage.setItem(storageKey, newLoc);
      } catch (err) {
        console.error('[StoreLanguage] Failed to save locale:', err);
      }
    },
    [storageKey]
  );

  const cycleLocale = useCallback(() => {
    const sequence: StoreLocale[] = ['ku', 'ar', 'en'];
    const nextIdx = (sequence.indexOf(locale) + 1) % sequence.length;
    setLocale(sequence[nextIdx]);
  }, [locale, setLocale]);

  const isRTL = locale === 'ku' || locale === 'ar';
  const dir: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';

  const t = useCallback(
    (key: keyof StoreTranslations, params?: Record<string, string | number>): string => {
      const dict = STORE_TRANSLATIONS[locale] || STORE_TRANSLATIONS.ku;
      let text = (dict[key] || STORE_TRANSLATIONS.ku[key] || '') as string;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return text;
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      cycleLocale,
      t,
      isRTL,
      dir,
    }),
    [locale, setLocale, cycleLocale, t, isRTL, dir]
  );

  return (
    <StoreLanguageContext.Provider value={value}>
      {children}
    </StoreLanguageContext.Provider>
  );
}

export function useStoreLanguage() {
  const ctx = useContext(StoreLanguageContext);
  if (!ctx) {
    // Graceful fallback if used outside provider
    return {
      locale: 'ku' as StoreLocale,
      setLocale: () => {},
      cycleLocale: () => {},
      t: (key: keyof StoreTranslations, params?: Record<string, string | number>) => {
        let text = (STORE_TRANSLATIONS.ku[key] || '') as string;
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
          }
        }
        return text;
      },
      isRTL: true,
      dir: 'rtl' as const,
    };
  }
  return ctx;
}
