import React, { useState, useEffect } from 'react';
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
import { useOnboardingStore } from '@/store/onboardingStore';
import { useBusinessStore } from '@/store/businessStore';
import { TABLET_LOGIN_BRO_SVG } from '@/constants/onboardingIllustrations';
import { DEV_FORCE_ONBOARDING_PREVIEW } from '@/constants/devPreview';
import { LanguageToggleSwitch } from '@/components/settings/LanguageToggleSwitch';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { AppleSignInButton } from '@/components/auth/AppleSignInButton';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';

// Official multi-color Google 'G' icon SVG for compact mobile social login button
const GOOGLE_ICON_SVG = `<svg viewBox="0 0 24 24" width="22" height="22">
  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
</svg>`;

// Localized strings for Kurdish, Arabic, and English
const LOGIN_STRINGS = {
  ku: {
    illustrationTitle: 'سیستەمی بەڕێوەبردنی فرۆشیار',
    illustrationSub: 'بەهێزترین و پێشکەوتووترین سیستەمی فرۆشتن و کۆگای سەردەمیانە',
    mobileSub: 'فرۆشتن، کڕین و کۆگاکەت بە ئاسانی بەڕێوەببە',
    welcomeTitle: 'سڵاو بەخێربێیتەوە',
    welcomeSub: 'بڕۆ ژوورەوە بۆ ناو هەژمارەکەت',
    usernamePlaceholder: 'ناوی بەکارهێنەر یان ئیمەیڵ',
    passwordPlaceholder: 'وشەی نهێنی',
    forgotPassword: 'وشەی نهێنیت لەبیرکردووە؟',
    loginBtn: 'چوونەژوورەوە',
    googleBtn: 'بەردەوامبوون لەگەڵ Google',
    or: 'یان',
    noAccount: 'هەژمارت نییە؟',
    signUpLink: 'خۆت تۆمار بکە',
    devBypass: 'داشبۆرد ⚡',
    validationError: 'تکایە ئیمەیڵ و وشەی نهێنی بنووسە',
  },
  ar: {
    illustrationTitle: 'نظام إدارة فروشيار',
    illustrationSub: 'أقوى وأحدث نظام متطور لإدارة المبيعات ونقاط البيع والمخزون',
    mobileSub: 'أدر مبيعاتك ومشترياتك ومخزونك بكل سهولة',
    welcomeTitle: 'مرحباً بعودتك',
    welcomeSub: 'سجّل الدخول للوصول إلى حسابك',
    usernamePlaceholder: 'اسم المستخدم أو البريد الإلكتروني',
    passwordPlaceholder: 'كلمة المرور',
    forgotPassword: 'هل نسيت كلمة المرور؟',
    loginBtn: 'تسجيل الدخول',
    googleBtn: 'المتابعة باستخدام Google',
    or: 'أو',
    noAccount: 'ليس لديك حساب؟',
    signUpLink: 'إنشاء حساب جديد',
    devBypass: 'لوحة التحكم ⚡',
    validationError: 'يرجى إدخال البريد الإلكتروني وكلمة المرور',
  },
  en: {
    illustrationTitle: 'Froshiar Management System',
    illustrationSub: 'The modern and advanced POS, retail & inventory system',
    mobileSub: 'Manage your sales, purchases and inventory with ease',
    welcomeTitle: 'Welcome Back',
    welcomeSub: 'Sign in to access your account',
    usernamePlaceholder: 'Username or Email',
    passwordPlaceholder: 'Password',
    forgotPassword: 'Forgot password?',
    loginBtn: 'Log In',
    googleBtn: 'Continue with Google',
    or: 'or',
    noAccount: "Don't have an account?",
    signUpLink: 'Sign up',
    devBypass: 'Dashboard ⚡',
    validationError: 'Please enter your email and password',
  },
};

export default function LoginScreen() {
  const router = useRouter();
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);
  const isDark = isDarkMode;

  const { language, setLanguage, isRTL } = useLanguageStore();
  const { signInWithGoogle, signInWithApple, signInWithEmail, isLoading } = useAuthStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isTablet, isTabletLandscape } = useResponsive();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Large screen vs phone breakpoint
  const isLargeScreen = isTablet || width >= 720;
  const isDesktopOrWeb = isLargeScreen || Platform.OS === 'web';

  const curLang: 'ku' | 'en' | 'ar' = language === 'en' ? 'en' : language === 'ar' ? 'ar' : 'ku';
  const strings = LOGIN_STRINGS[curLang];

  const handleToggleTheme = () => {
    setDarkMode(!isDarkMode);
  };

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password) {
      setAuthError(strings.validationError);
      return;
    }
    setAuthError(null);
    useAuthStore.setState({ isLoading: true });

    try {
      // 1. Check if this is an employee or store manager account created via Management Hub / Admin Panel
      try {
        const { authenticateEmployee, recordEmployeeLogin } = await import('@/lib/management/managementService');
        const empResult = await authenticateEmployee(email.trim(), password);
        if (empResult.success && empResult.account) {
          const emp = empResult.account;
          const { useManagementStore } = await import('@/store/managementStore');
          const { ALL_ACTIVE_PERMISSIONS } = await import('@/lib/management/types');
          const isStoreManager =
            emp.role === 'manager' ||
            emp.role === 'user' ||
            !emp.managerEmail ||
            emp.managerEmail.toLowerCase() === emp.email.toLowerCase();

          // Clean reset of all management and online store state before binding
          useManagementStore.getState().resetAllManagementState();
          try {
            const { useOnlineStoreStore } = await import('@/store/onlineStoreStore');
            await useOnlineStoreStore.getState().resetStoreState();
          } catch {}

          if (isStoreManager) {
            // Log in as Store Manager / Desktop Owner
            useManagementStore.getState().clearEmployeeSession();
            useManagementStore.getState().setCurrentUserAccount(emp);
            useManagementStore.setState({
              isManager: emp.role === 'manager',
              isEmployee: false,
              currentUserAccount: emp,
              currentPermissions: ALL_ACTIVE_PERMISSIONS,
            });
            // Subscribe to their managed staff
            useManagementStore.getState().initManagerSubscription(emp.email);
          } else {
            // Log in as Employee
            useManagementStore.getState().setCurrentEmployee(emp);
            useManagementStore.getState().initEmployeeLiveSubscription(emp.email);
          }

          await recordEmployeeLogin(emp.email);

          // Direct business sync to manager's email namespace with complete data bleed prevention
          const { useBusinessStore } = await import('@/store/businessStore');
          const prevOwner = useBusinessStore.getState().ownerUserId;
          const targetOwner = (isStoreManager ? emp.email : (emp.managerEmail || emp.email)).trim().toLowerCase();

          if (prevOwner && prevOwner.toLowerCase() !== targetOwner.toLowerCase()) {
            // Device has data from a different manager or account — wipe completely to isolate
            const { wipeAllBusinessData } = await import('@/lib/sqlite');
            await wipeAllBusinessData();
            useBusinessStore.getState().clearBusiness();
            try {
              const { clearStoreApiKey } = await import('@/lib/onlineStore/storage');
              await clearStoreApiKey();
            } catch {}
          }
          useBusinessStore.getState().setOwnerUserId(targetOwner);

          // Load local business profile if it exists so isSetupComplete is true BEFORE setting user
          const { loadBusiness } = await import('@/lib/sqlite');
          const existingBiz = await loadBusiness();
          if (existingBiz && existingBiz.name && existingBiz.name.trim()) {
            useBusinessStore.getState().setBusiness({
              name: existingBiz.name.trim(),
              type: existingBiz.type || 'General',
              phone: existingBiz.phone || '',
              address: existingBiz.address || '',
              logoUri: existingBiz.logoPath || null,
            });
          } else {
            // Employee and manager accounts never go through the initial store creation wizard
            useBusinessStore.setState({ isSetupComplete: true });
          }

          useOnboardingStore.getState().completeOnboarding();

          const appUser = {
            id: emp.id,
            uid: emp.id,
            email: emp.email,
            displayName: emp.displayName,
          };
          useAuthStore.setState({ user: appUser as any, isLoading: false });

          router.replace('/(app)/dashboard');
          return;
        } else if (empResult.error === 'ACCOUNT_SUSPENDED') {
          setAuthError(isRTL ? 'ئەم ئەکاونتە ڕاگیراوە لەلایەن بەڕێوەبەرەوە.' : 'This account has been suspended by management.');
          return;
        } else if (empResult.error === 'PLATFORM_MISMATCH_MACOS') {
          setAuthError(isRTL ? 'ئەم هەژمارە تایبەتە بە کۆمپیوتەری ماکبووک (macOS).' : 'This account is restricted to macOS devices.');
          return;
        } else if (empResult.error === 'PLATFORM_MISMATCH_WINDOWS') {
          setAuthError(isRTL ? 'ئەم هەژمارە تایبەتە بە کۆمپیوتەری ویندۆز (Windows).' : 'This account is restricted to Windows devices.');
          return;
        } else if (empResult.error === 'WRONG_PASSWORD') {
          setAuthError(isRTL ? 'وشەی نهێنی هەڵەیە.' : 'Incorrect password.');
          return;
        }
      } catch (e) {
        console.warn('[Login] Employee auth check failed:', e);
      }

      // 2. Standard Firebase auth fallback
      const { error, needsVerification } = await signInWithEmail(email.trim(), password);
      if (error) {
        setAuthError(error);
      } else if (needsVerification) {
        router.replace('/(onboarding)/verify-email' as never);
      } else {
        const { useManagementStore } = await import('@/store/managementStore');
        useManagementStore.getState().clearEmployeeSession();
        useOnboardingStore.getState().completeOnboarding();
        const isComplete = useBusinessStore.getState().isSetupComplete;
        if (!isComplete) {
          router.replace('/(onboarding)/setup' as never);
        } else {
          router.replace('/(app)/dashboard');
        }
      }
    } finally {
      useAuthStore.setState({ isLoading: false });
    }
  };

  const handleGoogle = async () => {
    setAuthError(null);
    useAuthStore.setState({ isLoading: true });
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setAuthError(error);
      } else {
        const { useManagementStore } = await import('@/store/managementStore');
        useManagementStore.getState().clearEmployeeSession();
        useOnboardingStore.getState().completeOnboarding();
        const isComplete = useBusinessStore.getState().isSetupComplete;
        if (!isComplete) {
          router.replace('/(onboarding)/setup' as never);
        } else {
          router.replace('/(app)/dashboard');
        }
      }
    } finally {
      useAuthStore.setState({ isLoading: false });
    }
  };

  const handleApple = async () => {
    setAuthError(null);
    useAuthStore.setState({ isLoading: true });
    try {
      const { error } = await signInWithApple();
      if (error) {
        setAuthError(error);
      } else {
        const { useManagementStore } = await import('@/store/managementStore');
        useManagementStore.getState().clearEmployeeSession();
        useOnboardingStore.getState().completeOnboarding();
        const isComplete = useBusinessStore.getState().isSetupComplete;
        if (!isComplete) {
          router.replace('/(onboarding)/setup' as never);
        } else {
          router.replace('/(app)/dashboard');
        }
      }
    } finally {
      useAuthStore.setState({ isLoading: false });
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(onboarding)/welcome' as never);
    }
  };

  const handleDevBypass = async () => {
    try {
      const { initializeDatabase } = await import('@/lib/sqlite');
      await initializeDatabase();
    } catch {}
    const { useManagementStore } = await import('@/store/managementStore');
    useManagementStore.getState().resetAllManagementState();
    const mockUser = {
      id: 'dev_user_1',
      uid: 'dev_user_1',
      email: 'demo@froshiar.store',
      displayName: 'Demo Account',
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
  const phoneSvgSize = Math.min(168, width * 0.44);
  const tabletSvgSize = isTabletLandscape ? 360 : 300;

  // Render Top Header Controls (Unified Centered Pill: Language Toggle + Dark/Light Mode)
  const renderTopControls = (showBack: boolean = false) => (
    <View style={styles.topControlsCenteredRow}>
      {showBack && (
        <TouchableOpacity
          onPress={handleBack}
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

      {/* Unified Centered Capsule / Pill Bar (تەبلەکە) */}
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

        {/* Language Toggle Switch (3-Way: EN | AR | KU) */}
        <LanguageToggleSwitch
          language={curLang}
          isDark={isDark}
          embedded
          onChangeLanguage={(newLang) => setLanguage(newLang)}
        />
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

      {/* Input 1: Username / Email */}
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
          <Ionicons name="person" size={17} color={isDark ? '#94A3B8' : '#64748B'} />
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
          placeholder={strings.usernamePlaceholder}
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
      </View>

      {/* Input 2: Password */}
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
          <Ionicons name="lock-closed" size={17} color={isDark ? '#94A3B8' : '#64748B'} />
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

        {/* Eye icon to toggle password visibility */}
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

      {/* Forgot Password Row */}
      <TouchableOpacity
        onPress={() => router.push('/(onboarding)/forgot-password' as never)}
        activeOpacity={0.7}
        style={[styles.forgotPasswordRow, { alignSelf: isRTL ? 'flex-start' : 'flex-end' }]}
      >
        <Text
          style={[
            styles.forgotPasswordText,
            curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT },
            { color: isDark ? '#94A3B8' : '#64748B' },
          ]}
        >
          {strings.forgotPassword}
        </Text>
      </TouchableOpacity>

      {/* Error Banner */}
      {authError && <AuthErrorBanner message={authError} style={{ marginVertical: 8 }} />}

      {isTabletLayout ? (
        <>
          {/* Gold Login Button (Tablet) */}
          <TouchableOpacity
            onPress={handleEmailSignIn}
            activeOpacity={0.88}
            disabled={isLoading}
            style={[styles.goldLoginBtn, { height: 60 }]}
          >
            {isLoading ? (
              <ActivityIndicator color="#0F172A" size="small" />
            ) : (
              <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name="log-in-outline"
                  size={22}
                  color="#0F172A"
                  style={{ marginHorizontal: 8 }}
                />
                <Text
                  style={[
                    styles.goldLoginText,
                    curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {strings.loginBtn}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Divider and Social Logins - strictly for mobile; hidden on Desktop */}
          {!isDesktopOrWeb && (
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

          {/* Desktop Offline Local Mode Button */}
          {isLargeScreen && (
            <TouchableOpacity
              onPress={handleDevBypass}
              activeOpacity={0.85}
              style={[
                styles.offlineDesktopBtn,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#CBD5E1',
                },
              ]}
            >
              <Ionicons name="desktop-outline" size={20} color={isDark ? '#F8C61E' : '#D4AF37'} />
              <Text
                style={[
                  styles.offlineDesktopBtnText,
                  curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  { color: isDark ? '#F1F5F9' : '#0F172A' },
                ]}
              >
                {curLang === 'ku'
                  ? '💻 چوونەژوورەوەی ئۆفلاین (دۆخی لۆکاڵ - بێ ئینتەرنێت)'
                  : curLang === 'ar'
                  ? '💻 الدخول في وضع عدم الاتصال (محلي - بدون إنترنت)'
                  : '💻 Sign in Offline (Local POS Mode)'}
              </Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        /* Mobile: Unified Row with 50% Login Button + Google & Apple Buttons */
        <View style={[styles.mobileActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Main Login Button (takes ~50%) */}
          <TouchableOpacity
            onPress={handleEmailSignIn}
            activeOpacity={0.88}
            disabled={isLoading}
            style={styles.mobileHalfLoginBtn}
          >
            {isLoading ? (
              <ActivityIndicator color="#0F172A" size="small" />
            ) : (
              <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name="log-in-outline"
                  size={20}
                  color="#0F172A"
                  style={{ marginHorizontal: 5 }}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.mobileHalfLoginText,
                    curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {strings.loginBtn}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Social Icons Group (Google & Apple) */}
          <View style={[styles.mobileSocialGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Google Button */}
            <TouchableOpacity
              onPress={handleGoogle}
              activeOpacity={0.82}
              disabled={isLoading}
              style={[
                styles.mobileSocialBtn,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#CBD5E1',
                },
              ]}
            >
              <SvgXml xml={GOOGLE_ICON_SVG} width={22} height={22} />
            </TouchableOpacity>

            {/* Apple Button (iOS only) */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                onPress={handleApple}
                activeOpacity={0.82}
                disabled={isLoading}
                style={[
                  styles.mobileSocialBtn,
                  {
                    backgroundColor: isDark ? '#000000' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#0F172A',
                  },
                ]}
              >
                <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Don't have an account -> Sign up link (mobile only; desktop shows credential note) */}
      {!isDesktopOrWeb ? (
        <TouchableOpacity
          onPress={() => router.push('/(onboarding)/signup' as never)}
          activeOpacity={0.7}
          style={styles.signUpRow}
        >
          <Text
            style={[
              styles.signUpPrompt,
              curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT },
              { color: isDark ? '#94A3B8' : '#64748B' },
            ]}
          >
            {strings.noAccount}{' '}
            <Text
              style={[
                styles.signUpLinkText,
                curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                { color: '#F8C61E' },
              ]}
            >
              {strings.signUpLink}
            </Text>
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={{ marginTop: 22, alignItems: 'center' }}>
          <Text
            style={[
              {
                fontSize: 12.5,
                color: isDark ? '#94A3B8' : '#64748B',
                textAlign: 'center',
              },
              curLang === 'ku' && { fontFamily: SETTINGS_KURDISH_FONT },
            ]}
          >
            {curLang === 'ku'
              ? '🔒 هەژماری فرۆشیار و وشەی نهێنی لەلایەن بەڕێوەبەرەوە دابین دەکرێت'
              : curLang === 'ar'
              ? '🔒 يتم تزويد حساب المتجر وكلمة المرور من قبل المسؤول'
              : '🔒 Store account and login password are provided by administration'}
          </Text>
        </View>
      )}
    </View>
  );

  // Dismiss keyboard when background is pressed (mobile only)
  const handleDismissDropdown = () => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
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
                  // English (LTR): Form on LEFT, Illustration on RIGHT (per user request)
                  flexDirection: isRTL ? 'row' : 'row-reverse',
                },
              ]}
            >
              {/* Child 0: Illustration Box (ALWAYS on the LEFT side) */}
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
                <SvgXml xml={TABLET_LOGIN_BRO_SVG} width={tabletSvgSize} height={tabletSvgSize} />

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

              {/* Child 1: Content & Login Form (ALWAYS on the RIGHT side) */}
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
                    {renderTopControls()}
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
  // Layout for Mobile Phones (Reference Image Style)
  // ==========================================
  return (
    <TouchableWithoutFeedback onPress={handleDismissDropdown}>
      <View style={[styles.screen, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.mobileSafeContainer}>
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
                {/* Embedded Controls inside the card */}
                <View style={{ marginBottom: 12, width: '100%', zIndex: 100 }}>
                  {renderTopControls()}
                </View>

                {/* Inner Illustration Box */}
                <View
                  style={[
                    styles.mobileIllustrationCard,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: isDark ? '#1E293B' : '#F1F5F9',
                    },
                  ]}
                >
                  <SvgXml xml={TABLET_LOGIN_BRO_SVG} width={phoneSvgSize} height={phoneSvgSize} />

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

  // --- Top Controls (Language, Theme, Unified Centered Pill) ---
  topControlsCenteredRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 4,
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
    top: 3,
    width: 38,
    height: 38,
    borderRadius: 19,
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
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 101,
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
    marginBottom: 14,
  },
  mobileWelcomeTitle: {
    fontSize: 23,
    lineHeight: 34,
    fontWeight: 'bold',
  },
  mobileWelcomeSub: {
    fontSize: 13.5,
    lineHeight: 21,
    marginTop: 3,
  },
  tabletWelcomeTitle: {
    fontSize: 30,
    lineHeight: 44,
    fontWeight: 'bold',
  },
  tabletWelcomeSub: {
    fontSize: 16,
    lineHeight: 26,
    marginTop: 4,
  },
  pillInputWrapper: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  inputIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  forgotPasswordRow: {
    marginTop: -2,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
  },
  mobileActionsRow: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  mobileHalfLoginBtn: {
    flex: 1.15,
    height: 50,
    backgroundColor: '#F8C61E',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    shadowColor: '#F8C61E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mobileHalfLoginText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  mobileSocialGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  mobileSocialBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  goldLoginBtn: {
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
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldLoginText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
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
    marginBottom: 14,
  },
  signUpRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  signUpPrompt: {
    fontSize: 14,
  },
  signUpLinkText: {
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
    paddingTop: 12,
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
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  mobileIllustrationTitle: {
    fontSize: 16.5,
    lineHeight: 25,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  mobileIllustrationSub: {
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 3,
    paddingHorizontal: 8,
  },
  offlineDesktopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 12,
    gap: 8,
  },
  offlineDesktopBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
});
