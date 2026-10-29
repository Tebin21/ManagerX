import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/AppText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
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
  const { colors, isDark } = useAppTheme();
  const { isRTL, flexDirection } = useRTL();
  const { isTablet } = useResponsive();

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
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={isTablet ? 24 : 20} color="#FFFFFF" />
        </View>

        {/* Center Details */}
        <View style={styles.content}>
          <View style={[styles.titleRow, { flexDirection }]}>
            <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1E1B4B' }]}>
              {isRTL ? 'بەڕێوەبردن (دەسەڵاتی کارمەند)' : 'Management (Employee Control)'}
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
                ]}
              >
                {!hasEmployees
                  ? (isRTL ? 'بەڕێوەبەر' : 'Manager')
                  : isSuspended
                  ? (isRTL ? 'ڕاگیراو' : 'Suspended')
                  : (isRTL ? 'چالاک' : 'Active')}
              </Text>
            </View>
          </View>

          {/* Subtitle with Employee Name and Drive sync tag */}
          <View style={[styles.subRow, { flexDirection }]}>
            <Text style={[styles.subtitle, { color: isDark ? '#A5B4FC' : '#4338CA' }]} numberOfLines={1}>
              {!hasEmployees
                ? (isRTL ? 'دەستنیشانکردنی کارمەند و دەسەڵاتەکان' : 'Manage staff & permissions')
                : count === 1
                ? `${isRTL ? 'کارمەند:' : 'Staff:'} ${firstEmp?.displayName}`
                : `${isRTL ? 'کارمەندان:' : 'Staff:'} ${firstEmp?.displayName} (+${count - 1})`}
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
                  size={11}
                  color={isDriveConnected ? '#10B981' : '#F59E0B'}
                />
                <Text
                  style={[
                    styles.driveText,
                    { color: isDriveConnected ? '#10B981' : '#F59E0B' },
                  ]}
                >
                  {isDriveConnected
                    ? (isRTL ? 'درایڤ بەستراوە' : 'Drive Synced')
                    : (isRTL ? 'درایڤ ببەستەوە' : 'Connect Drive')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Trailing Arrow */}
        <View style={styles.arrowWrapper}>
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={20}
            color={isDark ? '#818CF8' : '#6366F1'}
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
    marginBottom: 10,
    marginTop: 4,
  },
  button: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  content: {
    flex: 1,
    marginHorizontal: 10,
  },
  titleRow: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  drivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  driveText: {
    fontSize: 9,
    fontWeight: '700',
  },
  arrowWrapper: {
    paddingHorizontal: 2,
  },
});

