import { useEffect, useState } from 'react';

interface PersistApi {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (cb: () => void) => () => void;
  };
}

export function useHasHydrated(store: PersistApi): boolean {
  const [hydrated, setHydrated] = useState(() => store.persist.hasHydrated());

  useEffect(() => {
    if (store.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return store.persist.onFinishHydration(() => setHydrated(true));
  }, [store]);

  return hydrated;
}
