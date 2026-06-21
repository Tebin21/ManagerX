import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../cart/CartContext';
import { fetchStore, type StoreResponse } from '../lib/api';
import { buildWhatsAppOrderMessage, buildWhatsAppUrl } from '../lib/whatsapp';
import { formatIQD } from '../lib/format';

export function CartPage() {
  const { slug } = useParams<{ slug: string }>();
  const { items, subtotal, setQuantity, removeItem, reconcileStock } = useCart();
  const [store, setStore] = useState<StoreResponse | null>(null);
  const [adjustedNotice, setAdjustedNotice] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    if (!slug) return;
    fetchStore(slug)
      .then((data) => {
        setStore(data);
        if (data) setAdjustedNotice(reconcileStock(data.products));
      })
      .catch(() => {});
    // Only re-run when the slug changes — reconcileStock is intentionally called once
    // per fetch, not on every items/reconcileStock identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // No separate WhatsApp number field — the business phone doubles as the WhatsApp
  // ordering number.
  const whatsappPhone = store?.info.phone;
  const hasStockBlock = items.some((item) => item.quantity > item.stock || item.stock <= 0);

  function handleOrderViaWhatsApp() {
    if (!whatsappPhone || !store || hasStockBlock) return;
    const message = buildWhatsAppOrderMessage(items, store.businessName, customerName, customerPhone);
    window.open(buildWhatsAppUrl(whatsappPhone, message), '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-white px-4 py-4 shadow-card">
        <Link to={`/${slug}`} className="text-slate-500 hover:text-slate-700" aria-label="Back to store">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-slate-800">Your Cart</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-slate-400">
            <ShoppingBag size={40} />
            <p className="text-sm">Your cart is empty.</p>
            <Link to={`/${slug}`} className="text-sm font-semibold text-brand-600 hover:underline">
              Browse products
            </Link>
          </div>
        ) : (
          <>
            {adjustedNotice && (
              <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
                Some quantities were adjusted to match current availability.
              </div>
            )}

            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                    <p className="text-sm font-bold text-brand-600">{formatIQD(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.productId, item.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      title={item.quantity >= item.stock ? 'Maximum available quantity reached' : undefined}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="text-slate-300 hover:text-red-500"
                    aria-label="Remove item"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-white p-4 shadow-card">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">{formatIQD(subtotal)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-base font-bold text-slate-800">
                <span>Total</span>
                <span className="text-brand-600">{formatIQD(subtotal)}</span>
              </div>
            </div>

            {whatsappPhone && (
              <div className="mt-6 rounded-2xl bg-white p-4 shadow-card">
                <p className="mb-3 text-sm font-semibold text-slate-700">Your details (optional)</p>
                <input
                  type="text"
                  placeholder="Your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
                <input
                  type="tel"
                  placeholder="Your phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
            )}

            {whatsappPhone ? (
              <button
                type="button"
                onClick={handleOrderViaWhatsApp}
                disabled={hasStockBlock}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white shadow-card transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                Order via WhatsApp
              </button>
            ) : (
              <p className="mt-6 text-center text-xs text-slate-400">
                This store hasn't set up WhatsApp ordering yet.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
