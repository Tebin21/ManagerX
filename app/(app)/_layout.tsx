import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useRTL } from '@/lib/rtl';
import { useAuthStore } from '@/store/authStore';
import { useHasHydrated } from '@/lib/useHasHydrated';
import { useOnlineStoreStore } from '@/store/onlineStoreStore';
import { startAutoSync } from '@/lib/onlineStore/syncEngine';
import { useOnlineStoreSubscriptionStore } from '@/store/onlineStoreSubscriptionStore';
import { runLegacyMigrationCheckOnce } from '@/lib/onlineStoreSubscription/subscription';
import { useBusinessStore } from '@/store/businessStore';

export default function AppLayout() {
  const { isRTL } = useRTL();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isDeletingAccount = useAuthStore((s) => s.isDeletingAccount);
  const authHydrated = useHasHydrated(useAuthStore);
  const pendingCloudConflict = useBusinessStore((s) => s.pendingCloudConflict);

  // Guards every screen under (app) — dashboard, inventory, sales, purchases,
  // reports, settings, and all other business modules. If the Google session
  // is missing or expires while inside the app, bounce back to Login.
  // Suppressed during Delete Account (isDeletingAccount) — Firebase's
  // deleteUser() can flip `user` to null via onAuthStateChanged before the
  // rest of that flow's local cleanup finishes; without this guard, this
  // effect would yank the Settings screen out from under it mid-flight.
  // Also bounces to the cloud-data-conflict screen if a sign-in just detected
  // an unresolved local-vs-cloud data conflict (see store/businessStore.ts) —
  // the app shell must not be reachable until the user resolves it.
  useEffect(() => {
    if (!authHydrated || isDeletingAccount) return;
    if (!user) {
      router.replace('/(onboarding)/login');
    } else if (pendingCloudConflict) {
      router.replace('/(onboarding)/cloud-data-conflict' as never);
    }
  }, [authHydrated, user, isDeletingAccount, pendingCloudConflict]);

  // Online Store auto-sync — starts the NetInfo/AppState listeners once and loads
  // the current store status so the dashboard card has data immediately.
  useEffect(() => {
    if (!user) return;
    startAutoSync();
    useOnlineStoreStore.getState().load();
    runLegacyMigrationCheckOnce().finally(() => {
      useOnlineStoreSubscriptionStore.getState().loadSubscription();
    });
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
