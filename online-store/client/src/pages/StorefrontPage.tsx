import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchStore, type StoreResponse } from '../lib/api';
import { ProductCard } from '../components/ProductCard';

type LoadState = 'loading' | 'ready' | 'not_found' | 'error';

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreResponse | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setState('loading');

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

  if (state === 'loading') return <CenteredMessage>Loading store…</CenteredMessage>;
  if (state === 'not_found') return <CenteredMessage>This store doesn't exist.</CenteredMessage>;
  if (state === 'error' || !store) {
    return <CenteredMessage>Something went wrong loading this store. Please try again.</CenteredMessage>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-10 text-center text-white shadow-card">
        <h1 className="text-2xl font-extrabold">{store.businessName}</h1>
        <p className="mt-1 text-sm text-white/80">Powered by ManagerX</p>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {!store.enabled ? (
          <CenteredMessage>This store is currently unavailable. Please check back later.</CenteredMessage>
        ) : store.products.length === 0 ? (
          <CenteredMessage>No products published yet. Check back soon!</CenteredMessage>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {store.products.map((p) => (
              <ProductCard key={p.productId} product={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
