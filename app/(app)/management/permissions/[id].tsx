import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { AppHeader } from '@/components/common/AppHeader';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import { useManagementStore } from '@/store/managementStore';
import {
  updateEmployeePermissions,
  updateEmployeePassword,
} from '@/lib/management/managementService';
import {
  getEmployeeActivities,
  type DashboardActivityItem,
} from '@/lib/sqlite';
import {
  EmployeePermissions,
  PermissionState,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  DashboardWidgetPermissions,
  GranularSubPermissions,
} from '@/lib/management/types';
import { formatDateTimeUI } from '@/utils/formatters';

type TabType = 'modules' | 'dashboard' | 'settings' | 'security';

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
  const isEmployee = useManagementStore((s) => s.isEmployee);

  // Security route guard: Employees and unauthenticated accounts can NEVER enter
  useEffect(() => {
    if (isEmployee || !user?.email) {
      router.replace('/(app)/dashboard');
    }
  }, [isEmployee, user?.email]);

  const managedEmployees = useManagementStore((s) => s.managedEmployees);
  // Strict tenant scoping: universally isolated to managed staff for this store account
  const candidateEmployees = managedEmployees;
  const foundEmp = candidateEmployees.find(
    (e) => e.email?.toLowerCase() === email.toLowerCase() || e.id === params.id
  );

  // Tenant Isolation Guard: Universal check - managers cannot view/edit employees of other managers
  useEffect(() => {
    if (foundEmp) {
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
  }, [foundEmp, user?.email]);

  // Active Tab state
  const [activeTab, setActiveTab] = useState<TabType>('modules');

  // Permissions state initialized with defaults
  const [permissions, setPermissions] = useState<EmployeePermissions>(() => {
    const base = foundEmp?.permissions || DEFAULT_EMPLOYEE_PERMISSIONS;
    return {
      ...DEFAULT_EMPLOYEE_PERMISSIONS,
      ...base,
      dashboardWidgets: {
        ...DEFAULT_EMPLOYEE_PERMISSIONS.dashboardWidgets!,
        ...(base.dashboardWidgets || {}),
      },
      subPermissions: {
        ...DEFAULT_EMPLOYEE_PERMISSIONS.subPermissions!,
        ...(base.subPermissions || {}),
        allowedLanguages: {
          ...DEFAULT_EMPLOYEE_PERMISSIONS.subPermissions!.allowedLanguages,
          ...(base.subPermissions?.allowedLanguages || {}),
        },
      },
    };
  });

  const [isSaving, setIsSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [currentDisplayPassword, setCurrentDisplayPassword] = useState(foundEmp?.password || '');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Accordion open/close states for drill-down features
  const [expandedInvoices, setExpandedInvoices] = useState(false);
  const [expandedLanguage, setExpandedLanguage] = useState(false);
  const [expandedCurrency, setExpandedCurrency] = useState(false);
  const [expandedReceipts, setExpandedReceipts] = useState(false);

  // Activity Inspector Modal State
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [employeeActivities, setEmployeeActivities] = useState<DashboardActivityItem[]>([]);

  useEffect(() => {
    if (foundEmp?.permissions) {
      setPermissions({
        ...DEFAULT_EMPLOYEE_PERMISSIONS,
        ...foundEmp.permissions,
        dashboardWidgets: {
          ...DEFAULT_EMPLOYEE_PERMISSIONS.dashboardWidgets!,
          ...(foundEmp.permissions.dashboardWidgets || {}),
        },
        subPermissions: {
          ...DEFAULT_EMPLOYEE_PERMISSIONS.subPermissions!,
          ...(foundEmp.permissions.subPermissions || {}),
          allowedLanguages: {
            ...DEFAULT_EMPLOYEE_PERMISSIONS.subPermissions!.allowedLanguages,
            ...(foundEmp.permissions.subPermissions?.allowedLanguages || {}),
          },
        },
      });
    }
    if (foundEmp?.password) {
      setCurrentDisplayPassword(foundEmp.password);
    }
  }, [foundEmp]);

  // Helper to update top-level 3-way module states
  const setModuleState = (key: keyof EmployeePermissions, state: PermissionState) => {
    Haptics.selectionAsync().catch(() => {});
    setPermissions((prev) => ({
      ...prev,
      [key]: state,
    }));
  };

  // Helper to update dashboard widget permissions
  const setWidgetState = (key: keyof DashboardWidgetPermissions, state: PermissionState) => {
    Haptics.selectionAsync().catch(() => {});
    setPermissions((prev) => ({
      ...prev,
      dashboardWidgets: {
        ...(prev.dashboardWidgets || DEFAULT_EMPLOYEE_PERMISSIONS.dashboardWidgets!),
        [key]: state,
      },
    }));
  };

  // Helper to update granular sub-permissions
  const updateSubPermission = (updater: (prev: GranularSubPermissions) => GranularSubPermissions) => {
    Haptics.selectionAsync().catch(() => {});
    setPermissions((prev) => ({
      ...prev,
      subPermissions: updater(prev.subPermissions || DEFAULT_EMPLOYEE_PERMISSIONS.subPermissions!),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateEmployeePermissions(email, permissions);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        isKu ? 'سەرکەوتوو بوو' : isAr ? 'تم الحفظ' : 'Saved Successfully',
        isKu
          ? 'دەسەڵاتەکان بە سەرکەوتوویی پاشەکەوت کران و چالاک بوون.'
          : isAr
          ? 'تم حفظ الصلاحيات بنجاح.'
          : 'Permissions saved and synced successfully.',
        [{ text: t('common.ok'), onPress: () => router.back() }]
      );
    } catch (e) {
      console.error('[Permissions] Save error:', e);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    const targetEmail = (foundEmp?.email || email).trim().toLowerCase();
    const targetId = foundEmp?.id || params.id;
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      Alert.alert(
        isAr ? 'خطأ في كلمة المرور' : isKu ? 'هەڵە لە تێپەڕەوشە' : 'Invalid Password',
        isAr
          ? 'تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل'
          : isKu
          ? 'تێپەڕەوشە دەبێت لانیکەم ٦ پیت یان ژمارە بێت'
          : 'Password must be at least 6 characters'
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

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        isAr ? 'تم بنجاح' : isKu ? 'سەرکەوتوو بوو' : 'Success',
        isAr
          ? 'تم تحديث كلمة مرور الموظف بنجاح.'
          : isKu
          ? 'تێپەڕەوشەی چوونەژوورەوەی کارمەندەکە نوێکرایەوە.'
          : 'Employee password updated successfully.'
      );
      setNewPassword('');
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleOpenActivities = async () => {
    setActivityModalVisible(true);
    setLoadingActivities(true);
    try {
      const acts = await getEmployeeActivities(email, 80, isKu ? 'ku' : 'en');
      setEmployeeActivities(acts);
    } catch (e) {
      console.error('Failed to load employee activities:', e);
    } finally {
      setLoadingActivities(false);
    }
  };

  // 3-way State Selector Component
  const renderThreeWaySelector = (
    currentState: PermissionState,
    onSelect: (state: PermissionState) => void
  ) => {
    return (
      <View
        style={[
          styles.segmentGroup,
          {
            flexDirection,
            backgroundColor: isDark ? '#152136' : '#F1F5F9',
          },
        ]}
      >
        {/* Active 🟢 */}
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            currentState === 'active' && [
              styles.segmentBtnActive,
              { backgroundColor: '#10B981' },
            ],
          ]}
          onPress={() => onSelect('active')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
              { color: currentState === 'active' ? '#FFFFFF' : colors.gray500 },
            ]}
          >
            {isKu ? 'چالاک' : isAr ? 'مفعل' : 'Active'}
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
          onPress={() => onSelect('disabled')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
              { color: currentState === 'disabled' ? '#FFFFFF' : colors.gray500 },
            ]}
          >
            {isKu ? 'ناچالاک 🔒' : isAr ? 'معطل 🔒' : 'Disabled 🔒'}
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
          onPress={() => onSelect('hidden')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
              { color: currentState === 'hidden' ? '#FFFFFF' : colors.gray500 },
            ]}
          >
            {isKu ? 'شاراوە 👁️‍🗨️' : isAr ? 'مخفي 👁️‍🗨️' : 'Hidden 👁️‍🗨️'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Card Item Renderer for Top-level items
  const renderPermCard = (
    label: string,
    key: keyof EmployeePermissions,
    icon: keyof typeof Ionicons.glyphMap,
    badgeText?: string,
    expandableContent?: React.ReactNode,
    isExpanded?: boolean,
    onToggleExpand?: () => void
  ) => {
    const currentState = permissions[key] as PermissionState;

    return (
      <View
        key={String(key)}
        style={[
          styles.permCard,
          {
            backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
            borderColor: isDark ? colors.gray200 : '#E2E8F0',
          },
        ]}
      >
        <View style={[styles.permCardHeader, { flexDirection }]}>
          <View style={[styles.permTitleRow, { flexDirection }]}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: colors.primary + '18',
                  borderColor: colors.primary + '30',
                },
              ]}
            >
              <Ionicons name={icon} size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.permTitle, { color: colors.black }]}>{label}</Text>
              {badgeText ? (
                <Text style={[styles.permSubtitle, { color: colors.gray400 }]}>{badgeText}</Text>
              ) : null}
            </View>
          </View>

          {onToggleExpand ? (
            <TouchableOpacity
              onPress={onToggleExpand}
              style={[
                styles.drillDownBtn,
                {
                  backgroundColor: isExpanded ? colors.primary + '20' : colors.gray200 + '30',
                  borderColor: isExpanded ? colors.primary : colors.gray300,
                  flexDirection,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={isExpanded ? colors.primary : colors.gray500}
              />
              <Text
                style={[
                  styles.drillDownBtnText,
                  { color: isExpanded ? colors.primary : colors.gray500 },
                ]}
              >
                {isKu ? 'وردەکاری' : isAr ? 'تفاصيل' : 'Details'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {renderThreeWaySelector(currentState, (st) => setModuleState(key, st))}

        {isExpanded && expandableContent ? (
          <View
            style={[
              styles.expandableBox,
              {
                backgroundColor: isDark ? '#141E2F' : '#F8FAFC',
                borderColor: isDark ? '#27354A' : '#E2E8F0',
              },
            ]}
          >
            {expandableContent}
          </View>
        ) : null}
      </View>
    );
  };

  // Modules List definitions
  const moduleItems = [
    {
      label: isKu ? 'فرۆشتن' : isAr ? 'المبيعات' : 'Sales',
      key: 'sales' as keyof EmployeePermissions,
      icon: 'cart-outline' as const,
      badgeText: isKu ? 'کارت و پسوولەی فرۆشتن' : 'POS Checkout & Sales',
    },
    {
      label: isKu ? 'کڕین' : isAr ? 'المشتريات' : 'Purchases',
      key: 'purchases' as keyof EmployeePermissions,
      icon: 'bag-check-outline' as const,
      badgeText: isKu ? 'تۆمارکردنی فاکتۆری کڕین' : 'Purchase Invoices',
    },
    {
      label: isKu ? 'کۆگا و مەخزەن' : isAr ? 'المخزن' : 'Inventory',
      key: 'inventory' as keyof EmployeePermissions,
      icon: 'cube-outline' as const,
      badgeText: isKu ? 'کاڵاکان، وەجبە و بارکۆد' : 'Products & Stock',
    },
    {
      label: isKu ? 'مێژووی جووڵە' : isAr ? 'السجل' : 'History',
      key: 'history' as keyof EmployeePermissions,
      icon: 'time-outline' as const,
      badgeText: isKu ? 'مێژووی هاتوو و ڕۆیشتوو' : 'Stock Movements',
    },
    {
      label: isKu ? 'پسوولەکان' : isAr ? 'الفواتير' : 'Invoices',
      key: 'invoices' as keyof EmployeePermissions,
      icon: 'receipt-outline' as const,
      badgeText: isKu ? 'هەموو پسوولەکان + دەسەڵاتی سڕینەوە' : 'Invoices & Voiding',
      expandable: true,
      expanded: expandedInvoices,
      toggle: () => setExpandedInvoices(!expandedInvoices),
      content: (
        <View style={styles.subItemRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.subItemTitle, { color: colors.black }]}>
              {isKu ? 'سڕینەوەی وەسڵ و پسوولەکان' : isAr ? 'حذف الفواتير' : 'Delete Invoices'}
            </Text>
            <Text style={[styles.subItemDesc, { color: colors.gray400 }]}>
              {isKu
                ? 'ڕێگە بە کارمەند دەدات وەسڵی فرۆشتن یان کڕین بسڕێتەوە'
                : 'Allow employee to delete sales or purchase invoices'}
            </Text>
          </View>
          <Switch
            value={permissions.canDeleteInvoice}
            onValueChange={(val) => {
              Haptics.selectionAsync().catch(() => {});
              setPermissions((p) => ({ ...p, canDeleteInvoice: val }));
            }}
            trackColor={{ false: colors.gray300, true: colors.primary }}
          />
        </View>
      ),
    },
    {
      label: isKu ? 'قەرزەکان' : isAr ? 'الديون' : 'Debts',
      key: 'debts' as keyof EmployeePermissions,
      icon: 'wallet-outline' as const,
      badgeText: isKu ? 'قەرزی کڕیاران و دابینکەران' : 'Receivables & Payables',
    },
    {
      label: isKu ? 'خەرجییەکان' : isAr ? 'المصاريف' : 'Expenses',
      key: 'expenses' as keyof EmployeePermissions,
      icon: 'cash-outline' as const,
      badgeText: isKu ? 'تۆمارکردنی خەرجی و مەسروفات' : 'Store Expenses',
    },
    {
      label: isKu ? 'عەرزی نرخ' : isAr ? 'عروض الأسعار' : 'Quotations',
      key: 'quotations' as keyof EmployeePermissions,
      icon: 'document-text-outline' as const,
      badgeText: isKu ? 'دروستکردنی پێشنیاری نرخ' : 'Price Quotations',
    },
    {
      label: isKu ? 'ستۆری ئۆنلاین' : isAr ? 'المتجر الإلكتروني' : 'Online Store',
      key: 'onlineStore' as keyof EmployeePermissions,
      icon: 'storefront-outline' as const,
      badgeText: isKu ? 'بینینی بەشی فرۆشگای سەر وێب' : 'Web Storefront',
    },
    {
      label: isKu ? 'ڕاپۆرت و قازانج' : isAr ? 'التقارير والأرباح' : 'Reports & Profit',
      key: 'reports' as keyof EmployeePermissions,
      icon: 'bar-chart-outline' as const,
      badgeText: isKu ? 'شیکاری دارایی و قازانجی نەختینە' : 'Financial Reports',
    },
  ];

  // Dashboard Widgets definitions
  const widgetItems: {
    label: string;
    key: keyof DashboardWidgetPermissions;
    icon: keyof typeof Ionicons.glyphMap;
    desc: string;
  }[] = [
    {
      label: isKu ? 'قازانج و داهات' : isAr ? 'الإيرادات والأرباح' : 'Revenue & Profit',
      key: 'kpiRevenue',
      icon: 'trending-up-outline',
      desc: isKu
        ? 'کۆی داهات، قازانجی چاوەڕوانکراو و ڕێژەی قازانج'
        : 'Total Revenue and Net Profit Margins',
    },
    {
      label: isKu ? 'فرۆشتن و پسوولەکان' : isAr ? 'المبيعات والفواتير' : 'Sales & Invoices Count',
      key: 'kpiSales',
      icon: 'cart-outline',
      desc: isKu
        ? 'کۆی بڕی فرۆشراو و ژمارەی پسوولەکانی فرۆشتن'
        : 'Total Sales Amount and Invoice Count',
    },
    {
      label: isKu ? 'کڕین و فاکتۆرەکان' : isAr ? 'المشتريات والتكاليف' : 'Purchases Cost',
      key: 'kpiPurchases',
      icon: 'bag-handle-outline',
      desc: isKu
        ? 'کۆی بەهای کڕین و پسوولەکانی کڕین لە کۆگادا'
        : 'Purchases Total Cost and Bill Counts',
    },
    {
      label: isKu ? 'قەرزەکانی سەرشان و کڕیار' : isAr ? 'الديون والمستحقات' : 'Debts Overview',
      key: 'kpiDebts',
      icon: 'wallet-outline',
      desc: isKu
        ? 'کۆی قەرزی لای کڕیاران و قەرزی سەرشان بۆ دابینکەران'
        : 'Receivables and Supplier Payables',
    },
    {
      label: isKu ? 'مەسروفات و داشکاندن' : isAr ? 'المصاريف والخصومات' : 'Expenses & Discounts',
      key: 'kpiExpenses',
      icon: 'pricetag-outline',
      desc: isKu
        ? 'کۆی گشتی خەرجی و مەسروفات و کۆی داشکاندن'
        : 'Total Store Expenses and Discount Summaries',
    },
    {
      label: isKu ? 'کەمی کاڵا و وەجبەکان' : isAr ? 'المخزون والوجبات' : 'Stock Alerts & Batches',
      key: 'kpiStockAlerts',
      icon: 'alert-circle-outline',
      desc: isKu
        ? 'کەمیی مەخزەن، وەجبە چالاکەکان و نزیک بەسەرچوون'
        : 'Low Stock Alerts, Active and Depleted Batches',
    },
    {
      label: isKu ? 'چالاکییە نوێیەکان' : isAr ? 'شريط النشاطات' : 'Activity Feed',
      key: 'activityFeed',
      icon: 'flash-outline',
      desc: isKu
        ? 'تەوژمی ڕاستەوخۆی مامەڵە و فرۆشتنە نوێیەکان'
        : 'Live Feed of recent sales, debts and operations',
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: isDark ? '#0B1120' : colors.gray50 }]}>
      {/* Sleek App Header with clean, non-overflowing Save Button */}
      <AppHeader
        title={isKu ? `دەسەڵاتەکان: ${employeeName}` : isAr ? `صلاحيات: ${employeeName}` : `Permissions: ${employeeName}`}
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity
            style={[
              styles.saveHeaderBtn,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" />
                <Text style={styles.saveHeaderBtnText}>
                  {isKu ? 'پاشەکەوت' : isAr ? 'حفظ' : 'Save'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      {/* Modern 4-Category Pill Navigation Bar */}
      <View
        style={[
          styles.tabBarWrapper,
          {
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            borderBottomColor: isDark ? '#1E293B' : '#E2E8F0',
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabBarScroll, { flexDirection }]}
        >
          {/* Tab 1: Modules */}
          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === 'modules' && [styles.tabPillActive, { backgroundColor: colors.primary }],
              { borderColor: activeTab === 'modules' ? colors.primary : isDark ? '#334155' : '#E2E8F0' },
            ]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setActiveTab('modules');
            }}
          >
            <Ionicons
              name="apps-outline"
              size={16}
              color={activeTab === 'modules' ? '#FFFFFF' : colors.gray400}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === 'modules' ? '#FFFFFF' : colors.gray400 },
              ]}
            >
              {isKu ? 'مۆدیوڵەکان' : isAr ? 'الأقسام' : 'Modules'}
            </Text>
          </TouchableOpacity>

          {/* Tab 2: Dashboard */}
          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === 'dashboard' && [styles.tabPillActive, { backgroundColor: colors.primary }],
              { borderColor: activeTab === 'dashboard' ? colors.primary : isDark ? '#334155' : '#E2E8F0' },
            ]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setActiveTab('dashboard');
            }}
          >
            <Ionicons
              name="grid-outline"
              size={16}
              color={activeTab === 'dashboard' ? '#FFFFFF' : colors.gray400}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === 'dashboard' ? '#FFFFFF' : colors.gray400 },
              ]}
            >
              {isKu ? 'داشبۆرد' : isAr ? 'اللوحة' : 'Dashboard'}
            </Text>
          </TouchableOpacity>

          {/* Tab 3: Settings */}
          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === 'settings' && [styles.tabPillActive, { backgroundColor: colors.primary }],
              { borderColor: activeTab === 'settings' ? colors.primary : isDark ? '#334155' : '#E2E8F0' },
            ]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setActiveTab('settings');
            }}
          >
            <Ionicons
              name="settings-outline"
              size={16}
              color={activeTab === 'settings' ? '#FFFFFF' : colors.gray400}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === 'settings' ? '#FFFFFF' : colors.gray400 },
              ]}
            >
              {isKu ? 'ڕێکخستنەکان' : isAr ? 'الإعدادات' : 'Settings'}
            </Text>
          </TouchableOpacity>

          {/* Tab 4: Security */}
          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === 'security' && [styles.tabPillActive, { backgroundColor: colors.primary }],
              { borderColor: activeTab === 'security' ? colors.primary : isDark ? '#334155' : '#E2E8F0' },
            ]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setActiveTab('security');
            }}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={activeTab === 'security' ? '#FFFFFF' : colors.gray400}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === 'security' ? '#FFFFFF' : colors.gray400 },
              ]}
            >
              {isKu ? 'تێپەڕەوشە و ئاسایش' : isAr ? 'الأمان' : 'Security'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isTablet && contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================== */}
        {/* TAB 1: MODULES (مۆدیوڵەکانی ئەپ)                               */}
        {/* ============================================================== */}
        {activeTab === 'modules' && (
          <View style={styles.tabContent}>
            <View style={[styles.sectionBanner, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionBannerText, { color: isDark ? '#E2E8F0' : colors.black }]}>
                {isKu
                  ? 'دەتوانی هەر مۆدیوڵێک چالاک بکەیت، بە تەواوی بیشاریتەوە یان قوفڵی بکەیت بە دیسەیبڵ.'
                  : 'Manage which modules this employee can view or use.'}
              </Text>
            </View>

            <View style={styles.cardsContainer}>
              {moduleItems.map((item) =>
                renderPermCard(
                  item.label,
                  item.key,
                  item.icon,
                  item.badgeText,
                  item.content,
                  item.expanded,
                  item.toggle
                )
              )}
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 2: DASHBOARD (داشبۆرد و ئامارەکان)                           */}
        {/* ============================================================== */}
        {activeTab === 'dashboard' && (
          <View style={styles.tabContent}>
            {/* 1. Main Dashboard Access */}
            <Text style={[styles.sectionTitle, { color: colors.black }]}>
              {isKu ? 'دەستپێڕاگەیشتن بە داشبۆرد' : 'Main Dashboard Access'}
            </Text>
            {renderPermCard(
              isKu ? 'بەشی داشبۆرد بە گشتی' : 'Dashboard Module',
              'dashboard',
              'grid-outline',
              isKu ? 'پیشاندانی داشبۆرد لە مینیوی سەرەکی' : 'Show dashboard module'
            )}

            {/* 2. Activity Inspector Modal Trigger Button */}
            <TouchableOpacity
              style={[
                styles.inspectActivitiesBtn,
                {
                  backgroundColor: colors.primary + '18',
                  borderColor: colors.primary + '50',
                  flexDirection,
                },
              ]}
              onPress={handleOpenActivities}
              activeOpacity={0.8}
            >
              <View style={[styles.inspectIconBox, { backgroundColor: colors.primary }]}>
                <Ionicons name="list-outline" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, paddingHorizontal: 10 }}>
                <Text style={[styles.inspectBtnTitle, { color: colors.black }]}>
                  {isKu ? 'بینینی تەواوی چالاکییەکانی ئەم کارمەندە' : 'View All Employee Activities'}
                </Text>
                <Text style={[styles.inspectBtnSubtitle, { color: colors.gray400 }]}>
                  {isKu
                    ? 'پشکنینی هەموو ئەو فرۆشتن، کڕین و قەرزانەی ئەم کارمەندە ئەنجامی داون'
                    : 'Inspect all sales, purchases and debt payments made by this staff'}
                </Text>
              </View>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>

            {/* 3. Dashboard Activity Scope */}
            <Text style={[styles.sectionTitle, { color: colors.black, marginTop: 18 }]}>
              {isKu ? 'بواری بینینی چالاکییەکان لە داشبۆرد' : 'Activity Feed Visibility Scope'}
            </Text>
            <View
              style={[
                styles.scopeContainer,
                {
                  backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                  borderColor: isDark ? colors.gray200 : '#E2E8F0',
                },
              ]}
            >
              {/* Option A: Own only */}
              <TouchableOpacity
                style={[
                  styles.scopeOption,
                  permissions.subPermissions?.activityScope === 'own_only' && {
                    backgroundColor: colors.primary + '15',
                    borderColor: colors.primary,
                  },
                  { flexDirection },
                ]}
                onPress={() =>
                  updateSubPermission((p) => ({ ...p, activityScope: 'own_only' }))
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor:
                        permissions.subPermissions?.activityScope === 'own_only'
                          ? colors.primary
                          : colors.gray300,
                    },
                  ]}
                >
                  {permissions.subPermissions?.activityScope === 'own_only' && (
                    <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <Text style={[styles.scopeTitle, { color: colors.black }]}>
                    👤 {isKu ? 'تەنها چالاکییەکانی خۆی' : 'Only Own Activities'}
                  </Text>
                  <Text style={[styles.scopeDesc, { color: colors.gray400 }]}>
                    {isKu
                      ? 'کارمەندەکە تەنها ئەو فرۆشتن و وەسڵانە دەبینێت کە خۆی تۆماری کردوون (فرۆشتنەکانی بەڕێوەبەر نایەتە لای).'
                      : 'Employee only sees their own sales and actions. Manager actions remain private.'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option B: All activities */}
              <TouchableOpacity
                style={[
                  styles.scopeOption,
                  permissions.subPermissions?.activityScope === 'all' && {
                    backgroundColor: colors.primary + '15',
                    borderColor: colors.primary,
                  },
                  { flexDirection, marginTop: 8 },
                ]}
                onPress={() =>
                  updateSubPermission((p) => ({ ...p, activityScope: 'all' }))
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor:
                        permissions.subPermissions?.activityScope === 'all'
                          ? colors.primary
                          : colors.gray300,
                    },
                  ]}
                >
                  {permissions.subPermissions?.activityScope === 'all' && (
                    <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <Text style={[styles.scopeTitle, { color: colors.black }]}>
                    🌐 {isKu ? 'سەرجەم فرۆشتن و چالاکییەکان' : 'All Store Activities'}
                  </Text>
                  <Text style={[styles.scopeDesc, { color: colors.gray400 }]}>
                    {isKu
                      ? 'کارمەندەکە هەموو چالاکییەکانی فرۆشگا دەبینێت (بە هی بەڕێوەبەر و کارمەندانی ترەوە).'
                      : 'Employee sees all operations across the business, including manager actions.'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* 4. Individual KPI Widgets Control */}
            <Text style={[styles.sectionTitle, { color: colors.black, marginTop: 22 }]}>
              {isKu ? 'کۆنترۆڵی ئامار و زانیارییەکانی سەر داشبۆرد' : 'Dashboard KPI Widgets Control'}
            </Text>
            <View style={styles.cardsContainer}>
              {widgetItems.map((w) => {
                const curState =
                  permissions.dashboardWidgets?.[w.key] || 'active';
                return (
                  <View
                    key={w.key}
                    style={[
                      styles.permCard,
                      {
                        backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                        borderColor: isDark ? colors.gray200 : '#E2E8F0',
                      },
                    ]}
                  >
                    <View style={[styles.permCardHeader, { flexDirection }]}>
                      <View style={[styles.permTitleRow, { flexDirection }]}>
                        <View
                          style={[
                            styles.iconBadge,
                            {
                              backgroundColor: colors.primary + '18',
                              borderColor: colors.primary + '30',
                            },
                          ]}
                        >
                          <Ionicons name={w.icon} size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.permTitle, { color: colors.black }]}>
                            {w.label}
                          </Text>
                          <Text style={[styles.permSubtitle, { color: colors.gray400 }]}>
                            {w.desc}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {renderThreeWaySelector(curState, (st) => setWidgetState(w.key, st))}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 3: SETTINGS (ڕێکخستنەکان)                                   */}
        {/* ============================================================== */}
        {activeTab === 'settings' && (
          <View style={styles.tabContent}>
            <View style={[styles.sectionBanner, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
              <Ionicons name="options-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionBannerText, { color: isDark ? '#E2E8F0' : colors.black }]}>
                {isKu
                  ? 'دەتوانی هەر بەشێکی ڕێکخستن دیاری بکەیت، وە لە ڕێگەی «وردەکاری» زیاتر بچیتە ناو وردەکارییەکانی وەک زمان و دراو.'
                  : 'Configure granular settings permissions and nested sub-features.'}
              </Text>
            </View>

            <View style={styles.cardsContainer}>
              {/* 1. Language Setting with Accordion */}
              {renderPermCard(
                isKu ? 'زمان (Language)' : 'Language',
                'settingsLanguage',
                'language-outline',
                isKu ? 'دەسەڵاتی گۆڕینی زمان لە ڕێکخستنەکان' : 'Language switch screen',
                <View style={styles.nestedContainer}>
                  <Text style={[styles.nestedHeader, { color: colors.black }]}>
                    {isKu ? 'زمانە ڕێگەپێدراوەکان بۆ ئەم کارمەندە:' : 'Allowed Languages:'}
                  </Text>
                  {/* Kurdish */}
                  <View style={[styles.subItemRow, { flexDirection }]}>
                    <Text style={[styles.subItemTitle, { color: colors.black }]}>
                      کوردی (Kurdish - Sorani)
                    </Text>
                    <Switch
                      value={permissions.subPermissions?.allowedLanguages?.ku ?? true}
                      onValueChange={(val) =>
                        updateSubPermission((p) => ({
                          ...p,
                          allowedLanguages: { ...p.allowedLanguages, ku: val },
                        }))
                      }
                      trackColor={{ false: colors.gray300, true: colors.primary }}
                    />
                  </View>
                  {/* Arabic */}
                  <View style={[styles.subItemRow, { flexDirection, borderTopWidth: 1, borderTopColor: isDark ? '#27354A' : '#E2E8F0' }]}>
                    <Text style={[styles.subItemTitle, { color: colors.black }]}>
                      العربية (Arabic)
                    </Text>
                    <Switch
                      value={permissions.subPermissions?.allowedLanguages?.ar ?? true}
                      onValueChange={(val) =>
                        updateSubPermission((p) => ({
                          ...p,
                          allowedLanguages: { ...p.allowedLanguages, ar: val },
                        }))
                      }
                      trackColor={{ false: colors.gray300, true: colors.primary }}
                    />
                  </View>
                  {/* English */}
                  <View style={[styles.subItemRow, { flexDirection, borderTopWidth: 1, borderTopColor: isDark ? '#27354A' : '#E2E8F0' }]}>
                    <Text style={[styles.subItemTitle, { color: colors.black }]}>
                      English (ئینگلیزی)
                    </Text>
                    <Switch
                      value={permissions.subPermissions?.allowedLanguages?.en ?? true}
                      onValueChange={(val) =>
                        updateSubPermission((p) => ({
                          ...p,
                          allowedLanguages: { ...p.allowedLanguages, en: val },
                        }))
                      }
                      trackColor={{ false: colors.gray300, true: colors.primary }}
                    />
                  </View>
                </View>,
                expandedLanguage,
                () => setExpandedLanguage(!expandedLanguage)
              )}

              {/* 2. Currency Setting with Accordion */}
              {renderPermCard(
                isKu ? 'دراو و نرخی ئاڵوگۆڕ' : 'Base Currency & Rates',
                'settingsCurrency',
                'cash-outline',
                isKu ? 'ڕێکخستنی دۆلار، دینار و نرخی ڕۆژ' : 'Currency & Exchange rates',
                <View style={styles.nestedContainer}>
                  <View style={[styles.subItemRow, { flexDirection }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.subItemTitle, { color: colors.black }]}>
                        {isKu ? 'گۆڕینی دراوی بنچینە (USD / IQD)' : 'Change Base Currency'}
                      </Text>
                      <Text style={[styles.subItemDesc, { color: colors.gray400 }]}>
                        {isKu ? 'ڕێگەدان بە گۆڕینی دراوی سەرەکی دووکان' : 'Allow changing store base currency'}
                      </Text>
                    </View>
                    <Switch
                      value={permissions.subPermissions?.canChangeBaseCurrency ?? false}
                      onValueChange={(val) =>
                        updateSubPermission((p) => ({ ...p, canChangeBaseCurrency: val }))
                      }
                      trackColor={{ false: colors.gray300, true: colors.primary }}
                    />
                  </View>

                  <View style={[styles.subItemRow, { flexDirection, borderTopWidth: 1, borderTopColor: isDark ? '#27354A' : '#E2E8F0' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.subItemTitle, { color: colors.black }]}>
                        {isKu ? 'دەستکاریکردنی نرخی ئاڵوگۆڕ' : 'Change Exchange Rate'}
                      </Text>
                      <Text style={[styles.subItemDesc, { color: colors.gray400 }]}>
                        {isKu ? 'ڕێگەدان بە گۆڕینی نرخی دۆلار بەرامبەر دینار' : 'Allow modifying USD/IQD rate'}
                      </Text>
                    </View>
                    <Switch
                      value={permissions.subPermissions?.canChangeExchangeRate ?? false}
                      onValueChange={(val) =>
                        updateSubPermission((p) => ({ ...p, canChangeExchangeRate: val }))
                      }
                      trackColor={{ false: colors.gray300, true: colors.primary }}
                    />
                  </View>
                </View>,
                expandedCurrency,
                () => setExpandedCurrency(!expandedCurrency)
              )}

              {/* 3. Receipt Customization with Accordion */}
              {renderPermCard(
                isKu ? 'شێوازی چاپ و پسوولەکان' : 'Receipt Customization',
                'settingsReceiptCustomization',
                'print-outline',
                isKu ? 'قەبارەی کاغەز (58mm, 80mm, 110mm, A4)' : 'Paper sizes and templates',
                <View style={styles.nestedContainer}>
                  <View style={[styles.subItemRow, { flexDirection }]}>
                    <Text style={[styles.subItemTitle, { color: colors.black }]}>
                      {isKu ? 'دیزاینی وەسڵی فرۆشتن' : 'Sales Receipt Layout'}
                    </Text>
                    <Switch
                      value={permissions.subPermissions?.canCustomizeSalesReceipt ?? true}
                      onValueChange={(val) =>
                        updateSubPermission((p) => ({ ...p, canCustomizeSalesReceipt: val }))
                      }
                      trackColor={{ false: colors.gray300, true: colors.primary }}
                    />
                  </View>

                  <View style={[styles.subItemRow, { flexDirection, borderTopWidth: 1, borderTopColor: isDark ? '#27354A' : '#E2E8F0' }]}>
                    <Text style={[styles.subItemTitle, { color: colors.black }]}>
                      {isKu ? 'دیزاینی فاکتۆری کڕین' : 'Purchase Receipt Layout'}
                    </Text>
                    <Switch
                      value={permissions.subPermissions?.canCustomizePurchaseReceipt ?? true}
                      onValueChange={(val) =>
                        updateSubPermission((p) => ({ ...p, canCustomizePurchaseReceipt: val }))
                      }
                      trackColor={{ false: colors.gray300, true: colors.primary }}
                    />
                  </View>

                  <View style={[styles.subItemRow, { flexDirection, borderTopWidth: 1, borderTopColor: isDark ? '#27354A' : '#E2E8F0' }]}>
                    <Text style={[styles.subItemTitle, { color: colors.black }]}>
                      {isKu ? 'دیزاینی وەسڵی عەرزی نرخ' : 'Quotation Receipt Layout'}
                    </Text>
                    <Switch
                      value={permissions.subPermissions?.canCustomizeQuotationReceipt ?? true}
                      onValueChange={(val) =>
                        updateSubPermission((p) => ({ ...p, canCustomizeQuotationReceipt: val }))
                      }
                      trackColor={{ false: colors.gray300, true: colors.primary }}
                    />
                  </View>

                  <View style={[styles.subItemRow, { flexDirection, borderTopWidth: 1, borderTopColor: isDark ? '#27354A' : '#E2E8F0' }]}>
                    <Text style={[styles.subItemTitle, { color: colors.black }]}>
                      {isKu ? 'دیزاینی پسوولەی قەرز' : 'Debt Receipt Layout'}
                    </Text>
                    <Switch
                      value={permissions.subPermissions?.canCustomizeDebtReceipt ?? true}
                      onValueChange={(val) =>
                        updateSubPermission((p) => ({ ...p, canCustomizeDebtReceipt: val }))
                      }
                      trackColor={{ false: colors.gray300, true: colors.primary }}
                    />
                  </View>
                </View>,
                expandedReceipts,
                () => setExpandedReceipts(!expandedReceipts)
              )}

              {/* 4. Store Profile & Logo */}
              {renderPermCard(
                isKu ? 'دەستکاری ناوی مارکێت و لۆگۆ' : 'Store Profile & Logo',
                'settingsProfile',
                'business-outline',
                isKu ? 'گۆڕینی ناوی مارکێت، ژمارەی تەلەفۆن و لۆگۆ' : 'Store name, phone & logo'
              )}

              {/* 5. Theme & Colors */}
              {renderPermCard(
                isKu ? 'ڕووکار و دارک مۆد' : 'Theme & Dark Mode',
                'settingsTheme',
                'color-palette-outline',
                isKu ? 'گۆڕینی دۆخی تاریک و ڕەنگی پڕۆگرام' : 'Dark mode & theme colors'
              )}

              {/* 6. Data & Backup */}
              {renderPermCard(
                isKu ? 'داتا و باکئەپ' : 'Data & Backup',
                'settingsBackup',
                'cloud-upload-outline',
                isKu ? 'پاشەکەوتکردن و گێڕانەوەی داتا' : 'Local and Cloud backups'
              )}

              {/* 7. Delete Account & DB */}
              {renderPermCard(
                isKu ? 'سڕینەوەی ئەکاونت و داتابەیس' : 'Delete Account & Database',
                'settingsDeleteAccount',
                'trash-outline',
                isKu ? 'سڕینەوەی تەواوەتی پڕۆگرام' : 'Factory reset and deletion'
              )}
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 4: SECURITY & PASSWORD (ئاسایش و تێپەڕەوشە)                 */}
        {/* ============================================================== */}
        {activeTab === 'security' && (
          <View style={styles.tabContent}>
            {/* Password Change Card */}
            <View
              style={[
                styles.passwordCard,
                {
                  backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                  borderColor: isDark ? colors.gray200 : '#E2E8F0',
                },
              ]}
            >
              <View style={[styles.passwordHeader, { flexDirection }]}>
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: colors.primary + '18', borderColor: colors.primary + '30' },
                  ]}
                >
                  <Ionicons name="key" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <Text style={[styles.passwordTitle, { color: colors.black }]}>
                    {isKu ? 'گۆڕینی تێپەڕەوشەی چوونەژوورەوە' : 'Change Employee Password'}
                  </Text>
                  <Text style={[styles.passwordSubtitle, { color: colors.gray400 }]}>
                    {isKu
                      ? 'دەتوانی ڕاستەوخۆ لێرەوە پاسۆردی کارمەندەکە بگۆڕیت'
                      : 'Set a new password for this employee account (min 6 chars)'}
                  </Text>
                </View>
              </View>

              {/* Current Password pill */}
              {(currentDisplayPassword || foundEmp?.password) ? (
                <View
                  style={[
                    styles.currentPassBanner,
                    {
                      backgroundColor: isDark ? '#152136' : '#F1F5F9',
                      borderColor: isDark ? '#27354A' : '#E2E8F0',
                      flexDirection,
                    },
                  ]}
                >
                  <Text style={[styles.currentPassTitle, { color: colors.gray400 }]}>
                    {isKu ? 'پاسۆردی ئێستا:' : 'Current Password:'}
                  </Text>
                  <Text
                    style={[
                      styles.currentPassVal,
                      { color: colors.primary },
                    ]}
                  >
                    {showPasswordText
                      ? currentDisplayPassword || foundEmp?.password
                      : '••••••••'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowPasswordText(!showPasswordText)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showPasswordText ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.gray400}
                    />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* New Password Input & Update Button */}
              <View style={[styles.passwordInputRow, { flexDirection }]}>
                <TextInput
                  style={[
                    styles.passInput,
                    {
                      backgroundColor: isDark ? colors.gray200 : colors.gray50,
                      borderColor: isDark ? colors.gray300 : '#CBD5E1',
                      color: colors.black,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  placeholder={
                    isKu
                      ? 'تێپەڕەوشەی نوێ (لانیکەم ٦ پیت)...'
                      : 'Enter new password (min 6 chars)...'
                  }
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
                      backgroundColor:
                        newPassword.trim().length >= 6 ? colors.primary : colors.gray400,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  {isUpdatingPassword ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.updatePassBtnText}>
                      {isKu ? 'نوێکردنەوە' : 'Update'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Details & Metadata Card */}
            <View
              style={[
                styles.accountMetaCard,
                {
                  backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                  borderColor: isDark ? colors.gray200 : '#E2E8F0',
                },
              ]}
            >
              <Text style={[styles.accountMetaHeader, { color: colors.black }]}>
                {isKu ? 'زانیارییەکانی هەژماری کارمەند' : 'Account Details'}
              </Text>

              <View style={[styles.metaRow, { flexDirection }]}>
                <Text style={[styles.metaLabel, { color: colors.gray400 }]}>
                  {isKu ? 'ناوی کارمەند' : 'Name'}
                </Text>
                <Text style={[styles.metaVal, { color: colors.black }]}>
                  {foundEmp?.displayName || employeeName}
                </Text>
              </View>

              <View style={[styles.metaRow, { flexDirection }]}>
                <Text style={[styles.metaLabel, { color: colors.gray400 }]}>
                  {isKu ? 'ئیمەیڵ' : 'Email'}
                </Text>
                <Text style={[styles.metaVal, { color: colors.black }]}>
                  {email}
                </Text>
              </View>

              <View style={[styles.metaRow, { flexDirection }]}>
                <Text style={[styles.metaLabel, { color: colors.gray400 }]}>
                  {isKu ? 'بەڕێوەبەری سەرپەرشتیار' : 'Supervisor Manager'}
                </Text>
                <Text style={[styles.metaVal, { color: colors.primary }]}>
                  {foundEmp?.managerEmail || user?.email || '—'}
                </Text>
              </View>

              <View style={[styles.metaRow, { flexDirection }]}>
                <Text style={[styles.metaLabel, { color: colors.gray400 }]}>
                  {isKu ? 'دۆخی هەژمار' : 'Status'}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: foundEmp?.status === 'suspended' ? '#EF444420' : '#10B98120' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: foundEmp?.status === 'suspended' ? '#EF4444' : '#10B981' },
                    ]}
                  >
                    {foundEmp?.status === 'suspended'
                      ? isKu ? 'ڕاگیراو 🔒' : 'Suspended'
                      : isKu ? 'چالاک ✅' : 'Active'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Prominent Save Button */}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
              <Text style={styles.bottomSaveBtnText}>
                {isKu ? 'پاشەکەوتکردنی دەسەڵاتەکان' : isAr ? 'حفظ الصلاحيات' : 'Save Permissions'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ============================================================== */}
      {/* ACTIVITY INSPECTOR MODAL (پشکنینی چالاکییەکانی کارمەند)        */}
      {/* ============================================================== */}
      <Modal
        visible={activityModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActivityModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDark ? '#0B1120' : '#F8FAFC' }]}>
          {/* Modal Header */}
          <View
            style={[
              styles.modalHeader,
              {
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                borderBottomColor: isDark ? '#1E293B' : '#E2E8F0',
                flexDirection,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: colors.black }]}>
                {isKu ? `چالاکییەکانی ${employeeName}` : `Activities: ${employeeName}`}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.gray400 }]}>
                {isKu
                  ? `${employeeActivities.length} کردار تۆمار کراون لەلایەن ئەم کارمەندەوە`
                  : `${employeeActivities.length} operations recorded by this staff`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setActivityModalVisible(false)}
              style={[
                styles.modalCloseBtn,
                { backgroundColor: isDark ? colors.gray200 : colors.gray100 },
              ]}
            >
              <Ionicons name="close" size={22} color={colors.black} />
            </TouchableOpacity>
          </View>

          {loadingActivities ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.gray400, marginTop: 12 }}>
                {isKu ? 'بارکردنی چالاکییەکان...' : 'Loading activities...'}
              </Text>
            </View>
          ) : employeeActivities.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Ionicons name="document-text-outline" size={54} color={colors.gray400} />
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>
                {isKu
                  ? 'هیچ کردار یان فرۆشتنێک تۆمار نەکراوە لەلایەن ئەم کارمەندەوە.'
                  : 'No operations or sales found recorded by this employee.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={employeeActivities}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              renderItem={({ item }) => {
                const isSale = item.type === 'sale';
                const isDebt = item.type === 'customer_debt' || item.type === 'supplier_debt';
                const isPurchase = item.type === 'purchase';

                const iconName: keyof typeof Ionicons.glyphMap = isSale
                  ? 'cart'
                  : isPurchase
                  ? 'bag-handle'
                  : isDebt
                  ? 'wallet'
                  : 'cash';
                const iconColor = isSale
                  ? '#10B981'
                  : isPurchase
                  ? '#8B5CF6'
                  : isDebt
                  ? '#F59E0B'
                  : '#EF4444';

                return (
                  <View
                    style={[
                      styles.actCard,
                      {
                        backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                        borderColor: isDark ? colors.gray200 : '#E2E8F0',
                        flexDirection,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.actIconBox,
                        { backgroundColor: iconColor + '18', borderColor: iconColor + '30' },
                      ]}
                    >
                      <Ionicons name={iconName} size={20} color={iconColor} />
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                      <Text style={[styles.actTitle, { color: colors.black }]}>
                        {item.title}
                      </Text>
                      <Text style={[styles.actSubtitle, { color: colors.gray400 }]}>
                        {item.subtitle} • {formatDateTimeUI(item.timestamp)}
                      </Text>
                    </View>
                    {item.amount > 0 ? (
                      <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                        <AmountText
                          value={item.amount}
                          style={[styles.actAmount, { color: iconColor }]}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  saveHeaderBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveHeaderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  tabBarWrapper: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tabBarScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabPillActive: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  tabContent: {
    gap: 14,
  },
  sectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  sectionBannerText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginVertical: 4,
    paddingHorizontal: 2,
  },
  cardsContainer: {
    gap: 12,
  },
  permCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  permCardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  permTitleRow: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  permSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  drillDownBtn: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  drillDownBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segmentGroup: {
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
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
  expandableBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
  },
  nestedContainer: {
    gap: 8,
  },
  nestedHeader: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  subItemRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 10,
  },
  subItemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  subItemDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  inspectActivitiesBtn: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 6,
  },
  inspectIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectBtnTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  inspectBtnSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  scopeContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  scopeOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scopeTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  scopeDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  passwordCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  passwordHeader: {
    alignItems: 'center',
  },
  passwordTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  passwordSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  currentPassBanner: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  currentPassTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  currentPassVal: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    flex: 1,
  },
  eyeBtn: {
    padding: 4,
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
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updatePassBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
  accountMetaCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  accountMetaHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metaLabel: {
    fontSize: 12.5,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  bottomSaveBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  actCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  actIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  actSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  actAmount: {
    fontSize: 14.5,
    fontWeight: '700',
  },
});
