import React, { useState, type ComponentProps } from 'react';
import {
  View,
  ScrollView,
  Switch,
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
import { useAppTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useModuleStore } from '@/store/moduleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useLanguageStore } from '@/store/languageStore';
import { useRTL } from '@/lib/rtl';
import { MODULES } from '@/constants/config';
import { Colors } from '@/constants/colors';

export default function SettingsScreen() {
  const router  = useRouter();
  const { t } = useTranslation();
  const { isRTL } = useRTL();
  const { colors, isDark } = useAppTheme();
  const business   = useBusinessStore();
  const { modules, toggleModule } = useModuleStore();
  const isDarkMode   = useSettingsStore((s) => s.isDarkMode);
  const pinEnabled   = useSettingsStore((s) => s.pinEnabled);
  const exchangeRate = useSettingsStore((s) => s.exchangeRate);
  const language     = useLanguageStore((s) => s.language);
  const signOut      = useAuthStore((s) => s.signOut);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut,    setIsLoggingOut]    = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    // Replace the entire stack — user cannot navigate back into the app
    router.replace('/(onboarding)/login' as never);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('settings.title')} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Business */}
        <SettingSection title={t('settings.businessProfile')}>
          <SettingRow
            icon="business"
            label={t('settings.businessProfile')}
            sub={business.name || t('settings.businessProfileSub')}
            onPress={() => router.push('/(app)/settings/profile' as never)}
          />
        </SettingSection>

        {/* Preferences */}
        <SettingSection title={t('settings.preferences')}>
          <SettingRow
            icon="swap-horizontal"
            label={t('settings.exchangeRate')}
            sub={`1 USD = ${exchangeRate.toLocaleString('en-US')} IQD`}
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
            icon="notifications"
            label={t('settings.notifications')}
            sub={t('settings.notificationsSub')}
            onPress={() => router.push('/(app)/settings/notifications' as never)}
          />
        </SettingSection>

        {/* Security */}
        <SettingSection title={t('settings.security')}>
          <SettingRow
            icon="lock-closed"
            label={t('settings.pinLock')}
            sub={t(pinEnabled ? 'settings.pinEnabled' : 'settings.pinDisabled')}
            onPress={() => router.push('/(app)/settings/security' as never)}
          />
        </SettingSection>

        {/* Modules */}
        <SettingSection title={t('settings.modules')}>
          {MODULES.map((mod) => (
            <View key={mod.id} style={[styles.moduleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.moduleIcon, { backgroundColor: colors.softBlue }]}>
                <Ionicons name={mod.icon as ComponentProps<typeof Ionicons>['name']} size={16} color={colors.primary} />
              </View>
              <Text style={[styles.moduleLabel, { color: colors.black, textAlign: isRTL ? 'right' : 'left' }]}>
                {t(`modules.${mod.id}.title`)}
              </Text>
              <Switch
                value={modules[mod.id]?.enabled ?? true}
                onValueChange={() => toggleModule(mod.id)}
                trackColor={{ false: colors.gray200, true: colors.primary + '55' }}
                thumbColor={modules[mod.id]?.enabled ? colors.primary : colors.gray300}
              />
            </View>
          ))}
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
            <View style={styles.dialogBtns}>
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
  gradHeader:   { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  body:         { padding: 16, paddingTop: 8 },
  moduleRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  moduleIcon:   { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  moduleLabel:  { flex: 1, fontSize: 14, fontWeight: '600' },
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
