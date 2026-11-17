import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  StatusBar,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { MotiView } from 'moti';
import { Text } from '@/components/ui/AppText';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { AUTHENTICATION_CUATE_SVG } from '@/constants/onboardingIllustrations';
import { DEV_FORCE_ONBOARDING_PREVIEW } from '@/constants/devPreview';
import { LanguageToggleSwitch } from '@/components/settings/LanguageToggleSwitch';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import { SupportFooter } from '@/components/ui/SupportFooter';

const RESEND_COOLDOWN_SECONDS = 60;

function maskEmail(email: string | null): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
}

const VERIFY_RESET_STRINGS = {
  ku: {
    illustrationTitle: 'پشتڕاستکردنەوەی کۆد',
    illustrationSub: 'کۆدێکی دڵنیابوونەوەی ٦ ژمارەییمان بۆ ئیمەیڵەکەت ناردووە بۆ نوێکردنەوەی وشەی نهێنی',
    mobileSub: 'تکایە کۆدی ٦ ژمارەیی بنووسە بۆ نوێکردنەوەی وشەی نهێنی',
    welcomeTitle: 'پشتڕاستکردنەوەی کۆد',
    welcomeSubPrompt: 'کۆدی ٦ ژمارەیی نێردراو بۆ:',
    verifyBtn: 'پشتڕاستکردنەوە',
    resendBtn: 'دووبارە ناردنەوە',
    resendCooldown: 'دووبارە ({{seconds}}چ)',
    backToLogin: 'گەڕانەوە بۆ چوونەژوورەوە',
    resendSuccess: 'کۆدێکی نوێ بە سەرکەوتوویی نێردرا.',
    devBypass: 'داشبۆرد ⚡',
    infoHintCompact: 'کۆدەکە بۆ ١٠ خولەک کارایە • فۆڵدەری Spam بپشکنە',
    errorInvalidCode: 'کۆدی داخڵکراو هەڵەیە یان بەسەرچووە.',
  },
  ar: {
    illustrationTitle: 'تأكيد رمز الاستعادة',
    illustrationSub: 'أرسلنا رمز تحقق مكوّن من ٦ أرقام إلى بريدك الإلكتروني لإعادة تعيين كلمة المرور',
    mobileSub: 'يرجى إدخال الرمز المكوّن من ٦ أرقام لإعادة تعيين كلمة المرور',
    welcomeTitle: 'تأكيد رمز الاستعادة',
    welcomeSubPrompt: 'رمز التحقق المرسل إلى:',
    verifyBtn: 'تأكيد',
    resendBtn: 'إعادة إرسال',
    resendCooldown: 'إعادة ({{seconds}}ث)',
    backToLogin: 'العودة لتسجيل الدخول',
    resendSuccess: 'تم إرسال رمز جديد بنجاح.',
    devBypass: 'لوحة التحكم ⚡',
    infoHintCompact: 'الرمز صالح لمدة ١٠ دقائق • تفقد البريد غير الهام (Spam)',
    errorInvalidCode: 'الرمز المدخل غير صحيح أو انتهت صلاحيته.',
  },
  en: {
    illustrationTitle: 'Verify Reset Code',
    illustrationSub: 'We sent a 6-digit verification code to your email to reset your password',
    mobileSub: 'Please enter the 6-digit code to reset your password',
    welcomeTitle: 'Verify Reset Code',
    welcomeSubPrompt: 'Enter 6-digit code sent to:',
    verifyBtn: 'Verify',
    resendBtn: 'Resend',
    resendCooldown: 'Resend ({{seconds}}s)',
    backToLogin: 'Back to Log In',
    resendSuccess: 'A new code has been sent successfully.',
    devBypass: 'Dashboard ⚡',
    infoHintCompact: 'Code is valid for 10 min • Check your Spam folder',
    errorInvalidCode: 'The code entered is invalid or has expired.',
  },
};

export default function VerifyResetOtpScreen() {
  const router = useRouter();
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);
  const isDark = isDarkMode;

  const { language, setLanguage, isRTL } = useLanguageStore();
  const { pendingPasswordResetEmail, verifyPasswordResetOtp, resendPasswordResetOtp, cancelPasswordReset } =
    useAuthStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isTablet, isTabletLandscape } = useResponsive();

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [inputLocked, setInputLocked] = useState(false);

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Large screen vs phone breakpoint
  const isLargeScreen = isTablet || width >= 720;

  const curLang: 'ku' | 'en' | 'ar' = language === 'en' ? 'en' : language === 'ar' ? 'ar' : 'ku';
  const strings = VERIFY_RESET_STRINGS[curLang];

  const maskedEmailStr = maskEmail(pendingPasswordResetEmail);

  useEffect(() => {
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
      setVerifyError(strings.errorInvalidCode);
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
      setResendMessage(strings.resendSuccess);
    }
    startCooldown();
  };

  const handleBackToLogin = () => {
    cancelPasswordReset();
    router.replace('/(onboarding)/login');
  };

  const handleToggleTheme = () => {
    setDarkMode(!isDarkMode);
  };

  const handleDismissDropdown = () => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  };

  // Dimensions - optimized for mobile screen height
  const phoneSvgSize = Math.min(295, width * 0.74);
  const tabletSvgSize = isTabletLandscape ? 360 : 290;

  // Render Top Header Controls
  const renderTopControls = (showBack: boolean = true) => (
    <View style={styles.topControlsCenteredRow}>
      {showBack && (
        <TouchableOpacity
          onPress={handleBackToLogin}
          activeOpacity={0.8}
          style={[
            styles.backBtnAbsolute,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
              [isRTL ? 'right' : 'left']: 16,
            },
          ]}
        >
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={18}
            color={isDark ? '#F8C61E' : '#475569'}
          />
        </TouchableOpacity>
      )}

      {/* Unified Centered Capsule / Pill Bar */}
      <View
        style={[
          styles.unifiedPillBar,
          {
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
            shadowColor: isDark ? '#000000' : '#0F172A',
            shadowOpacity: isDark ? 0.25 : 0.06,
          },
        ]}
      >
        {/* Dark / Light Mode Toggle Button */}
        <TouchableOpacity
          onPress={handleToggleTheme}
          activeOpacity={0.75}
          style={[
            styles.themePillBtn,
            {
              backgroundColor: isDark ? 'rgba(248, 198, 30, 0.12)' : 'rgba(71, 85, 105, 0.08)',
            },
          ]}
          accessibilityLabel="Toggle Dark/Light Mode"
          accessibilityRole="button"
        >
          <Ionicons
            name={isDark ? 'sunny' : 'moon'}
            size={16}
            color={isDark ? '#F8C61E' : '#475569'}
          />
        </TouchableOpacity>

        {/* Vertical Divider */}
        <View
          style={[
            styles.pillDivider,
            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0' },
          ]}
        />

        {/* Language Toggle Switch */}
        <LanguageToggleSwitch
          language={curLang}
          isDark={isDark}
          embedded
          onChangeLanguage={(newLang) => setLanguage(newLang)}
        />
      </View>
    </View>
  );

  // Render Form Fields & Buttons
  const renderFormFields = (isTabletLayout: boolean) => (
    <View style={styles.formContainer}>
      {/* Title & Email Prompt (Responsive, RTL/LTR isolated, short & concise) */}
      <View
        style={[
          styles.welcomeBox,
          { alignItems: isRTL ? 'flex-end' : 'flex-start' },
        ]}
      >
        <Text
          style={[
            isTabletLayout ? styles.tabletWelcomeTitle : styles.mobileWelcomeTitle,
            curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            {
              color: isDark ? '#FFFFFF' : '#0F172A',
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
        >
          {strings.welcomeTitle}
        </Text>

        <View
          style={[
            styles.emailPromptRow,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <Text
            style={[
              styles.emailPromptLabel,
              curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT },
              {
                color: isDark ? '#94A3B8' : '#64748B',
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
          >
            {strings.welcomeSubPrompt}
          </Text>
          <View
            style={[
              styles.emailPill,
              {
                backgroundColor: isDark ? 'rgba(248, 198, 30, 0.12)' : 'rgba(248, 198, 30, 0.14)',
                borderColor: isDark ? 'rgba(248, 198, 30, 0.3)' : 'rgba(217, 119, 6, 0.28)',
              },
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={12}
              color={isDark ? '#F8C61E' : '#B45309'}
              style={{ marginHorizontal: 3 }}
            />
            <Text
              style={[
                styles.emailPillText,
                {
                  color: isDark ? '#F8C61E' : '#92400E',
                  writingDirection: 'ltr',
                },
              ]}
            >
              {maskedEmailStr}
            </Text>
          </View>
        </View>
      </View>

      {/* Compact Info Notice Box */}
      <View
        style={[
          styles.compactInfoBox,
          {
            backgroundColor: isDark ? 'rgba(248, 198, 30, 0.08)' : '#FEFCE8',
            borderColor: isDark ? 'rgba(248, 198, 30, 0.22)' : '#FEF08A',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <Ionicons
          name="time-outline"
          size={14}
          color="#F8C61E"
          style={{ marginHorizontal: 4 }}
        />
        <Text
          style={[
            styles.compactInfoText,
            curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT },
            {
              color: isDark ? '#CBD5E1' : '#854D0E',
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
        >
          {strings.infoHintCompact}
        </Text>
      </View>

      {/* OTP 6-Digit Code Input */}
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

      {/* Error Banners */}
      {verifyError && <AuthErrorBanner message={verifyError} style={{ marginVertical: 6 }} />}

      {/* Success Box if Resent */}
      {resendMessage && (
        <View
          style={[
            styles.successBox,
            {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons
            name="checkmark-circle"
            size={16}
            color="#10B981"
            style={{ marginHorizontal: 4 }}
          />
          <Text
            style={[
              styles.successText,
              curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT },
              {
                color: isDark ? '#34D399' : '#065F46',
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
          >
            {resendMessage}
          </Text>
        </View>
      )}

      {resendError && <AuthErrorBanner message={resendError} style={{ marginVertical: 6 }} />}

      {/* Side-by-Side Action Buttons: Compact, Responsive, One-row */}
      <View style={[styles.compactButtonsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Verify Button (Gold) */}
        <TouchableOpacity
          onPress={() => handleVerify()}
          activeOpacity={0.88}
          disabled={code.length !== 6 || inputLocked || verifying}
          style={[
            styles.compactVerifyBtn,
            {
              opacity: code.length !== 6 || inputLocked || verifying ? 0.55 : 1,
            },
          ]}
        >
          {verifying ? (
            <ActivityIndicator color="#0F172A" size="small" />
          ) : (
            <View style={[styles.compactBtnContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons
                name="checkmark-done-circle-outline"
                size={17}
                color="#0F172A"
                style={{ marginHorizontal: 4 }}
              />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[
                  styles.compactVerifyText,
                  curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {strings.verifyBtn}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Resend Button (Outline Pill) */}
        <TouchableOpacity
          onPress={() => handleResend()}
          activeOpacity={0.8}
          disabled={cooldown > 0 || resending}
          style={[
            styles.compactResendBtn,
            {
              borderColor: isDark ? '#334155' : '#CBD5E1',
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#F8FAFC',
              opacity: cooldown > 0 || resending ? 0.6 : 1,
            },
          ]}
        >
          {resending ? (
            <ActivityIndicator size="small" color="#F8C61E" />
          ) : (
              <View style={[styles.compactBtnContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color={isDark ? '#F8C61E' : '#B45309'}
                  style={{ marginHorizontal: 3 }}
                />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={[
                    styles.compactResendText,
                    curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    { color: isDark ? '#F8C61E' : '#B45309' },
                  ]}
                >
                  {cooldown > 0 ? (curLang === 'en' ? 'Resend' : curLang === 'ar' ? 'إعادة' : 'دووبارە') : strings.resendBtn}
                </Text>
                {cooldown > 0 && (
                  <Text
                    style={[
                      styles.compactResendText,
                      {
                        color: isDark ? '#F8C61E' : '#B45309',
                        writingDirection: 'ltr',
                        marginHorizontal: 2,
                      },
                    ]}
                  >
                    {`(${cooldown}s)`}
                  </Text>
                )}
              </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Back to Login link */}
      <TouchableOpacity
        onPress={handleBackToLogin}
        activeOpacity={0.7}
        style={styles.signInRow}
      >
        <View style={[styles.backToLoginContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons
            name={isRTL ? 'arrow-forward-outline' : 'arrow-back-outline'}
            size={16}
            color="#F8C61E"
            style={{ marginHorizontal: 5 }}
          />
          <Text
            style={[
              styles.signInLinkText,
              curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: '#F8C61E' },
            ]}
          >
            {strings.backToLogin}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  // ==========================================
  // Layout for iPad & Large Tablets
  // ==========================================
  if (isLargeScreen) {
    return (
      <TouchableWithoutFeedback onPress={handleDismissDropdown}>
        <View style={[styles.screen, { backgroundColor: isDark ? '#0B1120' : '#F8FAFC' }]}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <SafeAreaView style={styles.tabletCenterWrapper}>
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 18, stiffness: 100 }}
              style={[
                styles.tabletMasterCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                  maxWidth: isTabletLandscape ? 1220 : 960,
                  padding: isTabletLandscape ? 36 : 28,
                  flexDirection: isRTL ? 'row' : 'row-reverse',
                },
              ]}
            >
              {/* Illustration Box */}
              <View
                style={[
                  styles.tabletIllustrationBox,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    borderRadius: 28,
                    padding: isTabletLandscape ? 36 : 24,
                  },
                ]}
              >
                <SvgXml xml={AUTHENTICATION_CUATE_SVG} width={tabletSvgSize} height={tabletSvgSize} />
                <View style={styles.tabletIllustrationTextWrap}>
                  <Text
                    style={[
                      styles.tabletIllustrationTitle,
                      curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      { color: isDark ? '#FFFFFF' : '#0F172A' },
                    ]}
                  >
                    {strings.illustrationTitle}
                  </Text>
                  <Text
                    style={[
                      styles.tabletIllustrationSub,
                      curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT },
                      { color: isDark ? '#94A3B8' : '#64748B' },
                    ]}
                  >
                    {strings.illustrationSub}
                  </Text>
                </View>
              </View>

              {/* Form Content Box */}
              <View
                style={[
                  styles.tabletContentBox,
                  {
                    paddingHorizontal: isTabletLandscape ? 44 : 32,
                    paddingVertical: 12,
                  },
                ]}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
                >
                  <View style={{ marginBottom: 20, zIndex: 100 }}>
                    {renderTopControls(true)}
                  </View>
                  {renderFormFields(true)}
                  <SupportFooter />
                </ScrollView>
              </View>
            </MotiView>
          </SafeAreaView>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  // ==========================================
  // Layout for Mobile Phones
  // ==========================================
  return (
    <TouchableWithoutFeedback onPress={handleDismissDropdown}>
      <View style={[styles.screen, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.mobileSafeContainer}>
          {/* Top Action Bar */}
          <View style={[styles.mobileTopBar, { zIndex: 100 }]}>
            {renderTopControls(true)}
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              contentContainerStyle={styles.mobileScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Top Illustration Area (Clean, Prominent, Compact) */}
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 350 }}
                style={styles.mobileIllustrationSection}
              >
                <View
                  style={[
                    styles.mobileSvgCircle,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                >
                  <SvgXml xml={AUTHENTICATION_CUATE_SVG} width={phoneSvgSize} height={phoneSvgSize * 0.88} />
                </View>
              </MotiView>

              {/* Bottom Card: Form Fields */}
              <MotiView
                from={{ opacity: 0, translateY: 30 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 90, delay: 100 }}
                style={[
                  styles.mobileCardContainer,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                {renderFormFields(false)}
              </MotiView>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },

  // Tablet Styles
  tabletCenterWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tabletMasterCard: {
    width: '100%',
    borderRadius: 36,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 12,
  },
  tabletIllustrationBox: {
    flex: 1.05,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  tabletIllustrationTextWrap: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tabletIllustrationTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  tabletIllustrationSub: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 380,
  },
  tabletContentBox: {
    flex: 1.15,
    justifyContent: 'center',
  },

  // Mobile Styles
  mobileSafeContainer: {
    flex: 1,
  },
  mobileTopBar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 2,
  },
  mobileScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  mobileIllustrationSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  mobileSvgCircle: {
    borderRadius: 28,
    padding: 8,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 6,
  },
  mobileAppTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  mobileAppSub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 300,
  },
  mobileCardContainer: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
    marginTop: 2,
    marginBottom: 8,
  },

  // Top Controls
  topControlsCenteredRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 2,
    zIndex: 100,
  },
  unifiedPillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 22,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  themePillBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillDivider: {
    width: 1,
    height: 18,
    marginHorizontal: 6,
  },
  backBtnAbsolute: {
    position: 'absolute',
    top: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 101,
  },

  // Form Fields
  formContainer: {
    width: '100%',
  },
  welcomeBox: {
    marginBottom: 8,
  },
  tabletWelcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  tabletWelcomeSub: {
    fontSize: 14,
    lineHeight: 22,
  },
  mobileWelcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 3,
  },
  emailPromptRow: {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  emailPromptLabel: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  emailPillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Compact Info Notice Box
  compactInfoBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
  },
  compactInfoText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },

  // OTP Block
  otpBlock: {
    marginVertical: 6,
    alignItems: 'center',
  },

  // Success Box
  successBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 4,
    alignItems: 'center',
  },
  successText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },

  // Compact Side-by-Side Buttons Row
  compactButtonsRow: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  compactVerifyBtn: {
    flex: 1,
    height: 46,
    backgroundColor: '#F8C61E',
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F8C61E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    paddingHorizontal: 6,
  },
  compactResendBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  compactBtnContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactVerifyText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  compactResendText: {
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Bottom Links
  signInRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  backToLoginContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
