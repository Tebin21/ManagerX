import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useSettingsStore } from '@/store/settingsStore';
import { generateThemeColors } from '@/lib/colorUtils';

export default function Index() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { user, isDevMode, isLoading } = useAuthStore();
  const { isSetupComplete } = useBusinessStore();
  const accentColor = useSettingsStore((s) => s.accentColor);
  const bgColor = accentColor
    ? (generateThemeColors(accentColor, false).gradientStart ?? '#1E40AF') as string
    : '#1E40AF';

  useEffect(() => {
    if (isLoading) return;

    if (!language) {
      router.replace('/(onboarding)/splash');
      return;
    }

    // Skip auth check for users who have already completed setup (offline-first app)
    if (!user && !isDevMode && !isSetupComplete) {
      router.replace('/(onboarding)/login');
      return;
    }

    if (!isSetupComplete) {
      router.replace('/(onboarding)/setup');
      return;
    }

    router.replace('/(app)/dashboard');
  }, [isLoading, language, user, isDevMode, isSetupComplete]);

  // Always render visible content.  Returning null leaves a white screen
  // during the one-render gap between the effect firing and the target
  // route mounting.
  return (
    <View style={{ flex: 1, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}
