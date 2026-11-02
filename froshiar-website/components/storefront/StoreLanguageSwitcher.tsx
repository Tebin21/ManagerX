'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useStoreLanguage } from './StoreLanguageContext';
import {
  KurdistanFlag,
  IraqFlag,
  BritainFlag,
  type StoreLocale,
} from '@/lib/storefront/storeI18n';
import { ChevronDown } from 'lucide-react';

const LANGUAGE_OPTIONS: {
  locale: StoreLocale;
  name: string;
  nativeName: string;
  flag: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  {
    locale: 'ku',
    name: 'Kurdish',
    nativeName: 'کوردی (کوردستان)',
    flag: KurdistanFlag,
  },
  {
    locale: 'ar',
    name: 'Arabic',
    nativeName: 'عربي (العراق)',
    flag: IraqFlag,
  },
  {
    locale: 'en',
    name: 'English',
    nativeName: 'English (UK)',
    flag: BritainFlag,
  },
];

export function StoreLanguageSwitcher() {
  const { locale, setLocale, cycleLocale } = useStoreLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentOption = LANGUAGE_OPTIONS.find((opt) => opt.locale === locale) || LANGUAGE_OPTIONS[0];
  const CurrentFlag = currentOption.flag;

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Flag Button: Taps cycle to next language; arrow/long press opens menu */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title={`گۆڕینی زمان (${currentOption.nativeName})`}
          aria-label={`Current language: ${currentOption.name}. Click to change.`}
          className="group flex h-8 items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-100/70 px-2 text-slate-700 transition-all hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none dark:border-gold-800/40 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.12] dark:hover:text-white cursor-pointer active:scale-95 shadow-2xs"
        >
          <CurrentFlag size={18} />
          <ChevronDown
            size={12}
            className={`text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Dropdown Menu (3 Flags: Kurdistan, Iraq, Britain) */}
      {isOpen && (
        <div
          dir={locale === 'en' ? 'ltr' : 'rtl'}
          className="absolute end-0 mt-2 w-44 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-150 dark:border-slate-800 dark:bg-slate-900/95"
        >
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            زمان / اللغة / Language
          </div>
          <div className="space-y-0.5">
            {LANGUAGE_OPTIONS.map((opt) => {
              const Flag = opt.flag;
              const isActive = opt.locale === locale;
              return (
                <button
                  key={opt.locale}
                  type="button"
                  onClick={() => {
                    setLocale(opt.locale);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-black'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Flag size={20} />
                    <span>{opt.nativeName}</span>
                  </div>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

