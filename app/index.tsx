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

  const [reconcileFinished, setReconcileFinished] = React.useState(false);
  const reconcileTriggeredRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  // Cold-start background sync reconciliation
  useEffect(() => {
    if (!authHydrated || !businessHydrated || reconcileTriggeredRef.current) return;
    reconcileTriggeredRef.current = true;
    if (!user) {
      setReconcileFinished(true);
      return;
    }

    (async () => {
      const { useBusinessStore } = await import('@/store/businessStore');
      useBusinessStore.getState().setReconciling(true);
      try {
        const { reconcileColdStart } = await import('@/store/authStore');
        await Promise.race([
          reconcileColdStart(),
          new Promise((resolve) => setTimeout(resolve, RECONCILE_TIMEOUT_MS)),
        ]);
      } catch (err) {
        console.warn('[Index] Cold start reconcile error:', err);
      } finally {
        useBusinessStore.getState().setReconciling(false);
        setReconcileFinished(true);
      }
    })();
  }, [authHydrated, businessHydrated, user]);

  const navigateToDestination = () => {
    // While preview mode is active, directly open onboarding to preview design
    if (DEV_FORCE_ONBOARDING_PREVIEW) {
      router.replace('/(onboarding)/welcome' as never);
      return;
    }

    if (user) {
      if (!hasCompletedOnboarding) {
        useOnboardingStore.getState().completeOnboarding();
      }

      if (pendingVerificationEmail) {
        router.replace('/(onboarding)/verify-email' as never);
        return;
      }

      if (pendingCloudConflict) {
        router.replace('/(onboarding)/cloud-data-conflict' as never);
        return;
      }

      if (!isSetupComplete) {
        const { useManagementStore } = require('@/store/managementStore');
        const isEmployee = useManagementStore.getState().isEmployee;
        if (!isEmployee) {
          router.replace('/(onboarding)/setup' as never);
          return;
        }
      }

      router.replace('/(app)/dashboard');
      return;
    }

    // User is NOT logged in
    if (!hasCompletedOnboarding) {
      router.replace('/(onboarding)/welcome');
      return;
    }

    router.replace('/(onboarding)/login');
  };

  // As soon as hydration & state checks are ready, navigate to destination underneath the splash overlay
  useEffect(() => {
    if (!authHydrated || !onboardingHydrated || !businessHydrated) return;
    // CRITICAL: If an existing user session is recognized on cold-start, wait completely
    // for cold start reconciliation to finish. Navigating early causes the setup screen
    // to flash and results in navigation lockup glitches.
    if (user && !reconcileFinished) return;

    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    navigateToDestination();
  }, [
    authHydrated,
    onboardingHydrated,
    businessHydrated,
    user,
    reconcileFinished,
    isSetupComplete,
    isReconciling,
    pendingCloudConflict,
    pendingVerificationEmail,
    hasCompletedOnboarding,
  ]);

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
