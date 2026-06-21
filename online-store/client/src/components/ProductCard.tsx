import { ImageOff, Plus, Check } from 'lucide-react';
import { useState } from 'react';
import type { StoreProduct } from '../lib/api';
import { useCart } from '../cart/CartContext';

export function ProductCard({ product }: { product: StoreProduct }) {
  const outOfStock = product.availability === 'out_of_stock';
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  function handleAddToCart() {
    addItem({ productId: product.productId, name: product.name, price: product.price, imageUrl: product.imageUrl });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <div className="group overflow-hidden rounded-2xl bg-white shadow-card transition hover:shadow-lg">
      <div className="relative aspect-square bg-slate-100">
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
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-brand-600">{product.price.toLocaleString()} IQD</p>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={outOfStock}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
              outOfStock
                ? 'cursor-not-allowed bg-slate-100 text-slate-300'
                : justAdded
                ? 'bg-emerald-500 text-white'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
            aria-label="Add to cart"
          >
            {justAdded ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
