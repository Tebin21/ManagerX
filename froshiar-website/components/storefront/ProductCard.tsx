'use client';

import Link from 'next/link';
import { ImageOff, Plus, Minus } from 'lucide-react';
import type { StoreProduct } from '@/lib/storefront/storeApi';
import { formatIQD } from '@/lib/storefront/format';
import { useCart } from './CartContext';

interface Props {
  product: StoreProduct;
  slug?: string;
}

export function ProductCard({ product, slug }: Props) {
  const { getItemQuantity, updateQuantity, addItem } = useCart();
  const quantity = getItemQuantity(product.productId);

  const handleAddOne = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
  };

  const handleMinus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.productId, quantity - 1);
  };

  const handlePlus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.productId, quantity + 1);
  };

  const card = (
    <div className="group flex flex-col justify-between overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100 transition duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-slate-800 dark:border-slate-700 h-full">
      <div>
        <div className="relative aspect-square bg-slate-100 dark:bg-slate-900">
          {product.category && (
            <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 shadow-xs backdrop-blur-sm dark:bg-slate-800 dark:text-slate-200">
              {product.category}
            </span>
          )}
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
              <ImageOff size={28} />
              <span className="text-xs">بێ وێنە</span>
            </div>
          )}
        </div>
        <div className="p-3.5 sm:p-4 pb-1">
          <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{product.name}</p>
          {product.websiteDescription ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {product.websiteDescription}
            </p>
          ) : product.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {product.description}
            </p>
          ) : null}
        </div>
      </div>

      {/* Bottom Row: Price + Cart Quantity Controls */}
      <div className="p-3.5 sm:p-4 pt-2 border-t border-slate-100/60 dark:border-slate-700/60 mt-2 flex items-center justify-between gap-2">
        <p className="text-sm sm:text-base font-extrabold text-[var(--brand-600,#2563eb)]">
          {formatIQD(product.price)}
        </p>

        {quantity === 0 ? (
          <button
            type="button"
            onClick={handleAddOne}
            aria-label="زیادکردن بۆ سەبەتە"
            title="زیادکردن بۆ سەبەتە"
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-[var(--brand-500,#D4AF37)] hover:text-slate-950 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer dark:bg-slate-700/80 dark:text-slate-200 dark:hover:bg-[var(--brand-500,#D4AF37)] dark:hover:text-slate-950 shrink-0"
          >
            <Plus size={15} />
          </button>
        ) : (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs dark:border-slate-700 dark:bg-slate-900 shrink-0"
          >
            <button
              type="button"
              onClick={handleMinus}
              aria-label="کەمکردنەوە"
              className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Minus size={11} />
            </button>
            <span
              dir="ltr"
              className="min-w-[16px] text-center font-sans text-xs font-black text-slate-800 dark:text-slate-100"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={handlePlus}
              aria-label="زیادکردن"
              className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Plus size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (!slug) return card;

  return (
    <Link href={`/${slug}/product/${product.productId}`} className="block h-full">
      {card}
    </Link>
  );
}
