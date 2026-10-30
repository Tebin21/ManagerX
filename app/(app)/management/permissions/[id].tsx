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
import { useLanguageStore } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import { useManagementStore } from '@/store/managementStore';
import { isAdminEmail } from '@/lib/adminNotificationService';
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
  const { isTablet, isTabletLandscape, contentContainerStyle } = useResponsive();
  const currentLang = useLanguageStore((s) => s.language);
  const isKu = currentLang === 'ku';
  const isAr = currentLang === 'ar';

  const params = useLocalSearchParams<{ id: string; email: string; name?: string }>();
  const email = params.email || '';
  const employeeName = params.name || email;

  const user = useAuthStore((s) => s.user);
  const isAdmin = isAdminEmail(user?.email);
  const isEmployee = useManagementStore((s) => s.isEmployee);
  const isManager = useManagementStore((s) => s.isManager);

  // Security route guard: Employees and unauthorized accounts can NEVER enter
  useEffect(() => {
    if (isEmployee || (!isAdmin && !isManager)) {
      router.replace('/(app)/dashboard');
    }
  }, [isEmployee, isAdmin, isManager]);

  const employees = useManagementStore((s) => s.employees);
  const managedEmployees = useManagementStore((s) => s.managedEmployees);
  // Strict tenant scoping: Admins see all; Managers ONLY see their own managed staff
  const candidateEmployees = isAdmin ? [...employees, ...managedEmployees] : managedEmployees;
  const foundEmp = candidateEmployees.find(
    (e) => e.email?.toLowerCase() === email.toLowerCase() || e.id === params.id
  );

  // Tenant Isolation Guard: Managers cannot view/edit employees of other managers
  useEffect(() => {
    if (foundEmp && !isAdmin) {
      const currentMgrEmail = (user?.email || '').trim().toLowerCase();
      const empMgrEmail = (foundEmp.managerEmail || '').trim().toLowerCase();
      if (empMgrEmail && currentMgrEmail && empMgrEmail !== currentMgrEmail) {
        Alert.alert(
          isKu ? 'دەسەڵاتت نییە' : isAr ? 'غير مصرح' : 'Access Denied',
          isKu
            ? 'تەنها دەتوانی دەسەڵاتەکانی کارمەندانی تایبەت بە خۆت دەستکاری بکەیت.'
            : isAr
            ? 'يمكنك فقط تعديل صلاحيات الموظفين التابعين لحسابك.'
            : 'You can only manage employees under your own business account.'
        );
        router.replace('/(app)/management');
      }
    }
  }, [foundEmp, isAdmin, user?.email]);

  const [permissions, setPermissions] = useState<EmployeePermissions>(
    foundEmp?.permissions || DEFAULT_EMPLOYEE_PERMISSIONS
  );
  const [isSaving, setIsSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [currentDisplayPassword, setCurrentDisplayPassword] = useState(foundEmp?.password || '');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (foundEmp?.permissions) {
      setPermissions(foundEmp.permissions);
    }
    if (foundEmp?.password) {
      setCurrentDisplayPassword(foundEmp.password);
    }
  }, [foundEmp]);

  const handleUpdatePassword = async () => {
    const targetEmail = (foundEmp?.email || email).trim().toLowerCase();
    const targetId = foundEmp?.id || params.id;
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      Alert.alert(
        isAr ? 'خطأ في كلمة المرور' : isKu ? 'هەڵە لە تێپەڕەوشە' : 'Invalid Password',
        isAr ? 'تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل' : isKu ? 'تێپەڕەوشە دەبێت لانیکەم ٦ پیت یان ژمارە بێت' : 'Password must be at least 6 characters'
      );
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await updateEmployeePassword(targetEmail, newPassword.trim(), targetId);
      setCurrentDisplayPassword(newPassword.trim());

      // Instantly update management store so manager view & admin view reflect the new password without delay
      useManagementStore.setState((state) => ({
        managedEmployees: state.managedEmployees.map((e) =>
          e.id === targetId || e.email?.toLowerCase() === targetEmail
            ? { ...e, password: newPassword.trim(), passwordUpdatedAt: new Date().toISOString() }
            : e
        ),
        employees: state.employees.map((e) =>
          e.id === targetId || e.email?.toLowerCase() === targetEmail
            ? { ...e, password: newPassword.trim(), passwordUpdatedAt: new Date().toISOString() }
            : e
        ),
      }));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      Alert.alert(
        isAr ? 'تم بنجاح' : isKu ? 'سەرکەوتوو بوو' : 'Success',
        isAr ? 'تم تحديث كلمة مرور الموظف ومزامنتها بنجاح.' : isKu ? 'تێپەڕەوشەی کارمەندەکە نوێکرایەوە و ڕاستەوخۆ بۆ بەڕێوەبەری سەرپەرشتیار نێردرا.' : 'Employee password updated and synced successfully.'
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
          isTablet && {
            width: isTabletLandscape ? '48.8%' : '48.5%',
            padding: 16,
            borderRadius: 18,
          },
        ]}
      >
        <View style={[styles.permTitleRow, { flexDirection }]}>
          <Ionicons name={icon} size={isTablet ? 20 : 18} color={colors.primary} />
          <Text style={[styles.permTitle, { color: colors.black }, isTablet && { fontSize: 15.5 }]}>{label}</Text>
        </View>

        {/* 3-way State Selector: Active / Disabled / Hidden */}
        <View style={[styles.segmentGroup, { flexDirection }, isTablet && { padding: 4 }]}>
          {/* Active */}
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              isTablet && { paddingVertical: 10, borderRadius: 10 },
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
                isTablet && { fontSize: 13 },
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
              isTablet && { paddingVertical: 10, borderRadius: 10 },
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
                isTablet && { fontSize: 13 },
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
              isTablet && { paddingVertical: 10, borderRadius: 10 },
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
                isTablet && { fontSize: 13 },
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
    { label: isAr ? 'المبيعات' : isKu ? 'فرۆشتن' : 'Sales', key: 'sales', icon: 'cart-outline' },
    { label: isAr ? 'المشتريات' : isKu ? 'کڕین' : 'Purchases', key: 'purchases', icon: 'bag-check-outline' },
    { label: isAr ? 'المخزن' : isKu ? 'کۆگا' : 'Inventory', key: 'inventory', icon: 'cube-outline' },
    { label: isAr ? 'السجل' : isKu ? 'مێژوو' : 'History', key: 'history', icon: 'time-outline' },
    { label: isAr ? 'الفواتير' : isKu ? 'پسوڵەکان' : 'Invoices', key: 'invoices', icon: 'receipt-outline' },
    { label: isAr ? 'التقارير والأرباح' : isKu ? 'ڕاپۆرت و قازانج' : 'Reports & Profit', key: 'reports', icon: 'bar-chart-outline' },
    { label: isAr ? 'الديون' : isKu ? 'قەرزەکان' : 'Debts', key: 'debts', icon: 'wallet-outline' },
    { label: isAr ? 'المصاريف' : isKu ? 'خەرجییەکان' : 'Expenses', key: 'expenses', icon: 'cash-outline' },
    { label: isAr ? 'عروض الأسعار' : isKu ? 'عەرزی نرخ' : 'Quotations', key: 'quotations', icon: 'document-text-outline' },
    { label: isAr ? 'لوحة التحكم' : isKu ? 'داشبۆرد' : 'Dashboard', key: 'dashboard', icon: 'grid-outline' },
    { label: isAr ? 'المتجر الإلكتروني' : isKu ? 'ستۆری ئۆنلاین' : 'Online Store', key: 'onlineStore', icon: 'storefront-outline' },
  ];

  const settingsItems: { label: string; key: keyof EmployeePermissions; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: isAr ? 'تغيير اللغة' : isKu ? 'گۆڕینی زمان' : 'Language', key: 'settingsLanguage', icon: 'language-outline' },
    { label: isAr ? 'اسم المتجر والشعار' : isKu ? 'دەستکاری ناوی مارکێت و لۆگۆ' : 'Store Profile & Logo', key: 'settingsProfile', icon: 'business-outline' },
    { label: isAr ? 'العملة الأساسية والأسعار' : isKu ? 'دراوی بنچینە و نرخ' : 'Base Currency & Rates', key: 'settingsCurrency', icon: 'cash-outline' },
    { label: isAr ? 'المظهر والألوان' : isKu ? 'ڕووکار و ڕەنگ' : 'Theme & Colors', key: 'settingsTheme', icon: 'color-palette-outline' },
    { label: isAr ? 'إعدادات طباعة الفواتير' : isKu ? 'شێوازی چاپ و پسوولە' : 'Receipt & Print Settings', key: 'settingsReceiptCustomization', icon: 'print-outline' },
    { label: isAr ? 'النسخ الاحتياطي والبيانات' : isKu ? 'داتا و باکئەپ' : 'Data & Backup', key: 'settingsBackup', icon: 'cloud-upload-outline' },
    { label: isAr ? 'حذف الحساب وقاعدة البيانات' : isKu ? 'سڕینەوەی ئەکاونت و داتابەیس' : 'Delete Account & Database', key: 'settingsDeleteAccount', icon: 'trash-outline' },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={`${t('management.permissionsTitle')} — ${employeeName}`}
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity
            style={[
              styles.saveHeaderBtn,
              { backgroundColor: colors.primary },
              isTablet && { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
            ]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.saveHeaderBtnText, isTablet && { fontSize: 15 }]}>{t('management.savePermissions')}</Text>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, isTablet && contentContainerStyle]}>
        {/* Section 0: Employee Password Management */}
        <Text style={[styles.sectionTitle, { color: colors.black }, isTablet && { fontSize: 18, marginBottom: 14 }]}>
          {isAr ? 'كلمة مرور تسجيل دخول الموظف' : isKu ? 'تێپەڕەوشەی چوونەژوورەوەی کارمەند' : 'Employee Login Password'}
        </Text>
        <View
          style={[
            styles.passwordCard,
            {
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              borderColor: colors.gray200,
            },
            isTablet && { padding: 22, borderRadius: 20 },
          ]}
        >
          <View style={[styles.passwordHeader, { flexDirection }]}>
            <Ionicons name="key" size={isTablet ? 22 : 18} color={colors.primary} />
            <Text style={[styles.passwordTitle, { color: colors.black }, isTablet && { fontSize: 16 }]}>
              {isAr ? 'تغيير كلمة المرور' : isKu ? 'گۆڕینی تێپەڕەوشە (پاسۆرد)' : 'Change Employee Password'}
            </Text>
            {(currentDisplayPassword || foundEmp?.password) ? (
              <Text style={[styles.currentPassLabel, { color: colors.gray500 }, isTablet && { fontSize: 13 }]}>
                {isAr
                  ? `الحالية: ${currentDisplayPassword || foundEmp?.password}`
                  : isKu
                  ? `پاسۆردی ئێستا: ${currentDisplayPassword || foundEmp?.password}`
                  : `Current: ${currentDisplayPassword || foundEmp?.password}`}
              </Text>
            ) : null}
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
                isTablet && { height: 50, fontSize: 15, paddingHorizontal: 16 },
              ]}
              placeholder={isAr ? 'كلمة المرور الجديدة (6 أحرف على الأقل)...' : isKu ? 'تێپەڕەوشەی نوێ (لانیکەم ٦ پیت)...' : 'Enter new password (min 6 chars)...'}
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
                isTablet && { height: 50, paddingHorizontal: 18, borderRadius: 14 },
              ]}
              activeOpacity={0.8}
            >
              {isUpdatingPassword ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.updatePassBtnText, isTablet && { fontSize: 14 }]}>
                  {isAr ? 'تحديث' : isKu ? 'نوێکردنەوە' : 'Update'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 1: Main Modules */}
        <Text style={[styles.sectionTitle, { color: colors.black, marginTop: 20 }, isTablet && { fontSize: 18, marginTop: 26, marginBottom: 14 }]}>
          {t('management.modulesPermissions')}
        </Text>
        <View style={[styles.groupContainer, isTablet && { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }]}>
          {moduleItems.map((item) => renderSegmentItem(item.label, item.key, item.icon))}
        </View>

        {/* Section 2: Actions & Safety */}
        <Text style={[styles.sectionTitle, { color: colors.black, marginTop: 24 }, isTablet && { fontSize: 18, marginTop: 28, marginBottom: 14 }]}>
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
            isTablet && { padding: 20, borderRadius: 20 },
          ]}
        >
          <View style={styles.actionTextGroup}>
            <Text style={[styles.actionLabel, { color: colors.black }, isTablet && { fontSize: 16 }]}>
              {t('management.canDeleteInvoice')}
            </Text>
            <Text style={[styles.actionDesc, { color: colors.gray500 }, isTablet && { fontSize: 13.5, lineHeight: 20 }]}>
              {isAr
                ? 'يمنع الموظف من حذف أي فاتورة بيع أو شراء.'
                : isKu
                ? 'ڕێگری لە کارمەند دەکات لە سڕینەوەی هیچ وەسڵ و فاکتۆرێکی فرۆشتن یان کڕین.'
                : 'Prevents employee from deleting sales or purchase invoices.'}
            </Text>
          </View>
          <Switch
            value={permissions.canDeleteInvoice}
            onValueChange={(val) => {
              Haptics.selectionAsync().catch(() => { });
              setPermissions((prev) => ({ ...prev, canDeleteInvoice: val }));
            }}
            trackColor={{ false: colors.gray300, true: colors.primary }}
            style={isTablet ? { transform: [{ scaleX: 1.15 }, { scaleY: 1.15 }] } : undefined}
          />
        </View>

        {/* Can Edit / Customize Receipts */}
        <View
          style={[
            styles.actionCard,
            {
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              borderColor: colors.gray200,
              flexDirection,
              marginTop: 10,
            },
            isTablet && { padding: 20, borderRadius: 20 },
          ]}
        >
          <View style={styles.actionTextGroup}>
            <Text style={[styles.actionLabel, { color: colors.black }, isTablet && { fontSize: 16 }]}>
              {isAr ? 'تعديل وتخصيص إعدادات طباعة الفواتير' : isKu ? 'دەستکاریکردنی شێوازی چاپ و ڕێکخستنی پسوولەکان' : 'Customize Receipt & Print Layout'}
            </Text>
            <Text style={[styles.actionDesc, { color: colors.gray500 }, isTablet && { fontSize: 13.5, lineHeight: 20 }]}>
              {isAr
                ? 'السماح للموظف بتعديل أحجام الأوراق (58mm, 80mm, 110mm, A4) وتفاصيل الفواتير للأقسام الـ 5 (المبيعات، المشتريات، العروض، المخزن، الديون).'
                : isKu
                ? 'ڕێگەپێدانی کارمەند بۆ دەستکاریکردنی قەبارەی وەسڵەکان (58mm, 80mm, 110mm, A4) و زانیارییەکانی هەر ٥ بەشەکە (فرۆشتن، کڕین، عەرز، کۆگا، قەرز).'
                : 'Allow employee to customize paper sizes and layout options across all 5 modules (Sales, Purchases, Quotations, Inventory, Debts).'}
            </Text>
          </View>
          <Switch
            value={Boolean(permissions.canEditReceiptCustomization)}
            onValueChange={(val) => {
              Haptics.selectionAsync().catch(() => {});
              setPermissions((prev) => ({ ...prev, canEditReceiptCustomization: val }));
            }}
            trackColor={{ false: colors.gray300, true: colors.primary }}
            style={isTablet ? { transform: [{ scaleX: 1.15 }, { scaleY: 1.15 }] } : undefined}
          />
        </View>

        {/* Section 3: Settings Button-by-Button */}
        <Text style={[styles.sectionTitle, { color: colors.black, marginTop: 24 }, isTablet && { fontSize: 18, marginTop: 28, marginBottom: 14 }]}>
          {t('management.settingsPermissions')}
        </Text>
        <View style={[styles.groupContainer, isTablet && { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }]}>
          {settingsItems.map((item) => renderSegmentItem(item.label, item.key, item.icon))}
        </View>

        {/* Bottom Save Button */}
        <TouchableOpacity
          style={[
            styles.bottomSaveBtn,
            { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 },
            isTablet && { height: 60, borderRadius: 18, marginTop: 36 },
          ]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.bottomSaveBtnText, isTablet && { fontSize: 18 }]}>{t('management.savePermissions')}</Text>
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

