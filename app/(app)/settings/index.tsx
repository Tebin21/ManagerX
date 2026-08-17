import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingSection } from '@/components/settings/SettingSection';
import { SettingRow } from '@/components/settings/SettingRow';
import { TutorialsCard } from '@/components/settings/TutorialsCard';
import { InfoModal } from '@/components/ui/InfoModal';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useLanguageStore } from '@/store/languageStore';
import { useLicenseStore } from '@/store/licenseStore';
import { Colors } from '@/constants/colors';
import { PRIVACY_POLICY_URL } from '@/constants/config';
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
  const userEmail    = useAuthStore((s) => s.user?.email);
  const itemLimit    = useLicenseStore((s) => s.limit);

  const { flexDirection, textAlign } = useRTL();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut,    setIsLoggingOut]    = useState(false);

  const [showDeleteModal,   setShowDeleteModal]   = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [cloudDataPending,  setCloudDataPending]  = useState(false);
  // Synchronous re-entrancy guard — React state is applied async, so two taps
  // in the same tick could both pass an `isDeletingAccount` state check.
  const isDeletingRef = useRef(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    setLanguage('en');
    setDarkMode(false);
    setAccentColor(null);
    // Replace the entire stack — user cannot navigate back into the app
    router.replace('/(onboarding)/login' as never);
  };

  const handleDeleteAccount = async () => {
    if (isDeletingAccount || isDeletingRef.current) return;
    isDeletingRef.current = true;
    try {
      setIsDeletingAccount(true);
      // Suppresses (app)/_layout.tsx's auth-redirect guard for the duration —
      // Firebase's deleteUser() flips the store's `user` to null before this
      // screen finishes its own local cleanup + success dialog.
      useAuthStore.getState().setDeletingAccount(true);
      const { deleteAccount } = await import('@/lib/accountDeletion');
      const result = await deleteAccount();
      setIsDeletingAccount(false);
      if (result.error) {
        useAuthStore.getState().setDeletingAccount(false);
        setShowDeleteModal(false);
        Alert.alert(t('common.error'), result.error);
        return;
      }
      setShowDeleteModal(false);
      setCloudDataPending(!!result.cloudDataPending);
      setShowDeleteSuccess(true);
      // isDeletingAccount stays true in the store until the success dialog is
      // dismissed (handleDeleteSuccessDone), so the layout guard can't redirect
      // out from under it before the user sees the result.
    } catch (e: any) {
      // deleteAccount() should always resolve to {error}, never reject — this is
      // a defensive backstop so an unexpected throw can't leave the screen stuck
      // in its "deleting" state with the auth-redirect guard permanently suppressed.
      setIsDeletingAccount(false);
      useAuthStore.getState().setDeletingAccount(false);
      setShowDeleteModal(false);
      Alert.alert(t('common.error'), e?.message ?? t('common.tryAgain'));
    } finally {
      isDeletingRef.current = false;
    }
  };

  const handleDeleteSuccessDone = () => {
    setShowDeleteSuccess(false);
    useAuthStore.getState().setDeletingAccount(false);
    router.replace('/(onboarding)/login' as never);
  };

  const deleteAccountBullets = Array.from({ length: 12 }, (_, i) =>
    t(`settings.deleteAccountBullet${i + 1}`)
  );

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

        {/* Subscriptions — Froshiar License (existing Plan & Limits, relabeled/regrouped
            only, zero functional change) + Online Store Subscription (new, independent) */}
        <SettingSection title={t('settings.subscriptions')}>
          <SettingRow
            icon="rocket"
            label={t('settings.managerXLicense')}
            sub={t('settings.managerXLicenseSub', { limit: itemLimit })}
            onPress={() => router.push('/(app)/settings/plan-limits' as never)}
          />
          <SettingRow
            icon="globe"
            label={t('settings.onlineStoreSubscription')}
            sub={t('settings.onlineStoreSubscriptionSub')}
            onPress={() => router.push('/(app)/settings/online-store-subscription' as never)}
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
          {/* PRIVACY_POLICY_URL is unset until a real policy is published — see
              constants/config.ts. Hidden rather than shown with a dead/placeholder
              link. */}
          {PRIVACY_POLICY_URL ? (
            <SettingRow
              icon="shield-checkmark"
              label={t('settings.privacyPolicy')}
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            />
          ) : null}
        </SettingSection>

        {/* Account / Logout — visually separated */}
        <View style={styles.logoutSpacer} />
        <SettingSection title={t('settings.account')}>
          {userEmail ? (
            <SettingRow
              icon="person-circle"
              label={t('settings.signedInAs')}
              sub={userEmail}
              chevron={false}
              onPress={() => {}}
            />
          ) : null}
          <SettingRow
            icon="log-out"
            label={t('settings.logout')}
            sub={t('settings.logoutSub')}
            destructive
            chevron={false}
            onPress={() => setShowLogoutModal(true)}
          />
        </SettingSection>

        {/* Danger Zone — Delete Account, visually separated */}
        <View style={styles.logoutSpacer} />
        <SettingSection title={t('settings.dangerZone')}>
          <SettingRow
            icon="trash"
            label={t('settings.deleteAccount')}
            sub={t('settings.deleteAccountSub')}
            destructive
            chevron={false}
            onPress={() => setShowDeleteModal(true)}
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

      {/* ── Delete Account confirmation / loading modal ───────────────── */}
      <Modal
        transparent
        visible={showDeleteModal}
        animationType="fade"
        onRequestClose={() => !isDeletingAccount && setShowDeleteModal(false)}
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
            {isDeletingAccount ? (
              <>
                <ActivityIndicator color={Colors.error} size="large" style={styles.deletingSpinner} />
                <Text style={[styles.dialogTitle, { color: colors.black }]}>
                  {t('settings.deletingAccountTitle')}
                </Text>
                <Text style={[styles.dialogMsg, { color: colors.gray500, marginBottom: 0 }]}>
                  {t('settings.deletingAccountMsg')}
                </Text>
              </>
            ) : (
              <>
                {/* Icon */}
                <View style={[styles.dialogIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="warning" size={34} color={Colors.error} />
                </View>

                {/* Title */}
                <Text style={[styles.dialogTitle, { color: colors.black }]}>
                  {t('settings.deleteAccountConfirmTitle')}
                </Text>

                {/* Message */}
                <Text style={[styles.dialogMsg, { color: colors.gray500 }]}>
                  {t('settings.deleteAccountConfirmMsg')}
                </Text>

                {/* Removed-data bullet list */}
                <View style={styles.bulletList}>
                  {deleteAccountBullets.map((bullet, i) => (
                    <View key={i} style={[styles.bulletRow, { flexDirection }]}>
                      <Text style={[styles.bulletDot, { color: Colors.error }]}>•</Text>
                      <Text style={[styles.bulletText, { color: colors.gray600, textAlign }]}>{bullet}</Text>
                    </View>
                  ))}
                </View>

                {/* Online Store note */}
                <Text style={[styles.footerNote, { color: colors.gray400 }]}>
                  {t('settings.deleteAccountOnlineStoreNote')}
                </Text>

                {/* Buttons */}
                <View style={[styles.dialogBtns, { flexDirection }]}>
                  <TouchableOpacity
                    style={[styles.btnCancel, { backgroundColor: colors.gray200 }]}
                    onPress={() => setShowDeleteModal(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.btnCancelText, { color: colors.gray600 }]}>
                      {t('settings.deleteAccountCancel')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnLogout, { backgroundColor: Colors.error }]}
                    onPress={handleDeleteAccount}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnLogoutText}>
                      {t('settings.deleteAccountConfirmBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Delete Account success dialog ─────────────────────────────── */}
      <InfoModal
        visible={showDeleteSuccess}
        onClose={handleDeleteSuccessDone}
        title={t('settings.deleteAccountSuccessTitle')}
        description={t(
          cloudDataPending ? 'settings.deleteAccountSuccessMsgPending' : 'settings.deleteAccountSuccessMsg'
        )}
        buttonLabel={t('settings.done')}
      />
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
  deletingSpinner: {
    marginBottom: 16,
  },

  // Delete Account removed-data bullet list
  bulletList: {
    width: '100%',
    gap: 8,
    marginBottom: 14,
  },
  bulletRow: {
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  footerNote: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 18,
    fontStyle: 'italic',
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
