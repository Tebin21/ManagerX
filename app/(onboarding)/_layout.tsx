import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useBusinessStore } from '@/store/businessStore';
import { useHasHydrated } from '@/lib/useHasHydrated';

import { DEV_FORCE_ONBOARDING_PREVIEW } from '@/constants/devPreview';

import { AuthInputContext } from '@/lib/autoEnglishDigits';

export default function OnboardingLayout() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const isSetupComplete = useBusinessStore((s) => s.isSetupComplete);
  const pendingCloudConflict = useBusinessStore((s) => s.pendingCloudConflict);
  const authHydrated = useHasHydrated(useAuthStore);
  const onboardingHydrated = useHasHydrated(useOnboardingStore);
  const businessHydrated = useHasHydrated(useBusinessStore);

  // Mirrors (app)/_layout.tsx's guard in the opposite direction: self-heals if a
  // valid session/setup state becomes available while sitting on any onboarding
  // screen. When DEV_FORCE_ONBOARDING_PREVIEW is true, bouncing is suspended so
  // developers can view and test onboarding freely.
  useEffect(() => {
    if (DEV_FORCE_ONBOARDING_PREVIEW) return;
    if (!authHydrated || !onboardingHydrated || !businessHydrated) return;
    if (pendingCloudConflict) return;
    if (hasCompletedOnboarding && user && isSetupComplete) {
      router.replace('/(app)/dashboard');
    }
  }, [authHydrated, onboardingHydrated, businessHydrated, hasCompletedOnboarding, user, isSetupComplete, pendingCloudConflict]);

  return (
    <AuthInputContext.Provider value={true}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </AuthInputContext.Provider>
  );
}
