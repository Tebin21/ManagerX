import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff } from 'lucide-react';
import { fetchStore, type StoreResponse } from '../lib/api';
import { getBrandCssVars } from '../lib/theme';
import { formatIQD } from '../lib/format';

type LoadState = 'loading' | 'ready' | 'not_found' | 'error';

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

// Single-product view — reuses the same fetchStore(slug) call as StorefrontPage (no
// dedicated single-product endpoint exists) and finds the product client-side.
export function ProductDetailsPage() {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const [store, setStore] = useState<StoreResponse | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  // Mirrors StorefrontPage.tsx's refresh() — background polls/focus refetches must never
  // flip the UI back to a full-page spinner once it has loaded.
  const refresh = useCallback(() => {
    if (!slug) return () => {};
    let cancelled = false;
    fetchStore(slug)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setState('not_found');
          return;
        }
        setStore(data);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    setState('loading');
    return refresh();
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 30_000);
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, [refresh]);

  const product = useMemo(() => {
    if (!store || !productId) return undefined;
    return store.products.find((p) => p.productId === Number(productId));
  }, [store, productId]);

  const brandStyle = useMemo(
    () => (store ? getBrandCssVars(store.info.themeColor) : undefined),
    [store]
  );

  if (state === 'loading') return <CenteredMessage>Loading product…</CenteredMessage>;
  if (state === 'not_found') return <CenteredMessage>This product doesn't exist.</CenteredMessage>;
  if (state === 'error' || !store) {
    return <CenteredMessage>Something went wrong loading this product. Please try again.</CenteredMessage>;
  }
  if (!product) return <CenteredMessage>This product doesn't exist.</CenteredMessage>;

  return (
    <div className="min-h-screen bg-slate-50" style={brandStyle}>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link
          to={`/${slug}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:text-brand-700"
        >
          <ArrowLeft size={16} /> Back to store
        </Link>

        <div className="overflow-hidden rounded-2xl bg-white shadow-card">
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
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-300">
                <ImageOff size={36} />
                <span className="text-xs">No image</span>
              </div>
            )}
          </div>

          <div className="p-3.5">
            <h1 className="text-base font-semibold text-slate-800">{product.name}</h1>

            {product.websiteDescription && (
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-500">
                {product.websiteDescription}
              </p>
            )}

            <p className="mt-3 text-base font-bold text-brand-600">{formatIQD(product.price)}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
