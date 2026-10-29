import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/AppText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useManagementStore } from '@/store/managementStore';
import type { EmployeeAccount } from '@/lib/management/types';

interface ManagerBannerButtonProps {
  employees: EmployeeAccount[];
  isDriveConnected?: boolean;
}

export function ManagerBannerButton({
  employees,
  isDriveConnected = false,
}: ManagerBannerButtonProps) {
  const router = useRouter();
  const isEmployee = useManagementStore((s) => s.isEmployee);

  // Hard safety guard: Employees must NEVER see management controls
  if (isEmployee) {
    return null;
  }

  const { colors, isDark } = useAppTheme();
  const { isRTL, flexDirection } = useRTL();
  const { isTablet } = useResponsive();
  const currentLang = useLanguageStore((s) => s.language);
  const isKu = currentLang === 'ku';
  const isAr = currentLang === 'ar';

  const count = employees?.length || 0;
  const hasEmployees = count > 0;
  const firstEmp = hasEmployees ? employees[0] : null;
  const isSuspended = firstEmp ? firstEmp.status === 'suspended' : false;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/(app)/management' as never);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={[
          styles.button,
          {
            backgroundColor: isDark ? '#1C1B33' : '#F6F3FF',
            borderColor: isDark ? '#6366F1' : '#818CF8',
            flexDirection,
          },
        ]}
      >
        {/* Leading Icon in Glowing Circle */}
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: isDark ? '#4F46E5' : '#6366F1',
              width: isTablet ? 52 : 46,
              height: isTablet ? 52 : 46,
              borderRadius: isTablet ? 18 : 15,
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={isTablet ? 26 : 22} color="#FFFFFF" />
        </View>

        {/* Center Details */}
        <View style={styles.content}>
          <View style={[styles.titleRow, { flexDirection, justifyContent: 'space-between' }]}>
            <Text
              style={[
                styles.title,
                {
                  color: isDark ? '#FFFFFF' : '#1E1B4B',
                  fontSize: isTablet ? 17 : 15,
                },
                (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
              numberOfLines={1}
            >
              {isAr ? 'إدارة الموظفين والصلاحيات' : isKu ? 'بەڕێوەبردنی کارمەندان' : 'Employee Management'}
            </Text>

            {/* Status Badge */}
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: !hasEmployees
                    ? (isDark ? '#6366F122' : '#818CF822')
                    : isSuspended
                    ? '#EF444422'
                    : '#10B98122',
                  borderColor: !hasEmployees
                    ? (isDark ? '#6366F166' : '#818CF866')
                    : isSuspended
                    ? '#EF444466'
                    : '#10B98166',
                },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: !hasEmployees
                      ? (isDark ? '#818CF8' : '#6366F1')
                      : isSuspended
                      ? '#EF4444'
                      : '#10B981',
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color: !hasEmployees
                      ? (isDark ? '#A5B4FC' : '#4F46E5')
                      : isSuspended
                      ? '#EF4444'
                      : '#10B981',
                  },
                  (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {!hasEmployees
                  ? (isAr ? 'مدير' : isKu ? 'بەڕێوەبەر' : 'Manager')
                  : isSuspended
                  ? (isAr ? 'معلق' : isKu ? 'ڕاگیراو' : 'Suspended')
                  : (isAr ? 'نشط' : isKu ? 'چالاک' : 'Active')}
              </Text>
            </View>
          </View>

          {/* Subtitle with Employee Name and Drive sync tag */}
          <View style={[styles.subRow, { flexDirection }]}>
            <Text
              style={[
                styles.subtitle,
                {
                  color: isDark ? '#A5B4FC' : '#4338CA',
                  fontSize: isTablet ? 14 : 12.5,
                },
              ]}
              numberOfLines={1}
            >
              {!hasEmployees
                ? (isAr ? 'تحديد الموظفين وتعيين الصلاحيات' : isKu ? 'دەستنیشانکردنی کارمەند و دەسەڵاتەکان' : 'Manage staff & permissions')
                : count === 1
                ? `${isAr ? 'الموظف:' : isKu ? 'کارمەند:' : 'Staff:'} ${firstEmp?.displayName}`
                : `${isAr ? 'الموظفين:' : isKu ? 'کارمەندان:' : 'Staff:'} ${firstEmp?.displayName} (+${count - 1})`}
            </Text>

            {hasEmployees && (
              <View
                style={[
                  styles.drivePill,
                  {
                    backgroundColor: isDriveConnected ? '#10B98115' : '#F59E0B15',
                    borderColor: isDriveConnected ? '#10B98133' : '#F59E0B33',
                  },
                ]}
              >
                <Ionicons
                  name={isDriveConnected ? 'cloud-done' : 'cloud-offline'}
                  size={12}
                  color={isDriveConnected ? '#10B981' : '#F59E0B'}
                />
                <Text
                  style={[
                    styles.driveText,
                    { color: isDriveConnected ? '#10B981' : '#F59E0B' },
                    (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isDriveConnected
                    ? (isAr ? 'متصل بـ Drive' : isKu ? 'درایڤ بەستراوە' : 'Drive Synced')
                    : (isAr ? 'ربط Drive' : isKu ? 'درایڤ ببەستەوە' : 'Connect Drive')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Trailing Arrow in Circular Pill */}
        <View
          style={[
            styles.arrowCircle,
            {
              backgroundColor: isDark ? '#312E8166' : '#EEF2FF',
              borderColor: isDark ? '#4338CA88' : '#E0E7FF',
            },
          ]}
        >
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={16}
            color={isDark ? '#A5B4FC' : '#4F46E5'}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
  },
  button: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 74,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  titleRow: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  subRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  subtitle: {
    fontWeight: '600',
    flexShrink: 1,
  },
  drivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    borderWidth: 1,
    flexShrink: 0,
  },
  driveText: {
    fontSize: 10,
    fontWeight: '700',
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

