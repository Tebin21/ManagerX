import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { EmailPasswordForm, type EmailPasswordValues } from '@/components/auth/EmailPasswordForm';
import { SupportFooter } from '@/components/ui/SupportFooter';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';

export default function SignUpScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { signUpWithEmail, isLoading } = useAuthStore();
  const { colors } = useAppTheme();
  const { isRTL } = useRTL();
  const insets = useSafeAreaInsets();
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignUp = async ({ name, email, password }: EmailPasswordValues) => {
    setAuthError(null);
    const { error } = await signUpWithEmail(email, password, name);
    if (error) {
      setAuthError(error);
    } else {
      router.replace('/(onboarding)/verify-email' as never);
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
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 100, delay: 150 }}
        >
          <Text style={styles.headline}>{t('signup.title')}</Text>
          <Text style={styles.subtitle}>{t('signup.subtitle')}</Text>
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
            <EmailPasswordForm
              mode="signup"
              loading={isLoading}
              submitLabel={t('signup.signUpBtn')}
              onSubmit={handleSignUp}
            />

            {authError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            <TouchableOpacity onPress={() => router.replace('/(onboarding)/login')} style={styles.signInRow}>
              <Text style={[styles.linkText, { color: colors.gray600 }]}>
                {t('signup.haveAccount')}{' '}
                <Text style={[styles.linkTextBold, { color: colors.primary }]}>{t('signup.signInLink')}</Text>
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
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
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
  errorBox: {
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
  signInRow: {
    alignItems: 'center',
    marginTop: 6,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '500',
  },
  linkTextBold: {
    fontWeight: '700',
  },
});
