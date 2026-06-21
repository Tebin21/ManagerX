import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '@/components/common/AppHeader';
import { SettingSection } from '@/components/settings/SettingSection';
import { SettingRow } from '@/components/settings/SettingRow';
import { TutorialsCard } from '@/components/settings/TutorialsCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useLanguageStore } from '@/store/languageStore';
import { useLicenseStore } from '@/store/licenseStore';
import { Colors } from '@/constants/colors';
import { fmtExchangeRate } from '@/utils/formatters';
import { useRTL } from '@/lib/rtl';

export default function SettingsScreen() {
  const router  = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const business   = useBusinessStore();
  const isDarkMode   = useSettingsStore((s) => s.isDarkMode);
  const exchangeRate = useSettingsStore((s) => s.exchangeRate);
  const setDarkMode  = useSettingsStore((s) => s.setDarkMode);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const language     = useLanguageStore((s) => s.language);
  const setLanguage  = useLanguageStore((s) => s.setLanguage);
  const signOut      = useAuthStore((s) => s.signOut);
  const itemLimit    = useLicenseStore((s) => s.limit);

  const { flexDirection } = useRTL();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut,    setIsLoggingOut]    = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    setLanguage('en');
    setDarkMode(false);
    setAccentColor(null);
    // Replace the entire stack — user cannot navigate back into the app
    router.replace('/(onboarding)/login' as never);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('settings.title')} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Tutorials — premium featured entry */}
        <TutorialsCard />

        {/* Business */}
        <SettingSection title={t('settings.businessProfile')}>
          <SettingRow
            icon="business"
            label={t('settings.businessProfile')}
            sub={business.name || t('settings.businessProfileSub')}
            onPress={() => router.push('/(app)/settings/profile' as never)}
          />
        </SettingSection>

        {/* Plan */}
        <SettingSection title={t('settings.plan')}>
          <SettingRow
            icon="rocket"
            label={t('settings.upgradeItemLimit')}
            sub={t('settings.upgradeItemLimitSub', { limit: itemLimit })}
            onPress={() => router.push('/(app)/settings/plan-limits' as never)}
          />
        </SettingSection>

        {/* Preferences */}
        <SettingSection title={t('settings.preferences')}>
          <SettingRow
            icon="swap-horizontal"
            label={t('settings.exchangeRate')}
            sub={`100 USD = ${fmtExchangeRate(exchangeRate)} IQD`}
            onPress={() => router.push('/(app)/settings/currency' as never)}
          />
          <SettingRow
            icon="language"
            label={t('settings.language')}
            sub={language === 'ku' ? 'کوردی' : 'English'}
            onPress={() => router.push('/(app)/settings/language' as never)}
          />
          <SettingRow
            icon="moon"
            label={t('settings.appearance')}
            sub={t(isDarkMode ? 'settings.darkMode' : 'settings.lightMode')}
            onPress={() => router.push('/(app)/settings/appearance' as never)}
          />
          <SettingRow
            icon="color-palette"
            label={t('settings.themeColors')}
            sub={t('settings.themeColorsSub')}
            onPress={() => router.push('/(app)/settings/theme' as never)}
          />
        </SettingSection>

        {/* Modules */}
        <SettingSection title={t('settings.modules')}>
          <SettingRow
            icon="grid"
            label={t('settings.modules')}
            sub={t('settings.modulesSub')}
            onPress={() => router.push('/(app)/settings/modules' as never)}
          />
        </SettingSection>

        {/* Online Store */}
        <SettingSection title={t('settings.onlineStore')}>
          <SettingRow
            icon="storefront"
            label={t('settings.onlineStore')}
            sub={t('settings.onlineStoreSub')}
            onPress={() => router.push('/(app)/settings/online-store' as never)}
          />
        </SettingSection>

        {/* Data */}
        <SettingSection title={t('settings.data')}>
          <SettingRow
            icon="server"
            label={t('settings.dataManagement')}
            sub={t('settings.dataManagementSub')}
            onPress={() => router.push('/(app)/settings/data' as never)}
          />
        </SettingSection>

        {/* About */}
        <SettingSection title={t('settings.about')}>
          <SettingRow
            icon="information-circle"
            label={t('settings.aboutManagerX')}
            onPress={() => router.push('/(app)/settings/about' as never)}
          />
        </SettingSection>

        {/* Account / Logout — visually separated */}
        <View style={styles.logoutSpacer} />
        <SettingSection title={t('settings.account')}>
          <SettingRow
            icon="log-out"
            label={t('settings.logout')}
            sub={t('settings.logoutSub')}
            destructive
            chevron={false}
            onPress={() => setShowLogoutModal(true)}
          />
        </SettingSection>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Logout confirmation modal ─────────────────────────────────── */}
      <Modal
        transparent
        visible={showLogoutModal}
        animationType="fade"
        onRequestClose={() => !isLoggingOut && setShowLogoutModal(false)}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View style={[
            styles.dialog,
            {
              backgroundColor: isDark ? colors.gray100 : Colors.white,
              borderColor: isDark ? colors.gray200 : 'transparent',
              borderWidth: isDark ? 1 : 0,
            },
          ]}>
            {/* Icon */}
            <View style={[styles.dialogIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="log-out" size={28} color={Colors.error} />
            </View>

            {/* Title */}
            <Text style={[styles.dialogTitle, { color: colors.black }]}>
              {t('settings.logoutConfirmTitle')}
            </Text>

            {/* Message */}
            <Text style={[styles.dialogMsg, { color: colors.gray500 }]}>
              {t('settings.logoutConfirmMsg')}
            </Text>

            {/* Buttons */}
            <View style={[styles.dialogBtns, { flexDirection }]}>
              <TouchableOpacity
                style={[styles.btnCancel, { backgroundColor: colors.gray200 }]}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                activeOpacity={0.8}
              >
                <Text style={[styles.btnCancelText, { color: colors.gray600 }]}>
                  {t('settings.logoutCancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnLogout, { backgroundColor: Colors.error }]}
                onPress={handleLogout}
                disabled={isLoggingOut}
                activeOpacity={0.8}
              >
                {isLoggingOut ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.btnLogoutText}>
                    {t('settings.logoutConfirm')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  body:         { padding: 16, paddingTop: 8 },
  logoutSpacer: { height: 8 },

  // Modal overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Dialog card
  dialog: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  dialogIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  dialogMsg: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },

  // Dialog buttons
  dialogBtns: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btnCancel: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  btnLogout: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLogoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
