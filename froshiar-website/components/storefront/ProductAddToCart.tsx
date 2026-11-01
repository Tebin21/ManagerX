'use client';

import { useState } from 'react';
import { Plus, Minus, ShoppingBag, Check } from 'lucide-react';
import { useCart } from './CartContext';
import type { StoreProduct } from '@/lib/storefront/storeApi';

interface Props {
  product: StoreProduct;
}

export function ProductAddToCart({ product }: Props) {
  const { addItem, openCart, showToast } = useCart();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const stockLimit = product.quantity !== undefined ? product.quantity : 9999;

  const handleMinus = () => {
    setQty((prev) => Math.max(1, prev - 1));
  };

  const handlePlus = () => {
    if (qty + 1 > stockLimit) {
      showToast(`تەنها تا ${stockLimit} دانە دەتوانیت داوا بکەیت، لە کۆگادا نەماوە`);
      return;
    }
    setQty((prev) => prev + 1);
  };

  const handleAdd = () => {
    const success = addItem(product, qty);
    if (success) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
      openCart();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {/* Quantity Stepper */}
      <div className="flex items-center justify-between sm:justify-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5 dark:border-slate-700 dark:bg-slate-800">
        <button
          type="button"
          onClick={handleMinus}
          aria-label="کەمکردنەوە"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-xs hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition cursor-pointer"
        >
          <Minus size={15} />
        </button>

        <span
          dir="ltr"
          className="min-w-[32px] text-center font-sans text-base font-black text-slate-900 dark:text-white"
        >
          {qty}
        </span>

        <button
          type="button"
          onClick={handlePlus}
          aria-label="زیادکردن"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-xs hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition cursor-pointer"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Add to Cart Button */}
      <button
        type="button"
        onClick={handleAdd}
        className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl bg-[var(--brand-500,#D4AF37)] py-3 px-6 text-sm font-bold text-slate-950 shadow-md hover:brightness-105 active:scale-[0.99] transition cursor-pointer"
      >
        {justAdded ? (
          <>
            <Check size={18} />
            <span>زیادکرا بۆ سەبەتە!</span>
          </>
        ) : (
          <>
            <ShoppingBag size={18} />
            <span>زیادکردن بۆ سەبەتە</span>
          </>
        )}
      </button>
    </div>
  );
}
