import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { AppleSignInButton } from '@/components/auth/AppleSignInButton';
import { EmailPasswordForm } from '@/components/auth/EmailPasswordForm';
import { SupportFooter } from '@/components/ui/SupportFooter';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { signInWithGoogle, signInWithApple, signInWithEmail, isLoading } = useAuthStore();
  const { colors } = useAppTheme();
  const [authError, setAuthError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const logoSize = Math.min(84, Math.max(60, width * 0.2));
  const headerPaddingTop = insets.top + 16;

  const handleGoogle = async () => {
    setAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setAuthError(error);
    } else {
      router.replace('/');
    }
  };

  const handleApple = async () => {
    setAuthError(null);
    const { error } = await signInWithApple();
    if (error) {
      setAuthError(error);
    } else {
      router.replace('/');
    }
  };

  const handleEmailSignIn = async ({ email, password }: { email: string; password: string }) => {
    setAuthError(null);
    const { error } = await signInWithEmail(email, password);
    if (error) {
      setAuthError(error);
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.gray50 }]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.header, { paddingTop: headerPaddingTop }]}
      >
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 110, delay: 100 }}
        >
          <Image
            source={require('../../assets/images/logo.png')}
            style={[styles.logo, { width: logoSize, height: logoSize }]}
            resizeMode="contain"
          />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 100, delay: 300 }}
        >
          <Text style={styles.headline}>{t('login.title')}</Text>
          <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
        </MotiView>
      </LinearGradient>

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
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 100, delay: 450 }}
            style={styles.buttonGroup}
          >
            <EmailPasswordForm
              mode="signin"
              loading={isLoading}
              submitLabel={t('login.signInBtn')}
              onSubmit={handleEmailSignIn}
            />

            <TouchableOpacity onPress={() => router.push('/(onboarding)/forgot-password' as never)} style={styles.forgotLink}>
              <Text style={[styles.linkText, { color: colors.primary }]}>{t('login.forgotPassword')}</Text>
            </TouchableOpacity>

            {authError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.gray200 }]} />
              <Text style={[styles.dividerText, { color: colors.gray400 }]}>{t('login.or')}</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.gray200 }]} />
            </View>

            <GoogleSignInButton onPress={handleGoogle} loading={isLoading} />
            <AppleSignInButton onPress={handleApple} loading={isLoading} />

            <TouchableOpacity onPress={() => router.push('/(onboarding)/signup' as never)} style={styles.signUpRow}>
              <Text style={[styles.linkText, { color: colors.gray600 }]}>
                {t('login.noAccount')}{' '}
                <Text style={[styles.linkTextBold, { color: colors.primary }]}>{t('login.signUpLink')}</Text>
              </Text>
            </TouchableOpacity>
          </MotiView>

          <SupportFooter />
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
  header: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 28,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  logo: {
    marginBottom: 14,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 28,
    paddingHorizontal: 24,
  },
  buttonGroup: {
    width: '100%',
    gap: 14,
  },
  errorBox: {
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
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 4,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '500',
  },
  linkTextBold: {
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  signUpRow: {
    alignItems: 'center',
    marginTop: 6,
  },
});
