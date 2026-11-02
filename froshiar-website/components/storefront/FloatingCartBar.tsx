'use client';

import { ShoppingBag } from 'lucide-react';
import { useCart } from './CartContext';
import { formatIQD } from '@/lib/storefront/format';
import { useStoreLanguage } from './StoreLanguageContext';

interface Props {
  isRTL?: boolean;
}

export function FloatingCartBar({ isRTL }: Props) {
  const { totalCount, totalPrice, openCart } = useCart();
  const { t, isRTL: contextIsRTL } = useStoreLanguage();
  const activeIsRTL = isRTL ?? contextIsRTL;

  if (totalCount === 0) return null;

  return (
    <aside
      aria-label={t('cart')}
      className="fixed bottom-4 inset-x-3 sm:inset-x-6 z-40 max-w-xl mx-auto pointer-events-none"
    >
      <div
        onClick={openCart}
        className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 p-3 sm:p-3.5 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300 cursor-pointer transition hover:bg-slate-900"
      >
        {/* Count & Total Price */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-500,#D4AF37)] text-slate-950 font-black text-sm shadow-md">
            {totalCount}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-300">
              {totalCount} {t('cartCountSuffix')}
            </p>
            <p className="text-sm sm:text-base font-black text-white truncate font-sans">
              {formatIQD(totalPrice)}
            </p>
          </div>
        </div>

        {/* View Cart & Checkout Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openCart();
          }}
          className="flex items-center gap-2 rounded-xl bg-[var(--brand-500,#D4AF37)] px-4 py-2.5 text-xs sm:text-sm font-black text-slate-950 shadow-md transition hover:brightness-105 active:scale-95 cursor-pointer shrink-0"
        >
          <span>{t('checkout')}</span>
          <ShoppingBag size={16} />
        </button>
      </div>
    </aside>
  );
}
