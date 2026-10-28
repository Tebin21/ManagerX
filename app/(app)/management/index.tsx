import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/AppText';
import { AppHeader } from '@/components/common/AppHeader';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuthStore } from '@/store/authStore';
import { isAdminEmail } from '@/lib/adminNotificationService';
import { useManagementStore } from '@/store/managementStore';
import {
  setEmployeeStatus,
  deleteEmployeeAccount,
} from '@/lib/management/managementService';
import { getGoogleDriveConfig, connectGoogleDrive, GoogleDriveConfig } from '@/lib/googleDriveBackup';
import type { EmployeeAccount } from '@/lib/management/types';

export default function ManagementScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const rtl = useRTL();
  const isRTL = rtl?.isRTL ?? true;
  const flexDirection = rtl?.flexDirection ?? 'row-reverse';
  const { isTablet, contentContainerStyle } = useResponsive();

  const user = useAuthStore((s) => s.user);
  const isAdmin = isAdminEmail(user?.email);
  const isManager = useManagementStore((s) => s.isManager);
  const managedEmployees = useManagementStore((s) => s.managedEmployees);

  const {
    employees,
    isLoading,
    initSuperAdminSubscription,
    initManagerSubscription,
  } = useManagementStore();

  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [gdriveConfig, setGdriveConfig] = useState<GoogleDriveConfig | null>(null);
  const [connectingDrive, setConnectingDrive] = useState(false);

  useEffect(() => {
    // If not superadmin and not a manager, bounce back
    if (!isAdmin && !isManager) {
      router.replace('/(app)/dashboard-view' as never);
      return;
    }

    let unsub: (() => void) | undefined;
    if (isAdmin) {
      unsub = initSuperAdminSubscription();
    } else if (user?.email) {
      unsub = initManagerSubscription(user.email);
    }

    getGoogleDriveConfig().then(setGdriveConfig).catch(() => {});

    return () => {
      unsub?.();
    };
  }, [isAdmin, isManager, user?.email]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (isAdmin) {
      initSuperAdminSubscription();
    } else if (user?.email) {
      initManagerSubscription(user.email);
    }
    getGoogleDriveConfig().then(setGdriveConfig).catch(() => {});
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleConnectDrive = async () => {
    setConnectingDrive(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const cfg = await connectGoogleDrive();
      setGdriveConfig(cfg);
      Alert.alert(
        isRTL ? 'سەرکەوتوو بوو' : 'Success',
        isRTL
          ? 'گووگڵ درایڤ بەستراوەتەوە بە سەرکەوتوویی. داتاکانی کارمەندەکەت بەردەوام و پارێزراو بۆ ئەم درایڤە دەگوازرێنەوە.'
          : 'Google Drive connected successfully. Staff data will continuously sync to your personal drive.'
      );
    } catch (e: any) {
      console.warn('[Management] Drive connect error:', e);
      Alert.alert(
        isRTL ? 'هەڵە لە بەستنەوە' : 'Connection Error',
        isRTL ? 'نەتوانرا گووگڵ درایڤ ببەسترێتەوە. تکایە دووبارە هەوڵ بدەرەوە.' : 'Failed to connect Google Drive.'
      );
    } finally {
      setConnectingDrive(false);
    }
  };

  const displayEmployees = isAdmin ? employees : managedEmployees;
  const totalEmployees = displayEmployees.length;
  const activeCount = useMemo(
    () => displayEmployees.filter((e) => e.status !== 'suspended').length,
    [displayEmployees]
  );
  const suspendedCount = totalEmployees - activeCount;

  const handleToggleStatus = async (emp: EmployeeAccount) => {
    const nextStatus = emp.status === 'suspended' ? 'active' : 'suspended';
    setUpdatingId(emp.id);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await setEmployeeStatus(emp.email, nextStatus);
    } catch (e) {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = (emp: EmployeeAccount) => {
    Alert.alert(
      t('management.deleteEmployee'),
      `${t('management.deleteConfirm')}\n(${emp.displayName} - ${emp.email})`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
              await deleteEmployeeAccount(emp.email);
            } catch {
              Alert.alert(t('common.error'), t('common.tryAgain'));
            }
          },
        },
      ]
    );
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return iso;
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('management.title')}
        rightAction={
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(app)/management/new-employee' as never)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>{t('management.addEmployee')}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isTablet && contentContainerStyle]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Google Drive Status & Connect Card for Manager */}
        <View
          style={[
            styles.driveCard,
            {
              backgroundColor: gdriveConfig?.isConnected
                ? isDark ? '#064E3B33' : '#ECFDF5'
                : isDark ? '#78350F33' : '#FFFBEB',
              borderColor: gdriveConfig?.isConnected ? '#10B981' : '#F59E0B',
            },
          ]}
        >
          <View style={[styles.driveCardHeader, { flexDirection }]}>
            <View
              style={[
                styles.driveIconBox,
                { backgroundColor: gdriveConfig?.isConnected ? '#10B98122' : '#F59E0B22' },
              ]}
            >
              <Ionicons
                name={gdriveConfig?.isConnected ? 'cloud-done' : 'cloud-upload'}
                size={22}
                color={gdriveConfig?.isConnected ? '#10B981' : '#F59E0B'}
              />
            </View>

            <View style={styles.driveTextCol}>
              <Text
                style={[
                  styles.driveTitle,
                  { color: gdriveConfig?.isConnected ? (isDark ? '#34D399' : '#065F46') : (isDark ? '#FBBF24' : '#92400E') },
                ]}
              >
                {gdriveConfig?.isConnected
                  ? (isRTL ? 'گووگڵ درایڤ بەستراوەتەوە ✅' : 'Google Drive Connected')
                  : (isRTL ? 'پێویستە سەرەتا گووگڵ درایڤ ببەستیتەوە' : 'Connect Google Drive First')}
              </Text>
              <Text
                style={[
                  styles.driveDesc,
                  { color: isDark ? '#94A3B8' : '#64748B' },
                ]}
              >
                {gdriveConfig?.isConnected
                  ? (isRTL
                      ? `ئیمەیڵ: ${gdriveConfig.email || 'بەستراو'} · داتاکانی کارمەند بەردەوام و نەبینراو هاوکات دەکرێن.`
                      : `Synced to ${gdriveConfig.email || 'Drive'}. Staff data syncs automatically.`)
                  : (isRTL
                      ? 'بۆ ئەوەی داتاکانی کارمەندەکەت بە بەردەوامی و ئۆتۆماتیکی پاشەکەوت بن، تکایە گۆگڵ درایڤ ببەستەوە.'
                      : 'Connect your personal Google Drive so staff data backs up and syncs continuously.')}
              </Text>
            </View>

            {!gdriveConfig?.isConnected && (
              <TouchableOpacity
                onPress={handleConnectDrive}
                disabled={connectingDrive}
                style={[styles.driveActionBtn, { backgroundColor: '#F59E0B' }]}
                activeOpacity={0.8}
              >
                {connectingDrive ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.driveActionBtnText}>
                    {isRTL ? 'بەستنەوە' : 'Connect'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* KPI Top Cards */}
        <View style={[styles.kpiRow, { flexDirection }]}>
          <View style={[styles.kpiCard, { backgroundColor: isDark ? colors.gray100 : '#FFFFFF', borderColor: colors.gray200 }]}>
            <View style={[styles.kpiIcon, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
              <Ionicons name="people" size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.kpiVal, { color: colors.black }]}>{totalEmployees}</Text>
            <Text style={[styles.kpiLbl, { color: colors.gray500 }]}>{t('management.employeesCount')}</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: isDark ? colors.gray100 : '#FFFFFF', borderColor: colors.gray200 }]}>
            <View style={[styles.kpiIcon, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
            <Text style={[styles.kpiVal, { color: '#10B981' }]}>{activeCount}</Text>
            <Text style={[styles.kpiLbl, { color: colors.gray500 }]}>{t('management.activeCount')}</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: isDark ? colors.gray100 : '#FFFFFF', borderColor: colors.gray200 }]}>
            <View style={[styles.kpiIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Ionicons name="pause-circle" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.kpiVal, { color: '#EF4444' }]}>{suspendedCount}</Text>
            <Text style={[styles.kpiLbl, { color: colors.gray500 }]}>{t('management.suspendedCount')}</Text>
          </View>
        </View>

        {/* Employee List */}
        <View style={styles.listSection}>
          {isLoading && displayEmployees.length === 0 ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : displayEmployees.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.gray200 }]}>
              <Ionicons name="people-outline" size={48} color={colors.gray400} />
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>
                {t('management.noEmployeesFound')}
              </Text>
            </View>
          ) : (
            displayEmployees.map((emp) => {
              const isSuspended = emp.status === 'suspended';
              const isBusy = updatingId === emp.id;

              return (
                <View
                  key={emp.id}
                  style={[
                    styles.empCard,
                    {
                      backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                      borderColor: isSuspended ? '#EF4444' : colors.gray200,
                      borderLeftWidth: isSuspended ? 4 : 1,
                    },
                  ]}
                >
                  {/* Top: Name, Status & Bound Manager */}
                  <View style={[styles.empHeader, { flexDirection }]}>
                    <View style={styles.nameBlock}>
                      <Text style={[styles.empName, { color: colors.black }]}>
                        {emp.displayName}
                      </Text>
                      <Text style={[styles.empEmail, { color: colors.gray500 }]}>
                        {emp.email}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isSuspended
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(16, 185, 129, 0.15)',
                        },
                      ]}
                    >
                      <Ionicons
                        name={isSuspended ? 'pause' : 'checkmark'}
                        size={12}
                        color={isSuspended ? '#EF4444' : '#10B981'}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: isSuspended ? '#EF4444' : '#10B981' },
                        ]}
                      >
                        {isSuspended ? t('management.suspended') : t('management.active')}
                      </Text>
                    </View>
                  </View>

                  {/* Bound Manager Info */}
                  <View style={[styles.infoRow, { flexDirection }]}>
                    <Ionicons name="business-outline" size={14} color={colors.primary} />
                    <Text style={[styles.infoLabel, { color: colors.gray500 }]}>
                      {t('management.managerEmail')}:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.black }]}>
                      {emp.managerEmail || '—'}
                    </Text>
                  </View>

                  {/* Device Info */}
                  <View style={[styles.infoRow, { flexDirection }]}>
                    <Ionicons name="phone-portrait-outline" size={14} color="#6366F1" />
                    <Text style={[styles.infoLabel, { color: colors.gray500 }]}>
                      {t('management.device')}:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.black }]}>
                      {emp.deviceName || emp.deviceModel || '—'}
                    </Text>
                  </View>

                  {/* Login Time */}
                  <View style={[styles.infoRow, { flexDirection }]}>
                    <Ionicons name="time-outline" size={14} color="#F59E0B" />
                    <Text style={[styles.infoLabel, { color: colors.gray500 }]}>
                      {t('management.lastLogin')}:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.black }]}>
                      {formatDateTime(emp.lastLoginAt)}
                    </Text>
                  </View>

                  {/* Password Info */}
                  <View style={[styles.infoRow, { flexDirection }]}>
                    <Ionicons name="key-outline" size={14} color="#D97706" />
                    <Text style={[styles.infoLabel, { color: colors.gray500 }]}>
                      {isRTL ? 'تێپەڕەوشە (پاسۆرد):' : 'Password:'}
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.black, fontFamily: 'monospace', fontWeight: 'bold' }]}>
                      {emp.password || '••••••••'}
                    </Text>
                  </View>

                  {/* Card Actions */}
                  <View style={[styles.cardActions, { flexDirection }]}>
                    {/* Permissions Button */}
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.softBlue, borderColor: colors.primary + '33' }]}
                      onPress={() =>
                        router.push({
                          pathname: '/(app)/management/permissions/[id]',
                          params: { id: emp.id, email: emp.email, name: emp.displayName },
                        } as never)
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons name="options-outline" size={15} color={colors.primary} />
                      <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                        {t('management.editPermissions')}
                      </Text>
                    </TouchableOpacity>

                    {/* Suspend / Activate Toggle */}
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: isSuspended ? '#ECFDF5' : '#FEF2F2',
                          borderColor: isSuspended ? '#A7F3D0' : '#FECACA',
                        },
                      ]}
                      onPress={() => handleToggleStatus(emp)}
                      disabled={isBusy}
                      activeOpacity={0.7}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color={isSuspended ? '#10B981' : '#EF4444'} />
                      ) : (
                        <>
                          <Ionicons
                            name={isSuspended ? 'play' : 'pause'}
                            size={14}
                            color={isSuspended ? '#10B981' : '#EF4444'}
                          />
                          <Text
                            style={[
                              styles.actionBtnText,
                              { color: isSuspended ? '#10B981' : '#EF4444' },
                            ]}
                          >
                            {isSuspended
                              ? t('management.activateAccount')
                              : t('management.suspendAccount')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Delete Icon Button */}
                    <TouchableOpacity
                      style={[styles.deleteIconBtn, { borderColor: colors.gray200 }]}
                      onPress={() => handleDelete(emp)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  driveCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  driveCardHeader: {
    alignItems: 'center',
    gap: 12,
  },
  driveIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driveTextCol: {
    flex: 1,
  },
  driveTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  driveDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  driveActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driveActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  kpiRow: {
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  kpiLbl: {
    fontSize: 11,
    fontWeight: '600',
  },
  listSection: {
    gap: 14,
  },
  empCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  empHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameBlock: {
    flex: 1,
  },
  empName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  empEmail: {
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoRow: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
    gap: 8,
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
});

