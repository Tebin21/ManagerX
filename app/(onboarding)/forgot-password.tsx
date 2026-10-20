import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  StatusBar,
  Platform,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { MotiView } from 'moti';
import { Text } from '@/components/ui/AppText';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { FORGOT_PASSWORD_CUATE_SVG } from '@/constants/onboardingIllustrations';
import { DEV_FORCE_ONBOARDING_PREVIEW } from '@/constants/devPreview';
import { LanguageToggleSwitch } from '@/components/settings/LanguageToggleSwitch';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { EMAIL_RE } from '@/lib/validation';

// Localized strings for Kurdish and English
const FORGOT_STRINGS = {
  ku: {
    illustrationTitle: 'وشەی نهێنیت لەبیرکردووە؟',
    illustrationSub: 'نیگەران مەبە! ئیمەیڵەکەت بنووسە بۆ وەرگرتنی کۆدی دڵنیابوونەوە و گۆڕینی وشەی نهێنی',
    mobileSub: 'ئیمەیڵەکەت بنووسە بۆ وەرگرتنی کۆدی دڵنیابوونەوە',
    welcomeTitle: 'گەڕاندنەوەی وشەی نهێنی',
    welcomeSub: 'تکایە ئیمەیڵی هەژمارەکەت لێرە بنووسە',
    emailPlaceholder: 'ئیمەیڵی تۆمارکراو بنووسە',
    sendBtn: 'ناردنی کۆدی دڵنیابوونەوە',
    backToLogin: 'گەڕانەوە بۆ چوونەژوورەوە',
    devBypass: 'داشبۆرد ⚡',
    validationEmailRequired: 'تکایە ئیمەیڵەکەت بنووسە',
    validationEmailInvalid: 'تکایە ئیمەیڵێکی دروست بنووسە (نموونە: name@domain.com)',
    infoHint: 'کۆدێکی ٦ ژمارەیی دەنێردرێت بۆ ئیمەیڵەکەت بۆ نوێکردنەوەی وشەی نهێنی.',
  },
  en: {
    illustrationTitle: 'Forgot Your Password?',
    illustrationSub: "Don't worry! Enter your email to receive a verification code and reset your password",
    mobileSub: 'Enter your email to receive a password reset code',
    welcomeTitle: 'Reset Password',
    welcomeSub: 'Please enter your account email below',
    emailPlaceholder: 'Enter your email address',
    sendBtn: 'Send Reset Code',
    backToLogin: 'Back to Login',
    devBypass: 'Dashboard ⚡',
    validationEmailRequired: 'Please enter your email address',
    validationEmailInvalid: 'Please enter a valid email address (e.g. name@domain.com)',
    infoHint: 'A 6-digit verification code will be sent to your email to reset your password.',
  },
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);
  const isDark = isDarkMode;

  const { language, setLanguage, isRTL } = useLanguageStore();
  const { requestPasswordResetOtp } = useAuthStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isTablet, isTabletLandscape } = useResponsive();

  const [email, setEmail] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Large screen vs phone breakpoint
  const isLargeScreen = isTablet || width >= 720;

  const curLang = language === 'en' ? 'en' : 'ku';
  const strings = FORGOT_STRINGS[curLang];

  const handleToggleTheme = () => {
    setDarkMode(!isDarkMode);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(onboarding)/login' as never);
    }
  };

  const handleSend = async () => {
    setAuthError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setAuthError(strings.validationEmailRequired);
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setAuthError(strings.validationEmailInvalid);
      return;
    }

    setLoading(true);
    const { error } = await requestPasswordResetOtp(trimmed);
    setLoading(false);

    if (error) {
      setAuthError(error);
    } else {
      router.push('/(onboarding)/verify-reset-otp' as never);
    }
  };

  const handleDevBypass = async () => {
    try {
      const { initializeDatabase } = await import('@/lib/sqlite');
      await initializeDatabase();
    } catch {}
    const mockUser = {
      id: 'dev_user_1',
      uid: 'dev_user_1',
      email: email.trim() || 'demo@froshiar.store',
      displayName: 'Dev Administrator',
    };
    useAuthStore.setState({ user: mockUser as any, isLoading: false });
    const { useOnboardingStore } = await import('@/store/onboardingStore');
    useOnboardingStore.setState({ hasCompletedOnboarding: true });
    const { useBusinessStore } = await import('@/store/businessStore');
    useBusinessStore.setState({
      isSetupComplete: true,
      name: 'Froshiar Store',
      ownerUserId: 'dev_user_1',
    });
    router.replace('/(app)/dashboard');
  };

  // Dimensions
  const phoneSvgSize = Math.min(220, width * 0.54);
  const tabletSvgSize = isTabletLandscape ? 380 : 310;

  // Render Top Header Controls (Back Button + Dev bypass + Language Flag Dropdown + Theme Switcher)
  const renderTopControls = (showBack: boolean = true) => (
    <View style={[styles.topControlsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {/* Navigation / Dev Controls side */}
      <View style={{ minWidth: 1, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.8}
            style={[
              styles.backBtn,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#E2E8F0',
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

        {/* Dev Quick Login Bypass (if enabled) */}
        {(DEV_FORCE_ONBOARDING_PREVIEW || __DEV__) && (
          <TouchableOpacity
            onPress={handleDevBypass}
            activeOpacity={0.8}
            style={[
              styles.devBypassBtn,
              { backgroundColor: isDark ? 'rgba(51, 65, 85, 0.7)' : 'rgba(241, 245, 249, 0.9)' },
            ]}
          >
            <Text style={[styles.devBypassText, curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
              {strings.devBypass}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Settings side: Language picker + Dark mode toggle */}
      <View style={[styles.controlsGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Language Toggle Switch (On/Off Style) */}
        <LanguageToggleSwitch
          value={curLang === 'ku'}
          isDark={isDark}
          onToggle={(isKu) => setLanguage(isKu ? 'ku' : 'en')}
        />

        {/* Dark / Light Mode Toggle Button */}
        <TouchableOpacity
          onPress={handleToggleTheme}
          activeOpacity={0.8}
          style={[
            styles.themeBtn,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <Ionicons
            name={isDark ? 'sunny' : 'moon'}
            size={18}
            color={isDark ? '#F8C61E' : '#475569'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render Form Inputs & Action Buttons
  const renderFormFields = (isTabletLayout: boolean) => (
    <View style={styles.formContainer}>
      {/* Welcome Title & Subtitle */}
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
        <Text
          style={[
            isTabletLayout ? styles.tabletWelcomeSub : styles.mobileWelcomeSub,
            curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT },
            {
              color: isDark ? '#94A3B8' : '#64748B',
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
        >
          {strings.welcomeSub}
        </Text>
      </View>

      {/* Info Notice Box */}
      <View
        style={[
          styles.infoNoticeBox,
          {
            backgroundColor: isDark ? 'rgba(248, 198, 30, 0.08)' : '#FEFCE8',
            borderColor: isDark ? 'rgba(248, 198, 30, 0.25)' : '#FEF08A',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <Ionicons
          name="information-circle"
          size={20}
          color="#F8C61E"
          style={{ marginHorizontal: 6, marginTop: 1 }}
        />
        <Text
          style={[
            styles.infoNoticeText,
            curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT },
            {
              color: isDark ? '#E2E8F0' : '#854D0E',
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
        >
          {strings.infoHint}
        </Text>
      </View>

      {/* Input: Email */}
      <View
        style={[
          styles.pillInputWrapper,
          {
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderColor: isDark ? '#334155' : '#E2E8F0',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View
          style={[
            styles.inputIconCircle,
            { backgroundColor: isDark ? '#1E293B' : '#EEF2F6' },
          ]}
        >
          <Ionicons name="mail" size={17} color={isDark ? '#94A3B8' : '#64748B'} />
        </View>

        <TextInput
          style={[
            styles.pillTextInput,
            curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT },
            {
              color: isDark ? '#FFFFFF' : '#0F172A',
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
          placeholder={strings.emailPlaceholder}
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
      </View>

      {/* Error Banner */}
      {authError && <AuthErrorBanner message={authError} style={{ marginVertical: 8 }} />}

      {/* Gold Send Code Button */}
      <TouchableOpacity
        onPress={handleSend}
        activeOpacity={0.88}
        disabled={loading}
        style={[styles.goldSendBtn, { height: isTabletLayout ? 60 : 54 }]}
      >
        {loading ? (
          <ActivityIndicator color="#0F172A" size="small" />
        ) : (
          <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons
              name="paper-plane-outline"
              size={21}
              color="#0F172A"
              style={{ marginHorizontal: 8 }}
            />
            <Text
              style={[
                styles.goldSendText,
                curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {strings.sendBtn}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Back to Login link */}
      <TouchableOpacity
        onPress={() => router.replace('/(onboarding)/login' as never)}
        activeOpacity={0.7}
        style={styles.signInRow}
      >
        <View style={[styles.backToLoginContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons
            name={isRTL ? 'arrow-forward-outline' : 'arrow-back-outline'}
            size={18}
            color="#F8C61E"
            style={{ marginHorizontal: 6 }}
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

  // Dismiss keyboard when background is pressed
  const handleDismissDropdown = () => {
    Keyboard.dismiss();
  };

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
                  // Kurdish (RTL): Illustration on LEFT, Form on RIGHT
                  // English (LTR): Form on LEFT, Illustration on RIGHT
                  flexDirection: isRTL ? 'row' : 'row-reverse',
                },
              ]}
            >
              {/* Child 0: Illustration Box */}
              <View
                style={[
                  styles.tabletIllustrationBox,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: isDark ? '#1E293B' : '#F1F5F9',
                    minHeight: isTabletLandscape ? 580 : 500,
                    padding: isTabletLandscape ? 32 : 24,
                    borderRadius: 30,
                  },
                ]}
              >
                <SvgXml xml={FORGOT_PASSWORD_CUATE_SVG} width={tabletSvgSize} height={tabletSvgSize} />

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

              {/* Child 1: Content & Reset Form */}
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
                  {/* Top Controls Row */}
                  <View style={{ marginBottom: 20, zIndex: 100 }}>
                    {renderTopControls(true)}
                  </View>

                  {/* Form Fields */}
                  {renderFormFields(true)}
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
              {/* Top Illustration Area */}
              <MotiView
                from={{ opacity: 0, translateY: 15 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400 }}
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
                  <SvgXml xml={FORGOT_PASSWORD_CUATE_SVG} width={phoneSvgSize} height={phoneSvgSize} />
                </View>

                <Text
                  style={[
                    styles.mobileAppTitle,
                    curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    { color: isDark ? '#FFFFFF' : '#0F172A' },
                  ]}
                >
                  {strings.illustrationTitle}
                </Text>
                <Text
                  style={[
                    styles.mobileAppSub,
                    curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT },
                    { color: isDark ? '#94A3B8' : '#64748B' },
                  ]}
                >
                  {strings.mobileSub}
                </Text>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  mobileScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  mobileIllustrationSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  mobileSvgCircle: {
    borderRadius: 28,
    padding: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 12,
  },
  mobileAppTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  mobileAppSub: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 320,
  },
  mobileCardContainer: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
    marginTop: 10,
  },

  // Top Controls (Language dropdown, theme switch, dev bypass)
  topControlsRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  controlsGroup: {
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  devBypassBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  devBypassText: {
    color: '#F8C61E',
    fontSize: 12,
    fontWeight: '700',
  },

  themeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Form Fields
  formContainer: {
    width: '100%',
  },
  welcomeBox: {
    marginBottom: 16,
  },
  tabletWelcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  tabletWelcomeSub: {
    fontSize: 14,
    lineHeight: 22,
  },
  mobileWelcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  mobileWelcomeSub: {
    fontSize: 13,
    lineHeight: 20,
  },

  // Info Notice Box
  infoNoticeBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 19,
  },

  // Pill Input
  pillInputWrapper: {
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 56,
    marginBottom: 16,
  },
  inputIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  pillTextInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 10,
    height: '100%',
  },

  // Gold Button
  goldSendBtn: {
    backgroundColor: '#F8C61E',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F8C61E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
    marginTop: 6,
    marginBottom: 16,
  },
  buttonContentRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldSendText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },

  // Bottom Links
  signInRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  backToLoginContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInLinkText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
