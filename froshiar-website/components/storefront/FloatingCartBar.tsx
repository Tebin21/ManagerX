'use client';

import { ShoppingBag, ArrowLeft, ArrowRight } from 'lucide-react';
import { useCart } from './CartContext';
import { formatIQD } from '@/lib/storefront/format';

interface Props {
  isRTL?: boolean;
}

export function FloatingCartBar({ isRTL = true }: Props) {
  const { totalCount, totalPrice, openCart } = useCart();

  if (totalCount === 0) return null;

  return (
    <aside aria-label="سەبەتەی هەڵبژێردراو" className="fixed bottom-4 inset-x-3 sm:inset-x-6 z-40 max-w-xl mx-auto pointer-events-none">
      <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 p-3 sm:p-3.5 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300">
        {/* Count & Total Price */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-500,#D4AF37)] text-slate-950 font-black text-sm shadow-md">
            {totalCount}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-400">
              {totalCount} کاڵا هەڵبژێردراوە
            </p>
            <p className="text-sm sm:text-base font-black text-white truncate">
              {formatIQD(totalPrice)}
            </p>
          </div>
        </div>

        {/* View Cart & Checkout Button */}
        <button
          type="button"
          onClick={openCart}
          className="flex items-center gap-2 rounded-xl bg-[var(--brand-500,#D4AF37)] px-4 py-2.5 text-xs sm:text-sm font-black text-slate-950 shadow-md transition hover:brightness-105 active:scale-95 cursor-pointer shrink-0"
        >
          <span>بینینی سەبەتە</span>
          <ShoppingBag size={16} />
        </button>
      </div>
    </aside>
  );
}
