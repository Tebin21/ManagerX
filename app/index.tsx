import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useSettingsStore } from '@/store/settingsStore';
import { generateThemeColors } from '@/lib/colorUtils';
import { useHasHydrated } from '@/lib/useHasHydrated';
import { Colors } from '@/constants/colors';
import { Text } from '@/components/ui/AppText';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT_REGULAR } from '@/lib/settingsFont';

import { DEV_FORCE_ONBOARDING_PREVIEW } from '@/constants/devPreview';

// Bound how long cold start reconciliation waits before routing
const RECONCILE_TIMEOUT_MS = 10_000;
// Minimum splash duration so the user sees the Froshiar logo entrance smoothly
const MIN_SPLASH_DURATION_MS = 1200;

export default function Index() {
  const router = useRouter();
  const { hasCompletedOnboarding } = useOnboardingStore();
  const { user, pendingVerificationEmail } = useAuthStore();
  const { isSetupComplete, pendingCloudConflict, isReconciling } = useBusinessStore();
  const authHydrated = useHasHydrated(useAuthStore);
  const onboardingHydrated = useHasHydrated(useOnboardingStore);
  const businessHydrated = useHasHydrated(useBusinessStore);
  const accentColor = useSettingsStore((s) => s.accentColor);

  const [splashReady, setSplashReady] = useState(false);
  const reconcileTriggeredRef = useRef(false);

  // Guarantee the user sees the beautiful splash logo animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashReady(true);
    }, MIN_SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

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
    if (!splashReady || !authHydrated || !onboardingHydrated || !businessHydrated) return;

    // While preview mode is active, directly open onboarding to preview design
    if (DEV_FORCE_ONBOARDING_PREVIEW) {
      router.replace('/(onboarding)/welcome');
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
  }, [splashReady, authHydrated, onboardingHydrated, businessHydrated, hasCompletedOnboarding, user, pendingVerificationEmail, isSetupComplete, pendingCloudConflict, isReconciling]);

  return (
    <View style={styles.splashContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      <View style={styles.centerBox}>
        {/* Animated Froshiar Logo */}
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 120, delay: 150 }}
          style={styles.logoCard}
        >
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </MotiView>

        {/* Animated Froshiar Name */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 16, stiffness: 130, delay: 350 }}
          style={styles.textBlock}
        >
          <Text style={styles.appName}>فرۆشیار</Text>
          <Text style={styles.appTagline}>سیستەمی ژیرانەی بەڕێوەبردن</Text>
        </MotiView>
      </View>

      {/* Sleek bottom loader */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 500, duration: 400 }}
        style={styles.bottomLoader}
      >
        <ActivityIndicator size="small" color="#D4AF37" />
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#0B1120',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCard: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 20,
  },
  logo: {
    width: 82,
    height: 82,
  },
  textBlock: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 40,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    color: '#D4AF37',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(212, 175, 55, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  appTagline: {
    fontSize: 15,
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    color: '#94A3B8',
    marginTop: 6,
  },
  bottomLoader: {
    position: 'absolute',
    bottom: 50,
  },
});

