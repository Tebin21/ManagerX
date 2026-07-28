import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Theme } from '@/constants/theme';

// Apple's App Store Guidelines require using the official AppleAuthenticationButton
// component (not a custom-styled button) to start the sign-in flow. The package's own
// entry point already guards its native view manager behind `Platform.OS === 'ios'`,
// but on an iOS binary that predates this feature's native rebuild the view manager
// lookup can still throw — so the module is loaded lazily here, mirroring the deferred-
// import pattern already used for @react-native-google-signin in store/authStore.ts,
// and the button simply renders nothing if that load fails.
type AppleAuthModule = typeof import('expo-apple-authentication');

interface Props {
  onPress: () => void;
  loading?: boolean;
}

export function AppleSignInButton({ onPress, loading }: Props) {
  const [AppleAuth, setAppleAuth] = useState<AppleAuthModule | null>(null);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('expo-apple-authentication');
        const isAvailable = await mod.isAvailableAsync();
        if (!cancelled) {
          setAppleAuth(mod);
          setAvailable(isAvailable);
        }
      } catch {
        // Native module unavailable (e.g. a pre-rebuild binary) — hide the button.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!AppleAuth || !available) return null;

  return (
    <View style={[styles.wrapper, loading && styles.disabled]} pointerEvents={loading ? 'none' : 'auto'}>
      <AppleAuth.AppleAuthenticationButton
        buttonType={AppleAuth.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuth.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={Theme.button.borderRadius}
        style={styles.button}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: Theme.button.height,
    borderRadius: Theme.button.borderRadius,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.6,
  },
  button: {
    width: '100%',
    height: '100%',
  },
});
