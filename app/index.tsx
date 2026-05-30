import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useSettingsStore } from '@/store/settingsStore';

// Module-level flag so PIN is only required once per app session
let sessionUnlocked = false;
export function markPinUnlocked() { sessionUnlocked = true; }

export default function Index() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { user, isDevMode, isLoading } = useAuthStore();
  const { isSetupComplete } = useBusinessStore();
  const pinEnabled = useSettingsStore((s) => s.pinEnabled);

  useEffect(() => {
    if (isLoading) return;

    if (!language) {
      router.replace('/(onboarding)/splash');
      return;
    }

    if (!user && !isDevMode) {
      router.replace('/(onboarding)/login');
      return;
    }

    if (!isSetupComplete) {
      router.replace('/(onboarding)/setup');
      return;
    }

    // PIN lock: show lock screen if enabled and not yet unlocked this session
    if (pinEnabled && !sessionUnlocked) {
      router.replace('/pin');
      return;
    }

    router.replace('/(app)/dashboard');
  }, [isLoading, language, user, isDevMode, isSetupComplete, pinEnabled]);

  // Always render visible content.  Returning null leaves a white screen
  // during the one-render gap between the effect firing and the target
  // route mounting.
  return (
    <View style={{ flex: 1, backgroundColor: '#1E40AF', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}
