import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { useModuleStore } from '@/store/moduleStore';
import { hexToRgba } from '@/lib/colorUtils';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

export default function BusinessProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isRTL, textAlign } = useRTL();
  const { colors, isDark } = useAppTheme();
  const { isTablet, isTabletLandscape } = useResponsive();
  const isKu = useLanguageStore((s) => s.language === 'ku');

  const business = useBusiness();
  const showDashboardNavigation = useModuleStore((s) => s.showDashboardNavigation ?? true);
  const setShowDashboardNavigation = useModuleStore((s) => s.setShowDashboardNavigation);

  const [name, setName] = useState(business.name ?? '');
  const [businessType, setBusinessType] = useState(business.type ?? '');
  const [phone, setPhone] = useState(business.phone ?? '');
  const [address, setAddress] = useState(business.address ?? '');
  const [logoUri, setLogoUri] = useState<string | null>(business.logoUri);
  const [showOnDashboard, setShowOnDashboard] = useState(business.showOnDashboard ?? false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert(t('common.required'), t('settings.profileScreen.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      await business.saveAndSetBusiness({
        name: name.trim(),
        type: businessType.trim(),
        phone: phone.trim(),
        address: address.trim(),
        logoUri,
        showOnDashboard,
      });
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('settings.profileScreen.saveError'));
    } finally {
      setSaving(false);
    }
  }

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
        <SettingsBackground />
        <AppHeader title={t('settings.profileScreen.title')} showBack />

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
              {t('settings.profileScreen.logoHint')}
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
            {/* Header with Icon */}
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
                  {t('settings.profileScreen.businessInfo')}
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
                      label={t('settings.profileScreen.nameStar')}
                      placeholder={t('settings.profileScreen.namePlaceholder')}
                      value={name}
                      onChangeText={setName}
                      labelStyle={tabletInputLabel}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppTextInput
                      label={t('settings.profileScreen.phone')}
                      placeholder={t('settings.profileScreen.phonePlaceholder')}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      labelStyle={tabletInputLabel}
                    />
                  </View>
                </View>

                <AppTextInput
                  label={t('settings.profileScreen.address')}
                  placeholder={t('settings.profileScreen.addressPlaceholder')}
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
                  label={t('settings.profileScreen.nameStar')}
                  placeholder={t('settings.profileScreen.namePlaceholder')}
                  value={name}
                  onChangeText={setName}
                />
                <AppTextInput
                  label={t('settings.profileScreen.phone')}
                  placeholder={t('settings.profileScreen.phonePlaceholder')}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <AppTextInput
                  label={t('settings.profileScreen.address')}
                  placeholder={t('settings.profileScreen.addressPlaceholder')}
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

          {/* 3. Dashboard Visibility Toggles Card */}
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
                <Ionicons name="options" size={isTablet ? 24 : 19} color={colors.primary} />
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
                  {isKu ? 'پیشاندانی داشبۆرد و ناڤیگەیشن' : 'Dashboard & Navigation'}
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    isTablet && { fontSize: 14, marginTop: 3 },
                    { textAlign, color: colors.gray400 },
                  ]}
                >
                  {isKu
                    ? 'هەڵبژاردنی دەرکەوتنی کارتی بازرگانی و ناڤیگەیشن لە پەڕەی سەرەکیدا'
                    : 'Choose visibility of business banner on dashboard'}
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
              label={t('settings.profileScreen.showOnDashboard')}
              sub={t('settings.profileScreen.showOnDashboardSub')}
              value={showOnDashboard}
              onToggle={(val) => {
                setShowOnDashboard(val);
                business.setShowOnDashboard(val);
              }}
            />
            <View
              style={[
                styles.switchDivider,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                  marginVertical: isTablet ? 14 : 10,
                },
              ]}
            />
            <SettingSwitch
              icon="compass-outline"
              label={t('settings.customization.showNavTitle')}
              sub={t('settings.customization.showNavSub')}
              value={showDashboardNavigation}
              onToggle={(val) => {
                setShowDashboardNavigation(val);
              }}
            />
          </SettingsCard>

          {/* 4. Large Save Changes Action Button */}
          <PrimaryButton
            label={t('settings.profileScreen.saveChanges')}
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
  switchDivider: { height: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
});
