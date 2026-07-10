import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { en, type Dictionary } from "./dictionaries/en";
import { ckb } from "./dictionaries/ckb";

export type Locale = "en" | "ckb";

const STORAGE_KEY = "froshiar-marketing-locale";

const DICTIONARIES: Record<Locale, Dictionary> = { en, ckb };

type LocaleContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  messages: Dictionary;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "ckb" ? "ckb" : "en";
}

export function MarketingLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: locale === "ckb" ? "rtl" : "ltr",
      messages: DICTIONARIES[locale],
      setLocale,
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a MarketingLocaleProvider");
  }
  return context;
}
