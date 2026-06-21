import type { StoreProduct } from '../lib/api';

export function ProductCard({ product }: { product: StoreProduct }) {
  const outOfStock = product.availability === 'out_of_stock';

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card">
      <div className="relative aspect-square bg-slate-100">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-300">No image</div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
              Out of Stock
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
        <p className="mt-1 text-sm font-bold text-brand-600">{product.price.toLocaleString()} IQD</p>
      </div>
    </div>
  );
}
