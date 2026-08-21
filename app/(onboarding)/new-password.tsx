import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';

export default function NewPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { pendingPasswordResetToken, completePasswordReset } = useAuthStore();
  const { colors } = useAppTheme();
  const { isRTL } = useRTL();
  const insets = useSafeAreaInsets();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Deep-link / state-loss safety net — this screen requires a reset token
    // obtained from verify-reset-otp.tsx's successful verification.
    if (!pendingPasswordResetToken) {
      router.replace('/(onboarding)/forgot-password' as never);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPasswordResetToken]);

  const handleSubmit = async () => {
    setAuthError(null);
    let hasError = false;
    if (!newPassword || newPassword.length < 6) {
      setPasswordError(t('newPassword.validation.tooShort'));
      hasError = true;
    } else {
      setPasswordError(undefined);
    }
    if (newPassword !== confirmPassword) {
      setConfirmError(t('newPassword.validation.mismatch'));
      hasError = true;
    } else {
      setConfirmError(undefined);
    }
    if (hasError) return;

    setLoading(true);
    const { error } = await completePasswordReset(newPassword);
    setLoading(false);
    if (error) {
      setAuthError(error);
    } else {
      router.replace('/(onboarding)/reset-success' as never);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.gray50 }]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={[styles.backRow, isRTL && styles.backRowRTL]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 110, delay: 100 }}
        >
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </MotiView>
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 100, delay: 150 }}
        >
          <Text style={styles.headline}>{t('newPassword.title')}</Text>
          <Text style={styles.subtitle}>{t('newPassword.subtitle')}</Text>
        </MotiView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 100, delay: 300 }}
          >
            <AppTextInput
              label={t('newPassword.newPasswordLabel')}
              placeholder={t('newPassword.newPasswordPlaceholder')}
              value={newPassword}
              onChangeText={setNewPassword}
              error={passwordError}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              forceLatin
            />
            <AppTextInput
              label={t('newPassword.confirmPasswordLabel')}
              placeholder={t('newPassword.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={confirmError}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              forceLatin
            />
            {authError && <AuthErrorBanner message={authError} />}
            <PrimaryButton label={t('newPassword.submitBtn')} onPress={handleSubmit} loading={loading} />
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingBottom: 32,
    paddingHorizontal: 28,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  backRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  backRowRTL: { flexDirection: 'row-reverse' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  logo: {
    width: 40,
    height: 40,
    marginBottom: 12,
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 20,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 28,
    paddingHorizontal: 24,
  },
});
