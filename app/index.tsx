import { ActivityIndicator, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useSettingsStore } from '@/store/settingsStore';
import { generateThemeColors } from '@/lib/colorUtils';
import { useHasHydrated } from '@/lib/useHasHydrated';
import { Colors } from '@/constants/colors';

// UI-side backstop only — reconcileColdStart() itself always resolves (it never
// throws past its own try/catch), this just bounds how long the loading screen
// below can wait on it before falling through to routing on whatever state
// landed, so a hung network call on a slow/flaky first connection can't leave
// the user stuck forever (offline-first: the app must stay usable without a
// network at all).
const RECONCILE_TIMEOUT_MS = 10_000;

export default function Index() {
  const router = useRouter();
  const { hasCompletedOnboarding } = useOnboardingStore();
  const { user, pendingVerificationEmail } = useAuthStore();
  const { isSetupComplete, pendingCloudConflict, isReconciling } = useBusinessStore();
  const authHydrated = useHasHydrated(useAuthStore);
  const onboardingHydrated = useHasHydrated(useOnboardingStore);
  const businessHydrated = useHasHydrated(useBusinessStore);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const bgColor = accentColor
    ? (generateThemeColors(accentColor, false).gradientStart ?? Colors.gradientStart) as string
    : Colors.gradientStart;

  const reconcileTriggeredRef = useRef(false);

  // Fires once per cold start (not on every foreground — this component only
  // remounts on a true JS-engine restart) once we know whether a session was
  // persisted. Kicks off store/authStore.ts's reconcileColdStart(), which
  // itself flips businessStore.isReconciling around the call — the routing
  // effect below holds on the loading screen instead of showing "Create
  // Business" while that's true for the ambiguous (persisted user, empty
  // local business) case; the common case (isSetupComplete already true) is
  // short-circuited before isReconciling is even consulted, so most cold
  // starts see zero added delay.
  useEffect(() => {
    if (!authHydrated || !businessHydrated || reconcileTriggeredRef.current) return;
    reconcileTriggeredRef.current = true;
    if (!user) return;
    (async () => {
      const { reconcileColdStart } = await import('@/store/authStore');
      await Promise.race([
        reconcileColdStart(),
        new Promise((resolve) => setTimeout(resolve, RECONCILE_TIMEOUT_MS)),
      ]);
    })();
  }, [authHydrated, businessHydrated, user]);

  useEffect(() => {
    if (!authHydrated || !onboardingHydrated || !businessHydrated) return;

    if (!hasCompletedOnboarding) {
      router.replace('/(onboarding)/welcome');
      return;
    }

    // A created-or-logged-in-but-unverified session: `user` stays null the whole
    // time (adoptSignedInUser is withheld until verified), so this must be
    // checked before the `!user` branch below or it would just bounce to Login.
    if (pendingVerificationEmail) {
      router.replace('/(onboarding)/verify-email' as never);
      return;
    }

    if (!user) {
      router.replace('/(onboarding)/login');
      return;
    }

    // The newly signed-in account's data can't be safely auto-merged with what's
    // already on this device — block entry to onboarding/setup and the app shell
    // alike until the user resolves it (see store/businessStore.ts's doc comment).
    if (pendingCloudConflict) {
      router.replace('/(onboarding)/cloud-data-conflict' as never);
      return;
    }

    // A returning account whose local business data hasn't landed yet (new
    // device, reinstall, or a cloud restore still in flight) must not flash
    // the "Create Business" screen — hold here on the loading spinner until
    // reconcileColdStart() resolves one way or the other. isSetupComplete
    // already true (the common case, most cold starts) skips this check
    // entirely and never waits.
    if (!isSetupComplete && isReconciling) return;

    if (!isSetupComplete) {
      router.replace('/(onboarding)/setup');
      return;
    }

    router.replace('/(app)/dashboard');
  }, [authHydrated, onboardingHydrated, businessHydrated, hasCompletedOnboarding, user, pendingVerificationEmail, isSetupComplete, pendingCloudConflict, isReconciling]);

  // Always render visible content.  Returning null leaves a white screen
  // during the one-render gap between the effect firing and the target
  // route mounting.
  return (
    <View style={{ flex: 1, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}
