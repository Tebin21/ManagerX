import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { pendingVerificationEmail, checkEmailVerification, sendVerificationEmail, cancelPendingVerification } =
    useAuthStore();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [checking, setChecking] = useState(false);
  const [notVerifiedYet, setNotVerifiedYet] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCheckVerified = async () => {
    setNotVerifiedYet(false);
    setCheckError(null);
    setChecking(true);
    const { verified, error } = await checkEmailVerification();
    setChecking(false);
    if (error) {
      setCheckError(error);
    } else if (verified) {
      router.replace('/');
    } else {
      setNotVerifiedYet(true);
    }
  };

  const handleResend = async () => {
    setResendMessage(null);
    setResendError(null);
    setResending(true);
    const { error } = await sendVerificationEmail();
    setResending(false);
    if (error) {
      setResendError(error);
    } else {
      setResendMessage(t('verifyEmail.resendSuccess'));
      startCooldown();
    }
  };

  const handleBackToLogin = async () => {
    await cancelPendingVerification();
    router.replace('/(onboarding)/login');
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
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 110, delay: 100 }}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="mail-unread-outline" size={36} color="#FFFFFF" />
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 100, delay: 300 }}
        >
          <Text style={styles.headline}>{t('verifyEmail.title')}</Text>
        </MotiView>
      </LinearGradient>

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
          <Text style={[styles.message, { color: colors.gray600 }]}>
            {t('verifyEmail.message', { email: pendingVerificationEmail ?? '' })}
          </Text>

          {notVerifiedYet && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{t('verifyEmail.notVerifiedYet')}</Text>
            </View>
          )}

          {checkError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{checkError}</Text>
            </View>
          )}

          <PrimaryButton label={t('verifyEmail.checkButton')} onPress={handleCheckVerified} loading={checking} />

          {resendMessage && (
            <View style={styles.successBox}>
              <Text style={[styles.successText, { color: colors.gray600 }]}>{resendMessage}</Text>
            </View>
          )}

          {resendError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{resendError}</Text>
            </View>
          )}

          <PrimaryButton
            label={cooldown > 0 ? t('verifyEmail.resendCooldown', { seconds: cooldown }) : t('verifyEmail.resendBtn')}
            onPress={handleResend}
            loading={resending}
            disabled={cooldown > 0}
            variant="outline"
          />

          <TouchableOpacity onPress={handleBackToLogin} style={styles.backToLoginRow}>
            <Text style={[styles.linkText, { color: colors.primary }]}>{t('verifyEmail.backToLogin')}</Text>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 28,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 14,
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 28,
    paddingHorizontal: 24,
    gap: 14,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },
  infoBox: {
    padding: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  infoText: {
    fontSize: 13,
    color: '#92640A',
    textAlign: 'center',
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
  successBox: {
    paddingVertical: 4,
  },
  successText: {
    fontSize: 13,
    textAlign: 'center',
  },
  backToLoginRow: {
    alignItems: 'center',
    marginTop: 6,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
