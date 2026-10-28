import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/AppText';
import { AppHeader } from '@/components/common/AppHeader';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useManagementStore } from '@/store/managementStore';
import {
  updateEmployeePermissions,
  updateEmployeePassword,
} from '@/lib/management/managementService';
import {
  EmployeePermissions,
  PermissionState,
  DEFAULT_EMPLOYEE_PERMISSIONS,
} from '@/lib/management/types';

export default function EmployeePermissionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const rtl = useRTL();
  const isRTL = rtl?.isRTL ?? true;
  const flexDirection = rtl?.flexDirection ?? 'row-reverse';
  const textAlign = rtl?.textAlign ?? 'right';
  const { isTablet, contentContainerStyle } = useResponsive();

  const params = useLocalSearchParams<{ id: string; email: string; name?: string }>();
  const email = params.email || '';
  const employeeName = params.name || email;

  const employees = useManagementStore((s) => s.employees);
  const foundEmp = employees.find(
    (e) => e.email?.toLowerCase() === email.toLowerCase() || e.id === params.id
  );

  const [permissions, setPermissions] = useState<EmployeePermissions>(
    foundEmp?.permissions || DEFAULT_EMPLOYEE_PERMISSIONS
  );
  const [isSaving, setIsSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (foundEmp?.permissions) {
      setPermissions(foundEmp.permissions);
    }
  }, [foundEmp]);

  const handleUpdatePassword = async () => {
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      Alert.alert(
        isRTL ? 'هەڵە لە تێپەڕەوشە' : 'Invalid Password',
        isRTL ? 'تێپەڕەوشە دەبێت لانیکەم ٦ پیت یان ژمارە بێت' : 'Password must be at least 6 characters'
      );
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await updateEmployeePassword(email, newPassword.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      Alert.alert(
        isRTL ? 'سەرکەوتوو بوو' : 'Success',
        isRTL ? 'تێپەڕەوشەی کارمەندەکە بە سەرکەوتوویی نوێکرایەوە.' : 'Employee password updated successfully.'
      );
      setNewPassword('');
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const setModuleState = (key: keyof EmployeePermissions, state: PermissionState) => {
    Haptics.selectionAsync().catch(() => { });
    setPermissions((prev) => ({
      ...prev,
      [key]: state,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateEmployeePermissions(email, permissions);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      Alert.alert(t('common.success'), t('management.permissionsSavedSuccess'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error('[Permissions] Save error:', e);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setIsSaving(false);
    }
  };

  const renderSegmentItem = (
    label: string,
    key: keyof EmployeePermissions,
    icon: keyof typeof Ionicons.glyphMap
  ) => {
    const currentState = permissions[key] as PermissionState;

    return (
      <View
        key={String(key)}
        style={[
          styles.permRow,
          {
            backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
            borderColor: colors.gray200,
          },
        ]}
      >
        <View style={[styles.permTitleRow, { flexDirection }]}>
          <Ionicons name={icon} size={18} color={colors.primary} />
          <Text style={[styles.permTitle, { color: colors.black }]}>{label}</Text>
        </View>

        {/* 3-way State Selector: Active / Disabled / Hidden */}
        <View style={[styles.segmentGroup, { flexDirection }]}>
          {/* Active */}
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              currentState === 'active' && [
                styles.segmentBtnActive,
                { backgroundColor: '#10B981' },
              ],
            ]}
            onPress={() => setModuleState(key, 'active')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                { color: currentState === 'active' ? '#FFFFFF' : colors.gray500 },
              ]}
            >
              {t('management.permissionActive')}
            </Text>
          </TouchableOpacity>

          {/* Disabled 🔒 */}
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              currentState === 'disabled' && [
                styles.segmentBtnActive,
                { backgroundColor: '#F59E0B' },
              ],
            ]}
            onPress={() => setModuleState(key, 'disabled')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                { color: currentState === 'disabled' ? '#FFFFFF' : colors.gray500 },
              ]}
            >
              {t('management.permissionDisabled')}
            </Text>
          </TouchableOpacity>

          {/* Hidden 👁️‍🗨️ */}
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              currentState === 'hidden' && [
                styles.segmentBtnActive,
                { backgroundColor: '#EF4444' },
              ],
            ]}
            onPress={() => setModuleState(key, 'hidden')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                { color: currentState === 'hidden' ? '#FFFFFF' : colors.gray500 },
              ]}
            >
              {t('management.permissionHidden')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const moduleItems: { label: string; key: keyof EmployeePermissions; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: 'فرۆشتن (Sales)', key: 'sales', icon: 'cart-outline' },
    { label: 'کڕین (Purchases)', key: 'purchases', icon: 'bag-check-outline' },
    { label: 'کۆگا (Inventory)', key: 'inventory', icon: 'cube-outline' },
    { label: 'مێژوو (History)', key: 'history', icon: 'time-outline' },
    { label: 'پسوڵەکان (Invoices)', key: 'invoices', icon: 'receipt-outline' },
    { label: 'ڕاپۆرت و قازانج (Reports)', key: 'reports', icon: 'bar-chart-outline' },
    { label: 'قەرزەکان (Debts)', key: 'debts', icon: 'wallet-outline' },
    { label: 'خەرجییەکان (Expenses)', key: 'expenses', icon: 'cash-outline' },
    { label: 'عەرزی نرخ (Quotations)', key: 'quotations', icon: 'document-text-outline' },
    { label: 'داشبۆرد (Dashboard)', key: 'dashboard', icon: 'grid-outline' },
  ];

  const settingsItems: { label: string; key: keyof EmployeePermissions; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: 'گۆڕینی زمان (Language)', key: 'settingsLanguage', icon: 'language-outline' },
    { label: 'دەستکاری ناوی مارکێت و لۆگۆ (Profile)', key: 'settingsProfile', icon: 'business-outline' },
    { label: 'دراوی بنچینە و نرخ (Currency)', key: 'settingsCurrency', icon: 'cash-outline' },
    { label: 'ڕووکار و ڕەنگ (Theme)', key: 'settingsTheme', icon: 'color-palette-outline' },
    { label: 'داتا و باکئەپ (Backup & Data)', key: 'settingsBackup', icon: 'cloud-upload-outline' },
    { label: 'سڕینەوەی ئەکاونت و داتابەیس (Delete Account)', key: 'settingsDeleteAccount', icon: 'trash-outline' },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={`${t('management.permissionsTitle')} — ${employeeName}`}
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity
            style={[styles.saveHeaderBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveHeaderBtnText}>{t('management.savePermissions')}</Text>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, isTablet && contentContainerStyle]}>
        {/* Section 0: Employee Password Management */}
        <Text style={[styles.sectionTitle, { color: colors.black }]}>
          {isRTL ? 'تێپەڕەوشەی چوونەژوورەوەی کارمەند' : 'Employee Login Password'}
        </Text>
        <View
          style={[
            styles.passwordCard,
            {
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              borderColor: colors.gray200,
            },
          ]}
        >
          <View style={[styles.passwordHeader, { flexDirection }]}>
            <Ionicons name="key" size={18} color={colors.primary} />
            <Text style={[styles.passwordTitle, { color: colors.black }]}>
              {isRTL ? 'گۆڕینی تێپەڕەوشە (پاسۆرد)' : 'Change Employee Password'}
            </Text>
            {foundEmp?.password && (
              <Text style={[styles.currentPassLabel, { color: colors.gray500 }]}>
                {isRTL ? `پاسۆردی ئێستا: ${foundEmp.password}` : `Current: ${foundEmp.password}`}
              </Text>
            )}
          </View>

          <View style={[styles.passwordInputRow, { flexDirection }]}>
            <TextInput
              style={[
                styles.passInput,
                {
                  backgroundColor: isDark ? colors.gray200 : colors.gray50,
                  borderColor: colors.gray300,
                  color: colors.black,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              placeholder={isRTL ? 'تێپەڕەوشەی نوێ (لانیکەم ٦ پیت)...' : 'Enter new password (min 6 chars)...'}
              placeholderTextColor={colors.gray400}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={false}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={handleUpdatePassword}
              disabled={isUpdatingPassword || newPassword.trim().length < 6}
              style={[
                styles.updatePassBtn,
                {
                  backgroundColor: newPassword.trim().length >= 6 ? colors.primary : colors.gray400,
                },
              ]}
              activeOpacity={0.8}
            >
              {isUpdatingPassword ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.updatePassBtnText}>
                  {isRTL ? 'نوێکردنەوە' : 'Update'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 1: Main Modules */}
        <Text style={[styles.sectionTitle, { color: colors.black, marginTop: 20 }]}>
          {t('management.modulesPermissions')}
        </Text>
        <View style={styles.groupContainer}>
          {moduleItems.map((item) => renderSegmentItem(item.label, item.key, item.icon))}
        </View>

        {/* Section 2: Actions & Safety */}
        <Text style={[styles.sectionTitle, { color: colors.black, marginTop: 24 }]}>
          {t('management.actionsPermissions')}
        </Text>
        <View
          style={[
            styles.actionCard,
            {
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              borderColor: colors.gray200,
              flexDirection,
            },
          ]}
        >
          <View style={styles.actionTextGroup}>
            <Text style={[styles.actionLabel, { color: colors.black }]}>
              {t('management.canDeleteInvoice')}
            </Text>
            <Text style={[styles.actionDesc, { color: colors.gray500 }]}>
              ڕێگری لە کارمەند دەکات لە سڕینەوەی هیچ وەسڵ و فاکتۆرێکی فرۆشتن یان کڕین.
            </Text>
          </View>
          <Switch
            value={permissions.canDeleteInvoice}
            onValueChange={(val) => {
              Haptics.selectionAsync().catch(() => { });
              setPermissions((prev) => ({ ...prev, canDeleteInvoice: val }));
            }}
            trackColor={{ false: colors.gray300, true: colors.primary }}
          />
        </View>

        {/* Section 3: Settings Button-by-Button */}
        <Text style={[styles.sectionTitle, { color: colors.black, marginTop: 24 }]}>
          {t('management.settingsPermissions')}
        </Text>
        <View style={styles.groupContainer}>
          {settingsItems.map((item) => renderSegmentItem(item.label, item.key, item.icon))}
        </View>

        {/* Bottom Save Button */}
        <TouchableOpacity
          style={[
            styles.bottomSaveBtn,
            { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 },
          ]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.bottomSaveBtnText}>{t('management.savePermissions')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  saveHeaderBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  saveHeaderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  groupContainer: {
    gap: 10,
  },
  passwordCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 6,
  },
  passwordHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  passwordTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  currentPassLabel: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginLeft: 'auto',
  },
  passwordInputRow: {
    alignItems: 'center',
    gap: 10,
  },
  passInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  updatePassBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updatePassBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  permRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  permTitleRow: {
    alignItems: 'center',
    gap: 8,
  },
  permTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  segmentGroup: {
    backgroundColor: 'rgba(150, 150, 150, 0.08)',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionTextGroup: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  bottomSaveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

