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
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { MotiView } from 'moti';
import { Text } from '@/components/ui/AppText';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { SIGNUP_AMICO_SVG } from '@/constants/onboardingIllustrations';
import { DEV_FORCE_ONBOARDING_PREVIEW } from '@/constants/devPreview';
import { LanguageToggleSwitch } from '@/components/settings/LanguageToggleSwitch';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { AppleSignInButton } from '@/components/auth/AppleSignInButton';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { EMAIL_RE } from '@/lib/validation';

// Localized strings for Kurdish and English
const SIGNUP_STRINGS = {
  ku: {
    illustrationTitle: 'بەخێربێیت بۆ فرۆشیار',
    illustrationSub: 'هەژمارێکی نوێ دروست بکە و کۆنترۆڵی کار و فرۆشتنەکانت بکە بە سەردەمیانە',
    mobileSub: 'تۆمار ببە بۆ هاوکاتکردنی داتاکانت لە هەموو ئامێرەکانتدا',
    welcomeTitle: 'دروستکردنی هەژمار',
    welcomeSub: 'زانیارییەکانت بنووسە بۆ دروستکردنی هەژماری نوێ',
    namePlaceholder: 'ناوی تەواو (سیانی)',
    emailPlaceholder: 'ئیمەیڵ',
    passwordPlaceholder: 'وشەی نهێنی (لانیکەم ٦ پیت)',
    confirmPasswordPlaceholder: 'دووبارەکردنەوەی وشەی نهێنی',
    signUpBtn: 'هەژمار دروست بکە',
    googleBtn: 'بەردەوامبوون لەگەڵ Google',
    or: 'یان',
    haveAccount: 'پێشتر هەژمارت دروستکردووە؟',
    loginLink: 'چوونەژوورەوە',
    devBypass: 'داشبۆرد ⚡',
    nameRequired: 'تکایە ناوی تەواوت بنووسە',
    emailRequired: 'تکایە ئیمەیڵەکەت بنووسە',
    emailInvalid: 'تکایە ئیمەیڵێکی دروست بنووسە (نموونە: name@example.com)',
    passwordRequired: 'تکایە وشەی نهێنی بنووسە',
    passwordTooShort: 'وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت',
    passwordsDontMatch: 'وشە نهێنییەکان وەک یەک نین، تکایە دڵنیابەرەوە',
  },
  en: {
    illustrationTitle: 'Welcome to Froshiar',
    illustrationSub: 'Create a new account and take full control of your retail business',
    mobileSub: 'Sign up to synchronize your business data across all your devices',
    welcomeTitle: 'Create Account',
    welcomeSub: 'Fill in your details to create a new account',
    namePlaceholder: 'Full Name',
    emailPlaceholder: 'Email Address',
    passwordPlaceholder: 'Password (min. 6 characters)',
    confirmPasswordPlaceholder: 'Confirm Password',
    signUpBtn: 'Create Account',
    googleBtn: 'Continue with Google',
    or: 'or',
    haveAccount: 'Already have an account?',
    loginLink: 'Log In',
    devBypass: 'Dashboard ⚡',
    nameRequired: 'Please enter your full name',
    emailRequired: 'Please enter your email',
    emailInvalid: 'Please enter a valid email address',
    passwordRequired: 'Please enter a password',
    passwordTooShort: 'Password must be at least 6 characters',
    passwordsDontMatch: 'Passwords do not match',
  },
};

export default function SignUpScreen() {
  const router = useRouter();
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);
  const isDark = isDarkMode;

  const { language, setLanguage, isRTL } = useLanguageStore();
  const { signUpWithEmail, signInWithGoogle, signInWithApple, isLoading } = useAuthStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isTablet, isTabletLandscape } = useResponsive();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Large screen vs phone breakpoint
  const isLargeScreen = isTablet || width >= 720;

  const curLang = language === 'en' ? 'en' : 'ku';
  const strings = SIGNUP_STRINGS[curLang];

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

  const handleSignUp = async () => {
    if (!name.trim()) {
      setAuthError(strings.nameRequired);
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthError(strings.emailRequired);
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setAuthError(strings.emailInvalid);
      return;
    }
    if (!password) {
      setAuthError(strings.passwordRequired);
      return;
    }
    if (password.length < 6) {
      setAuthError(strings.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setAuthError(strings.passwordsDontMatch);
      return;
    }

    setAuthError(null);
    const { error, verificationEmailSent } = await signUpWithEmail(trimmedEmail, password, name.trim());
    if (error) {
      setAuthError(error);
    } else {
      router.replace({
        pathname: '/(onboarding)/verify-email' as never,
        params: { initialSendFailed: verificationEmailSent ? '0' : '1' },
      });
    }
  };

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

  const handleDevBypass = async () => {
    try {
      const { initializeDatabase } = await import('@/lib/sqlite');
      await initializeDatabase();
    } catch {}
    const mockUser = {
      id: 'dev_user_1',
      uid: 'dev_user_1',
      email: email.trim() || 'demo@froshiar.store',
      displayName: name.trim() || 'Dev Administrator',
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
      {/* Navigation / Dev side */}
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

      {/* Input 1: Full Name */}
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
          <Ionicons name="person-outline" size={17} color={isDark ? '#94A3B8' : '#64748B'} />
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
          placeholder={strings.namePlaceholder}
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      {/* Input 2: Email */}
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
          <Ionicons name="mail-outline" size={17} color={isDark ? '#94A3B8' : '#64748B'} />
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

      {/* Input 3: Password */}
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
          <Ionicons name="lock-closed-outline" size={17} color={isDark ? '#94A3B8' : '#64748B'} />
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
          placeholder={strings.passwordPlaceholder}
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          activeOpacity={0.7}
          style={styles.eyeToggleBtn}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={isDark ? '#94A3B8' : '#64748B'}
          />
        </TouchableOpacity>
      </View>

      {/* Input 4: Confirm Password */}
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
          <Ionicons name="shield-checkmark-outline" size={17} color={isDark ? '#94A3B8' : '#64748B'} />
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
          placeholder={strings.confirmPasswordPlaceholder}
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          activeOpacity={0.7}
          style={styles.eyeToggleBtn}
        >
          <Ionicons
            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={isDark ? '#94A3B8' : '#64748B'}
          />
        </TouchableOpacity>
      </View>

      {/* Error Banner */}
      {authError && <AuthErrorBanner message={authError} style={{ marginVertical: 8 }} />}

      {/* Gold Create Account Button */}
      <TouchableOpacity
        onPress={handleSignUp}
        activeOpacity={0.88}
        disabled={isLoading}
        style={[styles.goldSignupBtn, { height: isTabletLayout ? 60 : 54 }]}
      >
        {isLoading ? (
          <ActivityIndicator color="#0F172A" size="small" />
        ) : (
          <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons
              name="person-add-outline"
              size={21}
              color="#0F172A"
              style={{ marginHorizontal: 8 }}
            />
            <Text
              style={[
                styles.goldSignupText,
                curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {strings.signUpBtn}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Divider */}
      {Platform.OS !== 'android' && (
        <>
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
            <Text
              style={[
                styles.dividerText,
                curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT },
                { color: isDark ? '#64748B' : '#94A3B8' },
              ]}
            >
              {strings.or}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
          </View>

          {/* Social Logins */}
          <View style={styles.socialBtnsWrapper}>
            <GoogleSignInButton onPress={handleGoogle} loading={isLoading} label={strings.googleBtn} />
            <AppleSignInButton onPress={handleApple} loading={isLoading} />
          </View>
        </>
      )}

      {/* Already have an account -> Log in link */}
      <TouchableOpacity
        onPress={() => router.replace('/(onboarding)/login' as never)}
        activeOpacity={0.7}
        style={styles.signInRow}
      >
        <Text
          style={[
            styles.signInPrompt,
            curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT },
            { color: isDark ? '#94A3B8' : '#64748B' },
          ]}
        >
          {strings.haveAccount}{' '}
          <Text
            style={[
              styles.signInLinkText,
              curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: '#F8C61E' },
            ]}
          >
            {strings.loginLink}
          </Text>
        </Text>
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
              {/* Child 0: Illustration Box (ALWAYS on the LEFT side for RTL) */}
              <View
                style={[
                  styles.tabletIllustrationBox,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: isDark ? '#1E293B' : '#F1F5F9',
                    minHeight: isTabletLandscape ? 620 : 540,
                    padding: isTabletLandscape ? 32 : 24,
                    borderRadius: 30,
                  },
                ]}
              >
                <SvgXml xml={SIGNUP_AMICO_SVG} width={tabletSvgSize} height={tabletSvgSize} />

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

              {/* Child 1: Content & Signup Form (ALWAYS on the RIGHT side for RTL) */}
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
                  <View style={{ marginBottom: 12, zIndex: 100 }}>
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
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={[
                styles.mobileScrollContent,
                { paddingBottom: Math.max(insets.bottom, 28) },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Mobile Master Card Container */}
              <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 450 }}
                style={[
                  styles.mobileCardContainer,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                {/* Inner Illustration Card */}
                <View
                  style={[
                    styles.mobileIllustrationCard,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: isDark ? '#1E293B' : '#F1F5F9',
                    },
                  ]}
                >
                  <SvgXml xml={SIGNUP_AMICO_SVG} width={phoneSvgSize} height={phoneSvgSize} />

                  <Text
                    style={[
                      styles.mobileIllustrationTitle,
                      curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      { color: isDark ? '#FFFFFF' : '#0F172A' },
                    ]}
                  >
                    {strings.illustrationTitle}
                  </Text>
                  <Text
                    style={[
                      styles.mobileIllustrationSub,
                      curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT },
                      { color: isDark ? '#94A3B8' : '#64748B' },
                    ]}
                  >
                    {strings.mobileSub}
                  </Text>
                </View>

                {/* Form Section */}
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

  // --- Top Controls (Language, Theme, Dev, Back) ---
  topControlsRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 4,
    zIndex: 100,
  },
  controlsGroup: {
    alignItems: 'center',
    gap: 10,
    zIndex: 100,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  devBypassBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  devBypassText: {
    fontSize: 13,
    color: '#D4AF37',
    fontWeight: 'bold',
  },

  // --- Flag Dropdown Picker ---

  themeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // --- Form & Input Styles ---
  formContainer: {
    width: '100%',
  },
  welcomeBox: {
    marginBottom: 16,
  },
  mobileWelcomeTitle: {
    fontSize: 23,
    lineHeight: 34,
    fontWeight: 'bold',
  },
  mobileWelcomeSub: {
    fontSize: 13.5,
    lineHeight: 21,
    marginTop: 4,
  },
  tabletWelcomeTitle: {
    fontSize: 29,
    lineHeight: 42,
    fontWeight: 'bold',
  },
  tabletWelcomeSub: {
    fontSize: 15.5,
    lineHeight: 25,
    marginTop: 4,
  },
  pillInputWrapper: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  inputIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTextInput: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    paddingHorizontal: 12,
  },
  eyeToggleBtn: {
    padding: 8,
  },
  goldSignupBtn: {
    width: '100%',
    backgroundColor: '#F8C61E',
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F8C61E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
    marginTop: 6,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldSignupText: {
    fontSize: 16.5,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
  },
  socialBtnsWrapper: {
    gap: 10,
    marginBottom: 12,
  },
  signInRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 6,
  },
  signInPrompt: {
    fontSize: 14,
  },
  signInLinkText: {
    fontWeight: 'bold',
  },

  // --- Tablet / Large Screen Layout Styles ---
  tabletCenterWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tabletMasterCard: {
    width: '100%',
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 10,
  },
  tabletIllustrationBox: {
    flex: 1.1,
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabletIllustrationTextWrap: {
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 16,
  },
  tabletIllustrationTitle: {
    fontSize: 21,
    lineHeight: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tabletIllustrationSub: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 6,
  },
  tabletContentBox: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },

  // --- Mobile Phone Layout Styles ---
  mobileSafeContainer: {
    flex: 1,
  },
  mobileTopBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  mobileScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  mobileCardContainer: {
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 28,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  mobileIllustrationCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  mobileIllustrationTitle: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 12,
  },
  mobileIllustrationSub: {
    fontSize: 12.5,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
  },
});
