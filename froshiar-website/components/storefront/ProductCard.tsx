import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import type { StoreProduct } from '@/lib/storefront/storeApi';
import { formatIQD } from '@/lib/storefront/format';

interface Props {
  product: StoreProduct;
  slug?: string;
}

export function ProductCard({ product, slug }: Props) {
  const card = (
    <div className="group overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100 transition duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-slate-800 dark:border-slate-700">
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
      <div className="p-4">
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
        <p className="mt-3 text-base font-extrabold text-[var(--brand-600,#2563eb)]">
          {formatIQD(product.price)}
        </p>
      </div>
    </div>
  );

  if (!slug) return card;

  return (
    <Link href={`/${slug}/product/${product.productId}`} className="block">
      {card}
    </Link>
  );
}
