import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useHasHydrated } from '@/lib/useHasHydrated';

import { DEV_FORCE_ONBOARDING_PREVIEW } from '@/constants/devPreview';

// Bound how long cold start reconciliation waits before routing
const RECONCILE_TIMEOUT_MS = 10_000;

export default function Index() {
  const router = useRouter();
  const { hasCompletedOnboarding } = useOnboardingStore();
  const { user, pendingVerificationEmail } = useAuthStore();
  const { isSetupComplete, pendingCloudConflict, isReconciling } = useBusinessStore();
  const authHydrated = useHasHydrated(useAuthStore);
  const onboardingHydrated = useHasHydrated(useOnboardingStore);
  const businessHydrated = useHasHydrated(useBusinessStore);

  const reconcileTriggeredRef = useRef(false);

  // Fires once per cold start
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
      const { useBusinessStore } = await import('@/store/businessStore');
      useBusinessStore.getState().setReconciling(false);
    })();
  }, [authHydrated, businessHydrated, user]);

  useEffect(() => {
    if (!authHydrated || !onboardingHydrated || !businessHydrated) return;

    // While preview mode is active, directly open onboarding to preview design
    if (DEV_FORCE_ONBOARDING_PREVIEW) {
      router.replace('/(onboarding)/welcome' as never);
      return;
    }

    if (!hasCompletedOnboarding) {
      router.replace('/(onboarding)/welcome');
      return;
    }

    if (pendingVerificationEmail) {
      router.replace('/(onboarding)/verify-email' as never);
      return;
    }

    if (!user) {
      router.replace('/(onboarding)/welcome');
      return;
    }

    if (pendingCloudConflict) {
      router.replace('/(onboarding)/cloud-data-conflict' as never);
      return;
    }

    if (!isSetupComplete && isReconciling) return;

    if (!isSetupComplete) {
      router.replace('/(onboarding)/setup');
      return;
    }

    router.replace('/(app)/dashboard');
  }, [authHydrated, onboardingHydrated, businessHydrated, hasCompletedOnboarding, user, pendingVerificationEmail, isSetupComplete, pendingCloudConflict, isReconciling]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

