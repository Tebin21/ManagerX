import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchStore, type StoreResponse } from '../lib/api';
import { StorefrontView } from '../components/StorefrontView';

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

  // Background refreshes (poll/focus) must never flip the UI back to a full-page
  // spinner — only the very first load does that. This just updates `store` in
  // place once new data arrives, so an already-open tab can pick up a synced
  // change without the visitor doing a manual reload.
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

  if (state === 'loading') return <CenteredMessage>Loading store…</CenteredMessage>;
  if (state === 'not_found') return <CenteredMessage>This store doesn't exist.</CenteredMessage>;
  if (state === 'error' || !store) {
    return <CenteredMessage>Something went wrong loading this store. Please try again.</CenteredMessage>;
  }

  return <StorefrontView store={store} />;
}
