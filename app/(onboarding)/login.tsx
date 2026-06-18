import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { EmailPasswordForm } from '@/components/auth/EmailPasswordForm';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { signIn, signInWithGoogle, setDevMode, isLoading } = useAuthStore();
  const { colors } = useAppTheme();
  const [authError, setAuthError] = useState<string | null>(null);

  const handleEmailLogin = async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await signIn(email, password);
    if (error) {
      setAuthError(error);
    } else {
      router.replace('/(onboarding)/language');
    }
  };

  const handleGoogle = async () => {
    setAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) setAuthError(error);
  };

  const handleSkip = () => {
    setDevMode();
    router.replace('/(onboarding)/language');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.softBlue }]}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.topBg, { backgroundColor: colors.darkBlue }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, delay: 100 }}
            style={styles.logoRow}
          >
            <View style={styles.logoBox}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>ManagerX</Text>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 100, delay: 200 }}
            style={styles.card}
          >
            <Text style={[styles.title, { color: colors.darkBlue }]}>{t('login.title')}</Text>
            <Text style={styles.subtitle}>{t('login.subtitle')}</Text>

            <View style={styles.section}>
              <GoogleSignInButton onPress={handleGoogle} loading={isLoading} />
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('common.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <EmailPasswordForm onSubmit={handleEmailLogin} loading={isLoading} />

            {authError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}
          </MotiView>

          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 500, delay: 600 }}
            style={styles.skipRow}
          >
            <TouchableOpacity onPress={handleSkip} hitSlop={12}>
              <Text style={styles.skipText}>{t('login.skipBtn')}</Text>
            </TouchableOpacity>
          </MotiView>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: { flex: 1 },
  topBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBox: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logo: {
    width: 52,
    height: 52,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.xl,
    padding: 24,
    ...Theme.shadow.card,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray200,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.gray400,
    fontWeight: '500',
  },
  errorBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
  skipRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  skipText: {
    fontSize: 13,
    color: Colors.gray400,
    textDecorationLine: 'underline',
  },
});
