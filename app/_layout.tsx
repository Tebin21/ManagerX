import '../global.css';
import '../lib/i18n';

import React, { useEffect } from 'react';
import { ActivityIndicator, I18nManager, Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initializeDatabase } from '@/lib/sqlite';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useLicenseStore } from '@/store/licenseStore';
import { ThemeProvider, useAppTheme } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { generateThemeColors } from '@/lib/colorUtils';
import { Colors } from '@/constants/colors';
import { useRTL } from '@/lib/rtl';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

// RTL (Kurdish) is handled entirely in JS (see lib/rtl.ts / store/languageStore.ts) —
// native RTL must stay off, otherwise the OS auto-mirrors layouts and icons on top of
// our own mirroring. A stale native flag from older builds can persist across reloads,
// so this is reasserted on every launch.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// ─── AppStack ─────────────────────────────────────────────────────────────────
// Keyed on `language` so the entire navigation tree remounts when the user
// switches languages, ensuring all t() translation calls re-render immediately
// — no app restart required.

function AppStack() {
  const { isDark, colors } = useAppTheme();
  const language = useLanguageStore((s) => s.language);
  const { isRTL } = useRTL();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        key={language ?? 'en'}
        screenOptions={{
          headerShown:  false,
          contentStyle: { backgroundColor: colors.gray50 },
          animation: isRTL ? 'slide_from_left' : 'slide_from_right',
        }}
      />
    </>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    // Kurdish-only, Settings-screen-only typeface — see lib/settingsFont.ts
    RudawRegular: require('@/assets/fonts/rudawregular2.ttf'),
  });

  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize().catch((e) => console.error('Auth init failed:', e));
    initializeDatabase()
      .then(() => useLicenseStore.getState().loadLicense())
      .catch((e) => console.error('DB init failed:', e));
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && Platform.OS !== 'web') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  const accentColor = useSettingsStore((s) => s.accentColor);
  const loadingBg = accentColor
    ? (generateThemeColors(accentColor, false).gradientStart ?? Colors.gradientStart)
    : Colors.gradientStart;

  if (!fontsLoaded && !fontError) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: loadingBg as string }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <AppStack />
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
