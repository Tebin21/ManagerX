import '../global.css';
import '../lib/i18n';

import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initializeDatabase } from '@/lib/sqlite';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { useSettingsStore } from '@/store/settingsStore';
import { ThemeProvider, useAppTheme } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { generateThemeColors } from '@/lib/colorUtils';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

// ─── AppStack ─────────────────────────────────────────────────────────────────
// Keyed on `language` so the entire navigation tree remounts when the user
// switches languages, ensuring all t() translation calls re-render immediately
// — no app restart required.

function AppStack() {
  const { isDark, colors } = useAppTheme();
  const language = useLanguageStore((s) => s.language);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        key={language ?? 'en'}
        screenOptions={{
          headerShown:  false,
          contentStyle: { backgroundColor: colors.gray50 },
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
  });

  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize().catch((e) => console.error('Auth init failed:', e));
    initializeDatabase().catch((e) => console.error('DB init failed:', e));
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && Platform.OS !== 'web') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  const accentColor = useSettingsStore((s) => s.accentColor);
  const loadingBg = accentColor
    ? (generateThemeColors(accentColor, false).gradientStart ?? '#1E40AF')
    : '#1E40AF';

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
