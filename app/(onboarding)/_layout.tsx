import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useBusinessStore } from '@/store/businessStore';
import { useHasHydrated } from '@/lib/useHasHydrated';

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
  // screen, so a transient mis-route during store rehydration can't turn into a
  // permanent stuck-on-login state. Suppressed while pendingCloudConflict is set —
  // a freshly signed-in account can leave `user` truthy and this device's *old*
  // account's isSetupComplete still true at the same time, which would otherwise
  // force this effect to redirect straight past the required conflict screen.
  useEffect(() => {
    if (!authHydrated || !onboardingHydrated || !businessHydrated) return;
    if (pendingCloudConflict) return;
    if (hasCompletedOnboarding && user && isSetupComplete) {
      router.replace('/(app)/dashboard');
    }
  }, [authHydrated, onboardingHydrated, businessHydrated, hasCompletedOnboarding, user, isSetupComplete, pendingCloudConflict]);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
  );
}
