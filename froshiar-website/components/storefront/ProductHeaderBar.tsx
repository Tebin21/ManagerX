'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShoppingBag } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCart } from './CartContext';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { StoreLanguageSwitcher } from './StoreLanguageSwitcher';
import { useStoreLanguage } from './StoreLanguageContext';

interface Props {
  storeSlug: string;
  isRTL?: boolean;
}

export function ProductHeaderBar({ storeSlug }: Props) {
  const { totalCount, openCart } = useCart();
  const { t, isRTL } = useStoreLanguage();
  const { setTheme } = useTheme();

  useEffect(() => {
    const safeSlug = (storeSlug || 'demo').trim().toLowerCase();
    try {
      const storedTheme = localStorage.getItem(`froshiar_store_theme_${safeSlug}`);
      if (storedTheme === 'light' || storedTheme === 'dark') {
        setTheme(storedTheme);
      }
    } catch {
      // Ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSlug]);

  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <Link
        href={`/${storeSlug}`}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-[var(--brand-600,#D4AF37)] dark:text-slate-300 dark:hover:text-[var(--brand-500,#D4AF37)] transition"
      >
        {isRTL ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
        <span>{t('returnToShopping')}</span>
      </Link>

      <div className="flex items-center gap-1.5 sm:gap-2">
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

        <ThemeToggle storeSlug={storeSlug} />
        <StoreLanguageSwitcher />
      </div>
    </div>
  );
}
