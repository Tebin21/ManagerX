'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from './CartContext';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

interface Props {
  storeSlug: string;
  isRTL: boolean;
}

export function ProductHeaderBar({ storeSlug, isRTL }: Props) {
  const { totalCount, openCart } = useCart();

  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <Link
        href={`/${storeSlug}`}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-[var(--brand-600,#D4AF37)] dark:text-slate-300 dark:hover:text-[var(--brand-500,#D4AF37)] transition font-kurdish"
      >
        {isRTL ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
        <span>گەڕانەوە بۆ فڕۆشگا</span>
      </Link>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openCart}
          aria-label="سەبەتەی کڕین"
          title="سەبەتەی کڕین"
          className="relative flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/90 bg-slate-100/70 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:border-gold-800/40 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.12] dark:hover:text-white transition-all cursor-pointer"
        >
          <ShoppingBag size={15} />
          {totalCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[var(--brand-500,#D4AF37)] text-[10px] font-black text-slate-950 shadow-sm animate-in zoom-in-75">
              {totalCount}
            </span>
          )}
        </button>

        <ThemeToggle />
      </div>
    </div>
  );
}

