import '../global.css';
import '../lib/i18n';
import { installAutoEnglishDigits } from '@/lib/autoEnglishDigits';

// Auto-converts any Eastern/Persian numerals typed into TextInput to English digits across the system (except login)
installAutoEnglishDigits();

import React, { useEffect } from 'react';
import { ActivityIndicator, I18nManager, Platform, View, Text, Image } from 'react-native';
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
import { AdminNotificationBanner } from '@/components/admin/AdminNotificationBanner';
import { UsageLimitModal } from '@/components/ui/UsageLimitModal';
import { AccountUpgradeReceiptModal } from '@/components/ui/AccountUpgradeReceiptModal';
import { SplashScreenOverlay } from '@/components/splash/SplashScreenOverlay';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

// RTL (Kurdish) is handled entirely in JS (see lib/rtl.ts / store/languageStore.ts) —
// native RTL must stay off, otherwise the OS auto-mirrors layouts and icons on top of
// our own mirroring. A stale native flag from older builds can persist across reloads,
// so this is reasserted on every launch.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// Diagnostics only — chains to (never replaces) RN's default handler, so redbox/
// native crash reporting behavior is unchanged. Added while isolating the
// cold-start SIGSEGV (see .claude/plans): it cannot catch that crash (it happens
// inside Hermes' native VM below any JS handler frame), but it surfaces any
// related non-fatal JS exception that would otherwise vanish silently.
if (typeof ErrorUtils !== 'undefined') {
  const previousHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[GlobalError]', isFatal ? 'FATAL' : 'non-fatal', error);
    previousHandler?.(error, isFatal);
  });
}

// ─── AppStack ─────────────────────────────────────────────────────────────────
// Keyed on `language` so the entire navigation tree remounts when the user
// switches languages, ensuring all t() translation calls re-render immediately
// — no app restart required.

function AppStack() {
  const { isDark, colors } = useAppTheme();
  const language = useLanguageStore((s) => s.language);
  const appScaleLevel = useSettingsStore((s) => s.appScaleLevel ?? 5);
  const { isRTL } = useRTL();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        key={`${language ?? 'en'}-scale-${appScaleLevel}`}
        initialRouteName="index"
        screenOptions={{
          headerShown:  false,
          contentStyle: { backgroundColor: colors.gray50 },
          animation: isRTL ? 'slide_from_left' : 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            animation: 'fade',
            contentStyle: { backgroundColor: '#000000' },
          }}
        />
        <Stack.Screen
          name="(app)"
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="(onboarding)"
          options={{
            animation: 'fade',
          }}
        />
      </Stack>
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
    // Kurdish typeface (Bahij Janna) - Regular and Bold
    'BahijJanna-Regular': require('@/assets/fonts/BahijJanna-Regular.ttf'),
    'BahijJanna-Bold': require('@/assets/fonts/BahijJanna-Bold.ttf'),
    'Bahij Janna': require('@/assets/fonts/BahijJanna-Regular.ttf'),
    'Bahij Janna Bold': require('@/assets/fonts/BahijJanna-Bold.ttf'),
    // Alias RudawRegular to BahijJanna-Regular for backward compatibility
    RudawRegular: require('@/assets/fonts/BahijJanna-Regular.ttf'),
  });

  const [isObscured, setIsObscured] = React.useState(false);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize().catch((e) => console.error('Auth init failed:', e));
    initializeDatabase()
      .then(() => useLicenseStore.getState().loadLicense())
      .then(() => import('@/store/iapStore'))
      .then((m) => m.useIapStore.getState().initialize())
      .then(() => import('@/lib/accountDeletion'))
      .then((m) => m.resumeInterruptedDeletionIfNeeded())
      .catch((e) => console.error('DB init failed:', e));

    // Anti-tamper & device integrity check
    import('@/lib/security')
      .then((m) => m.isDeviceRootedAsync())
      .then((isRooted) => {
        if (isRooted) {
          console.warn('[Security] Device integrity alert: Root/Jailbreak indicators present.');
        }
      })
      .catch(() => {});

    // Telemetry tracking & Google Drive auto-backup lifecycle triggers
    import('@/lib/telemetry').then((m) => m.trackAppInstallOrOpen()).catch(() => {});
    import('@/lib/googleDriveBackup').then((m) => m.triggerGoogleDriveAutoBackup('app_open')).catch(() => {});
    import('@/lib/onlineStore/storeActivationService')
      .then((m) => m.startStoreActivationRealtimeListener())
      .catch(() => {});

    const { AppState } = require('react-native');
    const appStateSub = AppState.addEventListener('change', (state: string) => {
      if (Platform.OS !== 'web') {
        setIsObscured(state === 'background' || state === 'inactive');
      }
      if (state === 'background') {
        import('@/lib/googleDriveBackup')
          .then((m) => m.triggerGoogleDriveAutoBackup('app_close'))
          .catch(() => {});
      } else if (state === 'active') {
        import('@/lib/googleDriveBackup')
          .then((m) => m.triggerGoogleDriveAutoBackup('app_open'))
          .catch(() => {});
        import('@/lib/telemetry')
          .then((m) => m.trackAppInstallOrOpen())
          .catch(() => {});
      }
    });

    return () => {
      appStateSub?.remove?.();
    };
  }, []);

  useEffect(() => {
    // Safety fallback: if anything prevents the overlay from mounting within 3.5s, drop native splash
    const timer = setTimeout(() => {
      if (Platform.OS !== 'web') {
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const accentColor = useSettingsStore((s) => s.accentColor);
  const loadingBg = accentColor
    ? (generateThemeColors(accentColor, false).gradientStart ?? Colors.gradientStart)
    : Colors.gradientStart;

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', paddingBottom: 55 }}>
        <StatusBar style="light" />
        <Image
          source={require('@/assets/images/logo.png')}
          style={{ width: 205, height: 205 }}
          fadeDuration={0}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <AppStack />
          <AdminNotificationBanner />
          <UsageLimitModal />
          <AccountUpgradeReceiptModal />
          <SplashScreenOverlay />
          {isObscured && Platform.OS !== 'web' && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#0F172A',
                zIndex: 999999,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                source={require('@/assets/images/logo.png')}
                style={{ width: 140, height: 140, opacity: 0.9 }}
                resizeMode="contain"
              />
            </View>
          )}
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
