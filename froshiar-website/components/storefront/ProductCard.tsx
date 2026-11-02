'use client';

import Link from 'next/link';
import { ImageOff, Plus, Check, ExternalLink } from 'lucide-react';
import type { StoreProduct } from '@/lib/storefront/storeApi';
import { formatIQD } from '@/lib/storefront/format';
import { useCart } from './CartContext';
import { useStoreLanguage } from './StoreLanguageContext';

interface Props {
  product: StoreProduct;
  slug?: string;
}

export function ProductCard({ product, slug }: Props) {
  const { isItemSelected, getItemQuantity, toggleSelect } = useCart();
  const { t } = useStoreLanguage();
  const selected = isItemSelected(product.productId);
  const quantity = getItemQuantity(product.productId);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSelect(product);
  };

  return (
    <div
      onClick={handleToggle}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white shadow-sm border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800 h-full cursor-pointer select-none text-start ${
        selected
          ? 'border-emerald-500 ring-2 ring-emerald-500/25 bg-emerald-50/[0.15] dark:border-emerald-500/80 dark:bg-emerald-950/20'
          : 'border-slate-200/80 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
      }`}
    >
      <div>
        {/* Product Image Box */}
        <div className="relative aspect-square bg-slate-100 dark:bg-slate-900 overflow-hidden">
          {product.category && (
            <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 shadow-xs backdrop-blur-sm dark:bg-slate-800 dark:text-slate-200">
              {product.category}
            </span>
          )}

          {/* Selected Checkmark Badge */}
          {selected && (
            <span className="absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md animate-in zoom-in-75 duration-200">
              <Check size={16} strokeWidth={3} />
            </span>
          )}

          {/* Optional Details Link Icon */}
          {slug && (
            <Link
              href={`/${slug}/product/${product.productId}`}
              onClick={(e) => e.stopPropagation()}
              title="Info"
              aria-label="Product info"
              className="absolute left-2.5 bottom-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 hover:scale-105"
            >
              <ExternalLink size={13} />
            </Link>
          )}

          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${
                selected ? 'brightness-95' : ''
              }`}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
              <ImageOff size={28} />
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>

        {/* Text Info */}
        <div className="p-3.5 sm:p-4 pb-1">
          <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
            {product.name}
          </p>
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

      {/* Bottom Row: Price + Selection Toggle Button */}
      <div className="p-3.5 sm:p-4 pt-2 border-t border-slate-100/70 dark:border-slate-700/70 mt-2 flex items-center justify-between gap-2">
        <p className="text-sm sm:text-base font-extrabold text-[var(--brand-600,#2563eb)]">
          {formatIQD(product.price)}
        </p>

        <button
          type="button"
          onClick={handleToggle}
          aria-label={selected ? t('inCart') : t('addToCart')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0 ${
            selected
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
              : 'bg-slate-100 text-slate-700 hover:bg-[var(--brand-500,#D4AF37)] hover:text-slate-950 dark:bg-slate-700/80 dark:text-slate-200 dark:hover:bg-[var(--brand-500,#D4AF37)] dark:hover:text-slate-950'
          }`}
        >
          {selected ? (
            <>
              <Check size={13} strokeWidth={2.5} />
              <span>{t('inCart')} {quantity > 1 ? `(${quantity})` : ''}</span>
            </>
          ) : (
            <>
              <Plus size={13} strokeWidth={2.5} />
              <span>{t('addToCart')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
