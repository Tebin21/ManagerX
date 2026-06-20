import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useSettingsStore } from '@/store/settingsStore';
import { generateThemeColors } from '@/lib/colorUtils';
import { useHasHydrated } from '@/lib/useHasHydrated';

export default function Index() {
  const router = useRouter();
  const { hasCompletedOnboarding } = useOnboardingStore();
  const { user } = useAuthStore();
  const { isSetupComplete } = useBusinessStore();
  const authHydrated = useHasHydrated(useAuthStore);
  const onboardingHydrated = useHasHydrated(useOnboardingStore);
  const businessHydrated = useHasHydrated(useBusinessStore);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const bgColor = accentColor
    ? (generateThemeColors(accentColor, false).gradientStart ?? '#1E40AF') as string
    : '#1E40AF';

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

    if (!isSetupComplete) {
      router.replace('/(onboarding)/setup');
      return;
    }

    router.replace('/(app)/dashboard');
  }, [authHydrated, onboardingHydrated, businessHydrated, hasCompletedOnboarding, user, isSetupComplete]);

  // Always render visible content.  Returning null leaves a white screen
  // during the one-render gap between the effect firing and the target
  // route mounting.
  return (
    <View style={{ flex: 1, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}
