import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useSettingsStore } from '@/store/settingsStore';
import { generateThemeColors } from '@/lib/colorUtils';
import { useHasHydrated } from '@/lib/useHasHydrated';
import { Colors } from '@/constants/colors';

export default function Index() {
  const router = useRouter();
  const { hasCompletedOnboarding } = useOnboardingStore();
  const { user } = useAuthStore();
  const { isSetupComplete, pendingCloudConflict } = useBusinessStore();
  const authHydrated = useHasHydrated(useAuthStore);
  const onboardingHydrated = useHasHydrated(useOnboardingStore);
  const businessHydrated = useHasHydrated(useBusinessStore);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const bgColor = accentColor
    ? (generateThemeColors(accentColor, false).gradientStart ?? Colors.gradientStart) as string
    : Colors.gradientStart;

  useEffect(() => {
    if (!authHydrated || !onboardingHydrated || !businessHydrated) return;

    if (!hasCompletedOnboarding) {
      router.replace('/(onboarding)/welcome');
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

    if (!isSetupComplete) {
      router.replace('/(onboarding)/setup');
      return;
    }

    router.replace('/(app)/dashboard');
  }, [authHydrated, onboardingHydrated, businessHydrated, hasCompletedOnboarding, user, isSetupComplete, pendingCloudConflict]);

  // Always render visible content.  Returning null leaves a white screen
  // during the one-render gap between the effect firing and the target
  // route mounting.
  return (
    <View style={{ flex: 1, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}
