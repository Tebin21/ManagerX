import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Image, StatusBar, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { SupportFooter } from '@/components/ui/SupportFooter';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';

// Sibling to verify-email.tsx's screen for the signup OTP flow — deliberately a
// separate file rather than a shared/parameterized one, so that flow's code
// never needs to change to accommodate this one. Duplicated locally rather than
// extracted for the same reason.
const RESEND_COOLDOWN_SECONDS = 60;

function maskEmail(email: string | null): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
}

export default function VerifyResetOtpScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { pendingPasswordResetEmail, verifyPasswordResetOtp, resendPasswordResetOtp, cancelPasswordReset } =
    useAuthStore();
  const { colors } = useAppTheme();
  const { isRTL } = useRTL();
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [inputLocked, setInputLocked] = useState(false);

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // forgot-password.tsx already triggered the initial send before navigating
    // here — this screen only needs to start the matching cooldown, not fire a
    // redundant request of its own the way verify-email.tsx does on a cold entry.
    startCooldown();
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

  const handleVerify = async (submittedCode?: string) => {
    const value = submittedCode ?? code;
    if (value.length !== 6) return;
    setVerifyError(null);
    setVerifying(true);
    const { verified, error, locked } = await verifyPasswordResetOtp(value);
    setVerifying(false);
    if (locked) {
      setInputLocked(true);
    }
    if (error) {
      setVerifyError(error);
    } else if (verified) {
      router.push('/(onboarding)/new-password' as never);
    } else {
      setVerifyError(t('verifyResetOtp.errorInvalidCode'));
    }
  };

  const handleResend = async () => {
    setResendMessage(null);
    setResendError(null);
    setResending(true);
    setCode('');
    setVerifyError(null);
    setInputLocked(false);
    const { error } = await resendPasswordResetOtp();
    setResending(false);
    if (error) {
      setResendError(error);
    } else {
      setResendMessage(t('verifyResetOtp.resendSuccess'));
    }
    // Cooldown starts even on failure — prevents rapid repeated requests
    // regardless of whether the send itself succeeded.
    startCooldown();
  };

  const handleBackToLogin = () => {
    cancelPasswordReset();
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
        <View style={[styles.backRow, isRTL && styles.backRowRTL]}>
          <TouchableOpacity onPress={handleBackToLogin} style={styles.backBtn}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 110, delay: 60 }}
        >
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </MotiView>

        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 110, delay: 100 }}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={36} color={Colors.white} />
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 100, delay: 300 }}
        >
          <Text style={styles.headline}>{t('verifyResetOtp.title')}</Text>
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
            {t('verifyResetOtp.message', { email: maskEmail(pendingPasswordResetEmail) })}
          </Text>

          <View style={styles.otpBlock}>
            <OtpCodeInput
              value={code}
              onChange={(next) => {
                setCode(next);
                setVerifyError(null);
              }}
              onComplete={(finalCode) => handleVerify(finalCode)}
              error={!!verifyError}
              disabled={inputLocked || verifying}
            />
          </View>

          <View style={styles.buttonBlock}>
            <PrimaryButton
              label={t('verifyResetOtp.verifyButton')}
              onPress={() => handleVerify()}
              loading={verifying}
              disabled={code.length !== 6 || inputLocked}
            />
          </View>

          {verifyError && <AuthErrorBanner message={verifyError} style={styles.errorBanner} />}

          {resendMessage && (
            <View style={styles.successBox}>
              <Text style={[styles.successText, { color: colors.gray600 }]}>{resendMessage}</Text>
            </View>
          )}

          {resendError && <AuthErrorBanner message={resendError} style={styles.errorBanner} />}

          <View style={styles.buttonBlock}>
            <PrimaryButton
              label={cooldown > 0 ? t('verifyResetOtp.resendCooldown', { seconds: cooldown }) : t('verifyResetOtp.resendBtn')}
              onPress={() => handleResend()}
              loading={resending}
              disabled={cooldown > 0}
              variant="outline"
            />
          </View>

          <TouchableOpacity onPress={handleBackToLogin} style={styles.backToLoginRow}>
            <Text style={[styles.linkText, { color: colors.primary }]}>{t('verifyResetOtp.backToLogin')}</Text>
          </TouchableOpacity>
        </MotiView>

        <SupportFooter />
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
  backRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 12,
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
    width: 36,
    height: 36,
    marginBottom: 10,
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
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  otpBlock: {
    marginBottom: 28,
  },
  buttonBlock: {
    marginBottom: 20,
  },
  errorBanner: {
    marginBottom: 16,
  },
  successBox: {
    paddingVertical: 8,
    marginBottom: 16,
  },
  successText: {
    fontSize: 13,
    textAlign: 'center',
  },
  backToLoginRow: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
