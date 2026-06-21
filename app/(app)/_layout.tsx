import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useRTL } from '@/lib/rtl';
import { useAuthStore } from '@/store/authStore';
import { useHasHydrated } from '@/lib/useHasHydrated';
import { useOnlineStoreStore } from '@/store/onlineStoreStore';
import { startAutoSync } from '@/lib/onlineStore/syncEngine';

export default function AppLayout() {
  const { isRTL } = useRTL();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authHydrated = useHasHydrated(useAuthStore);

  // Guards every screen under (app) — dashboard, inventory, sales, purchases,
  // reports, settings, and all other business modules. If the Google session
  // is missing or expires while inside the app, bounce back to Login.
  useEffect(() => {
    if (authHydrated && !user) {
      router.replace('/(onboarding)/login');
    }
  }, [authHydrated, user]);

  // Online Store auto-sync — starts the NetInfo/AppState listeners once and loads
  // the current store status so the dashboard card has data immediately.
  useEffect(() => {
    if (!user) return;
    startAutoSync();
    useOnlineStoreStore.getState().load();
  }, [user]);

  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: isRTL ? 'slide_from_left' : 'slide_from_right',
        }}
      />
    </ErrorBoundary>
  );
}
