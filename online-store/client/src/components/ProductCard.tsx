import { ImageOff } from 'lucide-react';
import type { StoreProduct } from '../lib/api';
import { formatIQD } from '../lib/format';

// View-only catalog tile — no purchasing affordance of any kind.
export function ProductCard({ product }: { product: StoreProduct }) {
  return (
    <div className="group overflow-hidden rounded-2xl bg-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-square bg-slate-100">
        {product.category && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm backdrop-blur-sm">
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
          <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-300">
            <ImageOff size={28} />
            <span className="text-xs">No image</span>
          </div>
        )}
      </div>
      <div className="p-3.5">
        <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
        {product.websiteDescription && (
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-500">{product.websiteDescription}</p>
        )}
        <p className="mt-2 text-base font-bold text-brand-600">{formatIQD(product.price)}</p>
      </div>
    </div>
  );
}
