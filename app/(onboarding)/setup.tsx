import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { KeyboardAwareScrollView } from '@/components/common/KeyboardAwareScrollView';
import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingsTextInput as AppTextInput } from '@/components/settings/SettingsTextInput';
import { SettingsPrimaryButton as PrimaryButton } from '@/components/settings/SettingsPrimaryButton';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsBackground } from '@/components/settings/SettingsBackground';
import { SettingSwitch } from '@/components/settings/SettingSwitch';
import { LogoUploader } from '@/components/setup/LogoUploader';
import { BusinessTypeSelector } from '@/components/setup/BusinessTypeSelector';
import { useBusiness } from '@/hooks/useBusiness';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { hexToRgba } from '@/lib/colorUtils';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

export default function SetupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isRTL, textAlign } = useRTL();
  const { colors, isDark } = useAppTheme();
  const { isTablet, isTabletLandscape } = useResponsive();
  const isKu = useLanguageStore((s) => s.language === 'ku');

  const business = useBusiness();
  const user = useAuthStore((s) => s.user);

  // Pre-fill initial name and phone if available from auth profile
  const derivedInitialName =
    business.name?.trim() ||
    user?.displayName?.trim() ||
    (user?.email ? user.email.split('@')[0].replace(/[._]/g, ' ') : '') ||
    '';
  const derivedInitialPhone = business.phone?.trim() || '';

  const [name, setName] = useState(derivedInitialName);
  const [businessType, setBusinessType] = useState(business.type || 'General');
  const [phone, setPhone] = useState(derivedInitialPhone);
  const [address, setAddress] = useState(business.address ?? '');
  const [logoUri, setLogoUri] = useState<string | null>(business.logoUri ?? null);
  const [showOnDashboard, setShowOnDashboard] = useState(business.showOnDashboard ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert(
        t('common.required'),
        isKu ? 'تکایە ناوی بازرگانی بنووسە' : 'Business name is required'
      );
      return;
    }
    setSaving(true);
    try {
      await business.saveAndSetBusiness({
        name: name.trim(),
        type: businessType.trim() || 'General',
        phone: phone.trim(),
        address: address.trim(),
        logoUri,
        showOnDashboard,
      });

      // Mark onboarding as permanently complete
      useOnboardingStore.getState().completeOnboarding();

      // Track telemetry login with business details
      if (user) {
        import('@/lib/telemetry')
          .then((m) =>
            m.trackUserLogin({
              userId: user.id,
              email: user.email,
              phone: phone.trim() || undefined,
              displayName: user.displayName,
              businessName: name.trim(),
              provider: 'setup',
            })
          )
          .catch(() => {});
      }

      // Enter app dashboard
      router.replace('/(app)/dashboard');
    } catch {
      Alert.alert(
        t('common.error'),
        isKu ? 'هەڵەیەک ڕوویدا لە کاتی پاشەکەوتکردن' : 'Failed to save business profile'
      );
    } finally {
      setSaving(false);
    }
  }

  const handleSignOut = () => {
    Alert.alert(
      isKu ? 'چوونەدەرەوە' : 'Sign Out',
      isKu ? 'ئایا دڵنیایت لە چوونەدەرەوە لەم ئەکاونتە؟' : 'Are you sure you want to sign out?',
      [
        { text: isKu ? 'پاشگەزبوونەوە' : 'Cancel', style: 'cancel' },
        {
          text: isKu ? 'بەڵێ، چوونەدەرەوە' : 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await useAuthStore.getState().signOut();
            router.replace('/(onboarding)/login');
          },
        },
      ]
    );
  };

  const tabletInputLabel = isTablet
    ? {
        fontSize: isTabletLandscape ? 17 : 16,
        fontFamily: SETTINGS_KURDISH_FONT_BOLD,
        marginBottom: 8,
        color: isDark ? colors.gray300 : '#334155',
      }
    : undefined;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SettingsBackground />
        <AppHeader
          title={isKu ? 'پڕۆفایلی بازرگانی' : 'Business Profile'}
          showBack={true}
          onBack={handleSignOut}
        />

        <KeyboardAwareScrollView
          contentContainerStyle={[
            styles.body,
            isTablet && {
              maxWidth: isTabletLandscape ? 1040 : 860,
              alignSelf: 'center',
              width: '100%',
              paddingHorizontal: isTabletLandscape ? 28 : 20,
              paddingTop: 20,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Large Logo Upload Section */}
          <View style={[styles.logoSection, isTablet && { marginBottom: 28, paddingTop: 12 }]}>
            <LogoUploader
              uri={logoUri}
              onSelect={setLogoUri}
              size={isTabletLandscape ? 144 : isTablet ? 132 : 88}
            />
            <Text
              style={[
                styles.logoHint,
                {
                  color: isDark ? colors.gray400 : '#64748B',
                  fontSize: isTablet ? 15 : 12,
                  marginTop: isTablet ? 12 : 8,
                  fontFamily: isKu ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                },
              ]}
            >
              {isKu ? 'کلیک بکە بۆ گۆڕینی لۆگۆی بازرگانیەکەت' : 'Click to change your business logo'}
            </Text>
          </View>

          {/* 2. Main Business Details Card */}
          <SettingsCard
            style={[
              styles.card,
              isTablet && {
                padding: isTabletLandscape ? 32 : 26,
                borderRadius: 24,
                marginBottom: 24,
              },
            ]}
          >
            {/* Header with Storefront Icon */}
            <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View
                style={[
                  styles.headerIconWrap,
                  {
                    backgroundColor: hexToRgba(colors.primary, isDark ? 0.22 : 0.12),
                    borderColor: hexToRgba(colors.primary, isDark ? 0.38 : 0.24),
                    width: isTablet ? 48 : 38,
                    height: isTablet ? 48 : 38,
                    borderRadius: isTablet ? 14 : 11,
                  },
                ]}
              >
                <Ionicons name="storefront" size={isTablet ? 24 : 19} color={colors.primary} />
              </View>

              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text
                  style={[
                    styles.sectionTitle,
                    isTablet && {
                      fontSize: isTabletLandscape ? 21 : 19,
                      fontFamily: SETTINGS_KURDISH_FONT_BOLD,
                    },
                    { textAlign, color: colors.black },
                  ]}
                >
                  {isKu ? 'زانیاری بازرگانی' : 'Business Information'}
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    isTablet && { fontSize: 14, marginTop: 3 },
                    { textAlign, color: colors.gray400 },
                  ]}
                >
                  {isKu
                    ? 'زانیاری و ناسنامەی سەرەکی فرۆشگاکەت بۆ سەر پسوولە و ئەپ'
                    : 'Store information & identity for invoices and app'}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.divider,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                  marginVertical: isTablet ? 22 : 14,
                },
              ]}
            />

            {/* Inputs: 2 columns on Tablet for Name & Phone, followed by Address and Business Type */}
            {isTablet ? (
              <View style={{ gap: 4 }}>
                <View style={[styles.twoColRow, { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 16 }]}>
                  <View style={{ flex: 1 }}>
                    <AppTextInput
                      label={isKu ? 'ناوی بازرگانی *' : 'Business Name *'}
                      placeholder={isKu ? 'ناوی مارکێت / فرۆشگاکەت بنووسە' : 'Enter your store name'}
                      value={name}
                      onChangeText={setName}
                      labelStyle={tabletInputLabel}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppTextInput
                      label={isKu ? 'ژمارەی تەلەفۆن' : 'Phone Number'}
                      placeholder={isKu ? 'بۆ نموونە: 4567 123 0770' : 'e.g. 0770 123 4567'}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      labelStyle={tabletInputLabel}
                    />
                  </View>
                </View>

                <AppTextInput
                  label={isKu ? 'ناونیشان' : 'Address'}
                  placeholder={isKu ? 'بۆ نموونە: سلێمانی، کانی با' : 'e.g. Sulaymaniyah, Main St'}
                  value={address}
                  onChangeText={setAddress}
                  labelStyle={tabletInputLabel}
                />

                <BusinessTypeSelector
                  value={businessType}
                  onChangeText={setBusinessType}
                  inputLabelStyle={tabletInputLabel}
                />
              </View>
            ) : (
              <>
                <AppTextInput
                  label={isKu ? 'ناوی بازرگانی *' : 'Business Name *'}
                  placeholder={isKu ? 'ناوی مارکێت / فرۆشگاکەت بنووسە' : 'Enter your store name'}
                  value={name}
                  onChangeText={setName}
                />
                <AppTextInput
                  label={isKu ? 'ژمارەی تەلەفۆن' : 'Phone Number'}
                  placeholder={isKu ? 'بۆ نموونە: 4567 123 0770' : 'e.g. 0770 123 4567'}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <AppTextInput
                  label={isKu ? 'ناونیشان' : 'Address'}
                  placeholder={isKu ? 'بۆ نموونە: سلێمانی، کانی با' : 'e.g. Sulaymaniyah, Main St'}
                  value={address}
                  onChangeText={setAddress}
                />
                <BusinessTypeSelector
                  value={businessType}
                  onChangeText={setBusinessType}
                />
              </>
            )}
          </SettingsCard>

          {/* 3. Dashboard Visibility Card */}
          <SettingsCard
            style={[
              styles.card,
              isTablet && {
                padding: isTabletLandscape ? 32 : 26,
                borderRadius: 24,
                marginBottom: 24,
              },
            ]}
          >
            <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View
                style={[
                  styles.headerIconWrap,
                  {
                    backgroundColor: hexToRgba(colors.primary, isDark ? 0.22 : 0.12),
                    borderColor: hexToRgba(colors.primary, isDark ? 0.38 : 0.24),
                    width: isTablet ? 48 : 38,
                    height: isTablet ? 48 : 38,
                    borderRadius: isTablet ? 14 : 11,
                  },
                ]}
              >
                <Ionicons name="eye-outline" size={isTablet ? 24 : 19} color={colors.primary} />
              </View>

              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text
                  style={[
                    styles.sectionTitle,
                    isTablet && {
                      fontSize: isTabletLandscape ? 21 : 19,
                      fontFamily: SETTINGS_KURDISH_FONT_BOLD,
                    },
                    { textAlign, color: colors.black },
                  ]}
                >
                  {isKu ? 'پیشاندانی کارتی بازرگانی لە داشبۆرد' : 'Business Card on Dashboard'}
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    isTablet && { fontSize: 14, marginTop: 3 },
                    { textAlign, color: colors.gray400 },
                  ]}
                >
                  {isKu
                    ? 'کارتی ناو و ناسنامەی فرۆشگاکەت لە سەرەوەی داشبۆرد دەردەکەوێت'
                    : 'Shows your store identity banner at top of dashboard'}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.divider,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                  marginVertical: isTablet ? 18 : 12,
                },
              ]}
            />

            <SettingSwitch
              icon={showOnDashboard ? 'eye-outline' : 'eye-off-outline'}
              label={isKu ? 'پیشاندانی بانەری بازرگانی' : 'Show business banner'}
              sub={isKu ? 'لە بەشی سەرەوەی داشبۆرد پشان دەدرێت' : 'Displayed at the top of the dashboard'}
              value={showOnDashboard}
              onToggle={(val) => {
                setShowOnDashboard(val);
                business.setShowOnDashboard(val);
              }}
            />
          </SettingsCard>

          {/* 4. Large Save & Enter Action Button */}
          <PrimaryButton
            label={isKu ? 'پاشەکەوتکردن و دەستپێکردن' : 'Save and Get Started'}
            onPress={handleSave}
            loading={saving}
          />

          <View style={{ height: isTablet ? 48 : 32 }} />
        </KeyboardAwareScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16, paddingTop: 14 },

  logoSection: { alignItems: 'center', marginBottom: 20, paddingTop: 8 },
  logoHint: { fontSize: 12, marginTop: 8 },

  card: { marginBottom: 16 },
  cardHeader: {
    alignItems: 'center',
  },
  headerIconWrap: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  twoColRow: {
    width: '100%',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
});
