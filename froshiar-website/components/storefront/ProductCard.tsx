'use client';

import Link from 'next/link';
import { ImageOff, Plus, Check } from 'lucide-react';
import type { StoreProduct } from '@/lib/storefront/storeApi';
import { formatIQD } from '@/lib/storefront/format';
import { useCart } from './CartContext';

interface Props {
  product: StoreProduct;
  slug?: string;
}

export function ProductCard({ product, slug }: Props) {
  const { isItemSelected, getItemQuantity, toggleSelect } = useCart();
  const selected = isItemSelected(product.productId);
  const quantity = getItemQuantity(product.productId);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSelect(product);
  };

  const card = (
    <div
      className={`group flex flex-col justify-between overflow-hidden rounded-2xl bg-white shadow-sm border transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800 h-full ${
        selected
          ? 'border-emerald-500/60 ring-2 ring-emerald-500/20 dark:border-emerald-500/60'
          : 'border-slate-100 dark:border-slate-700'
      }`}
    >
      <div>
        <div className="relative aspect-square bg-slate-100 dark:bg-slate-900">
          {product.category && (
            <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 shadow-xs backdrop-blur-sm dark:bg-slate-800 dark:text-slate-200">
              {product.category}
            </span>
          )}

          {/* Selected Checkmark Badge on Top-Right */}
          {selected && (
            <span className="absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md animate-in zoom-in-75 duration-200">
              <Check size={14} strokeWidth={3} />
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

      {/* Bottom Row: Price + Clean Selection Button */}
      <div className="p-3.5 sm:p-4 pt-2 border-t border-slate-100/60 dark:border-slate-700/60 mt-2 flex items-center justify-between gap-2">
        <p className="text-sm sm:text-base font-extrabold text-[var(--brand-600,#2563eb)]">
          {formatIQD(product.price)}
        </p>

        <button
          type="button"
          onClick={handleToggle}
          aria-label={selected ? 'لابردنی کاڵا لە سەبەتە' : 'زیادکردن بۆ سەبەتە'}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0 ${
            selected
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
              : 'bg-slate-100 text-slate-700 hover:bg-[var(--brand-500,#D4AF37)] hover:text-slate-950 dark:bg-slate-700/80 dark:text-slate-200 dark:hover:bg-[var(--brand-500,#D4AF37)] dark:hover:text-slate-950'
          }`}
        >
          {selected ? (
            <>
              <Check size={13} strokeWidth={2.5} />
              <span>هەڵبژێردرا {quantity > 1 ? `(${quantity})` : ''}</span>
            </>
          ) : (
            <>
              <Plus size={13} strokeWidth={2.5} />
              <span>زیادکردن</span>
            </>
          )}
        </button>
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
