'use client';

import { useMemo } from 'react';
import { Search, X, ShoppingBag } from 'lucide-react';
import type { StoreInfo } from '@/lib/storefront/storeApi';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useCart } from './CartContext';
import { StoreLanguageSwitcher } from './StoreLanguageSwitcher';
import { useStoreLanguage } from './StoreLanguageContext';

interface Props {
  businessName: string;
  info: StoreInfo;
  isSearchOpen?: boolean;
  onToggleSearch?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export function StoreHeader({
  businessName,
  info,
  isSearchOpen,
  onToggleSearch,
  searchQuery = '',
  onSearchChange,
}: Props) {
  const { totalCount, openCart } = useCart();
  const { t, isRTL } = useStoreLanguage();

  return (
    <div className="w-full">
      {/* 1. Main Cover Banner: Completely empty of text/overlays; uploaded business picture covers full banner */}
      <div className="mx-auto mt-4 w-full max-w-5xl px-4 sm:mt-6">
        <div className="relative h-48 w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-900 shadow-xl transition-all sm:h-64 md:h-80 lg:h-96 dark:border-slate-800">
          {info.logoUrl ? (
            <img
              src={info.logoUrl}
              alt={businessName}
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--brand-700,#1e3a8a)] via-[var(--brand-600,#2563eb)] to-slate-950">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl"
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. Store Name & Actions on the Exact Same Row */}
      <div className="mx-auto mt-5 w-full max-w-5xl px-4 sm:mt-6">
        <div className="flex items-start justify-between gap-3">
          {/* Store Name & Description */}
          <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h1
              className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl md:text-4xl dark:text-white leading-tight font-sans"
            >
              {businessName}
            </h1>
            {info.description && (
              <p
                className="mt-1.5 text-sm font-medium leading-relaxed text-slate-600 sm:text-base dark:text-slate-300 font-sans"
              >
                {info.description}
              </p>
            )}
          </div>

          {/* Action Buttons: Shopping Cart + Search Toggle + Dark/Light Theme Toggle + Flag Language Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pt-1">
            {/* Shopping Cart Button with Dynamic Badge */}
            <button
              type="button"
              onClick={openCart}
              aria-label={t('cart')}
              title={t('cart')}
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/90 bg-slate-100/70 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:border-gold-800/40 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.12] dark:hover:text-white transition-all cursor-pointer"
            >
              <ShoppingBag size={15} />
              {totalCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[var(--brand-500,#D4AF37)] text-[10px] font-black text-slate-950 shadow-sm animate-in zoom-in-75">
                  {totalCount}
                </span>
              )}
            </button>

            {/* Search Icon Button */}
            <button
              type="button"
              onClick={onToggleSearch}
              aria-label={t('searchTitle')}
              title={t('searchTitle')}
              className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all cursor-pointer ${
                isSearchOpen
                  ? 'border-[var(--brand-500,#D4AF37)] bg-[var(--brand-500,#D4AF37)] text-slate-950 shadow-xs'
                  : 'border-slate-200/90 bg-slate-100/70 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:border-gold-800/40 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.12] dark:hover:text-white'
              }`}
            >
              <Search size={15} />
            </button>

            {/* Dark / Light Theme Toggle (Moon / Sun) */}
            <ThemeToggle />

            {/* Store Language Switcher (3 Flags: Kurdistan, Iraq, Britain) */}
            <StoreLanguageSwitcher />
          </div>
        </div>

        {/* 3. Downward Expandable Search Bar */}
        {isSearchOpen && (
          <div className="mt-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto"
              />
              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 px-10 text-sm text-slate-800 shadow-sm transition focus:border-[var(--brand-500,#D4AF37)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-500,#D4AF37)]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.('')}
                  aria-label={t('clearSearch')}
                  className="absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
