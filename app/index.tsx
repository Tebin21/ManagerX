import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useHasHydrated } from '@/lib/useHasHydrated';
import { useResponsive } from '@/hooks/useResponsive';

import { DEV_FORCE_ONBOARDING_PREVIEW } from '@/constants/devPreview';

// Bound how long cold start reconciliation waits before routing
const RECONCILE_TIMEOUT_MS = 10_000;

const TOTAL_SPLASH_MS = 4000; // 4 seconds total as requested
const START_TYPING_MS = 600;  // Logo appears immediately; typing begins cleanly after 600ms
const TYPING_DURATION_MS = 2000; // All 3 lines type simultaneously across 2.0s

const KURDISH_TEXT = 'لەگەڵ فرۆشیار، فرۆشتنەکەت ئاسانتر بکە';
const ENGLISH_TEXT = 'With Froshiar, make your selling easier';
const ARABIC_TEXT = 'مع فروشيار، اجعل مبيعاتك أسهل';

export default function Index() {
  const router = useRouter();
  const { isTablet } = useResponsive();
  const { hasCompletedOnboarding } = useOnboardingStore();
  const { user, pendingVerificationEmail } = useAuthStore();
  const { isSetupComplete, pendingCloudConflict, isReconciling } = useBusinessStore();
  const authHydrated = useHasHydrated(useAuthStore);
  const onboardingHydrated = useHasHydrated(useOnboardingStore);
  const businessHydrated = useHasHydrated(useBusinessStore);

  const reconcileTriggeredRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  // Animation states: all 3 lines type in parallel
  const [kurdish, setKurdish] = useState('');
  const [english, setEnglish] = useState('');
  const [arabic, setArabic] = useState('');
  const [splashFinished, setSplashFinished] = useState(false);

  // Cold-start background sync reconciliation
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

  // High-precision simultaneous typing loop for all 3 lines (4 seconds total)
  useEffect(() => {
    const startTime = Date.now();
    let timerDone = false;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;

      if (elapsed < START_TYPING_MS) {
        setKurdish('');
        setEnglish('');
        setArabic('');
      } else if (elapsed < START_TYPING_MS + TYPING_DURATION_MS) {
        // Parallel progress 0.0 -> 1.0: all 3 lines type simultaneously at once
        const progress = Math.min(1, (elapsed - START_TYPING_MS) / TYPING_DURATION_MS);

        const kCount = Math.min(
          KURDISH_TEXT.length,
          Math.max(1, Math.floor(progress * KURDISH_TEXT.length))
        );
        const eCount = Math.min(
          ENGLISH_TEXT.length,
          Math.max(1, Math.floor(progress * ENGLISH_TEXT.length))
        );
        const aCount = Math.min(
          ARABIC_TEXT.length,
          Math.max(1, Math.floor(progress * ARABIC_TEXT.length))
        );

        setKurdish(KURDISH_TEXT.slice(0, kCount));
        setEnglish(ENGLISH_TEXT.slice(0, eCount));
        setArabic(ARABIC_TEXT.slice(0, aCount));
      } else {
        // Finished typing, held clearly on screen until 4.0s
        setKurdish(KURDISH_TEXT);
        setEnglish(ENGLISH_TEXT);
        setArabic(ARABIC_TEXT);
      }

      if (elapsed >= TOTAL_SPLASH_MS) {
        if (!timerDone) {
          timerDone = true;
          clearInterval(interval);
          setSplashFinished(true);
        }
      }
    }, 25);

    return () => {
      clearInterval(interval);
    };
  }, []);

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

  // When 4-second splash is complete and app state is hydrated, enter app directly
  useEffect(() => {
    if (!splashFinished) return;
    if (!authHydrated || !onboardingHydrated || !businessHydrated) return;
    if (user && !isSetupComplete && isReconciling) return;

    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    navigateToDestination();
  }, [
    splashFinished,
    authHydrated,
    onboardingHydrated,
    businessHydrated,
    user,
    isSetupComplete,
    isReconciling,
    pendingCloudConflict,
    pendingVerificationEmail,
    hasCompletedOnboarding,
  ]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.centerContent}>
        {/* Large Froshiar 'F' Logo (centered and elevated slightly above vertical center) */}
        <Image
          source={require('@/assets/images/logo.png')}
          style={[
            styles.logo,
            {
              width: isTablet ? 280 : 205,
              height: isTablet ? 280 : 205,
            },
          ]}
          fadeDuration={0}
          resizeMode="contain"
        />

        {/* Centered 3-Language Typings with larger fonts & clear visibility */}
        <View style={[styles.textBlock, { maxWidth: isTablet ? 640 : 400 }]}>
          {/* 1. Kurdish - Centered */}
          <View style={styles.lineSlot}>
            <Text
              style={[
                styles.kurdishText,
                isTablet && styles.kurdishTextTablet,
              ]}
              numberOfLines={1}
            >
              {kurdish}
            </Text>
          </View>

          {/* 2. English - Centered */}
          <View style={styles.lineSlot}>
            <Text
              style={[
                styles.englishText,
                isTablet && styles.englishTextTablet,
              ]}
              numberOfLines={1}
            >
              {english}
            </Text>
          </View>

          {/* 3. Arabic - Centered */}
          <View style={styles.lineSlot}>
            <Text
              style={[
                styles.arabicText,
                isTablet && styles.arabicTextTablet,
              ]}
              numberOfLines={1}
            >
              {arabic}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 55, // Elevated slightly above center as requested
    paddingHorizontal: 20,
  },
  logo: {
    marginBottom: 28,
  },
  textBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  lineSlot: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kurdishText: {
    color: '#FFFFFF',
    fontFamily: 'BahijJanna-Bold',
    fontSize: 19.5,
    lineHeight: 30,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  kurdishTextTablet: {
    fontSize: 26,
    lineHeight: 38,
  },
  englishText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 16.5,
    lineHeight: 26,
    textAlign: 'center',
    writingDirection: 'ltr',
    letterSpacing: 0.3,
  },
  englishTextTablet: {
    fontSize: 22,
    lineHeight: 32,
  },
  arabicText: {
    color: '#FFFFFF',
    fontFamily: 'BahijJanna-Bold',
    fontSize: 19.5,
    lineHeight: 30,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  arabicTextTablet: {
    fontSize: 26,
    lineHeight: 38,
  },
});
