import { ImageOff, Plus, Check } from 'lucide-react';
import { useState } from 'react';
import type { StoreProduct } from '../lib/api';
import { useCart } from '../cart/CartContext';
import { formatIQD } from '../lib/format';

export function ProductCard({ product }: { product: StoreProduct }) {
  const outOfStock = product.availability === 'out_of_stock';
  const { items, addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const inCartQty = items.find((i) => i.productId === product.productId)?.quantity ?? 0;
  const atStockLimit = !outOfStock && inCartQty >= product.quantity;

  function handleAddToCart() {
    if (outOfStock || atStockLimit) return;
    addItem({
      productId: product.productId,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      stock: product.quantity,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  const addDisabled = outOfStock || atStockLimit;

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
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
              Out of Stock
            </span>
          </div>
        )}
      </div>
      <div className="p-3.5">
        <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-base font-bold text-brand-600">{formatIQD(product.price)}</p>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={addDisabled}
            title={atStockLimit ? 'Maximum available quantity already in cart' : undefined}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
              addDisabled
                ? 'cursor-not-allowed bg-slate-100 text-slate-300'
                : justAdded
                ? 'bg-emerald-500 text-white'
                : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-95'
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
