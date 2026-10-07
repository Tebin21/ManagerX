import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING, useDirectionalChevron } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';

interface Props {
  icon:          ComponentProps<typeof Ionicons>['name'];
  label:         string;
  sub?:          string;
  onPress?:      () => void;
  chevron?:      boolean;
  destructive?:  boolean;
  rightElement?: React.ReactNode;
  disabled?:     boolean;
}

const IS_IOS = Platform.OS === 'ios';

export function SettingRow({
  icon,
  label,
  sub,
  onPress,
  chevron = true,
  destructive = false,
  rightElement,
  disabled = false,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const { isTablet } = useResponsive();

  const iconBg = IS_IOS
    ? (destructive
        ? (isDark ? 'rgba(239, 68, 68, 0.22)' : 'rgba(239, 68, 68, 0.12)')
        : (isDark ? 'rgba(212, 175, 55, 0.20)' : 'rgba(212, 175, 55, 0.14)'))
    : (destructive ? '#FEE2E2' : isDark ? colors.gray200 + '33' : colors.softBlue);

  const iconColor = destructive ? colors.error : colors.primary;
  const labelClr  = destructive ? colors.error : colors.black;

  const tabletIconSize = isTablet ? 44 : 34;
  const tabletIconRadius = isTablet ? 13 : 10;

  const iconWrapStyle = IS_IOS
    ? [
        styles.iconWrap,
        styles.glassIconWrap,
        {
          width: tabletIconSize,
          height: tabletIconSize,
          borderRadius: tabletIconRadius,
          backgroundColor: iconBg,
          borderColor: isDark
            ? (destructive ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.14)')
            : (destructive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.85)'),
          marginRight: isRTL ? 0 : (isTablet ? 16 : 12),
          marginLeft: isRTL ? (isTablet ? 16 : RTL_SPACING.gapXl) : 0,
        },
      ]
    : [
        styles.iconWrap,
        {
          width: tabletIconSize,
          height: tabletIconSize,
          borderRadius: tabletIconRadius,
          backgroundColor: iconBg,
          marginRight: isRTL ? 0 : (isTablet ? 16 : 12),
          marginLeft: isRTL ? (isTablet ? 16 : RTL_SPACING.gapXl) : 0,
        },
      ];

  const rowPadding = isTablet ? 18 : (isRTL ? RTL_SPACING.rowPadV + 2 : 12);

  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.disabled, { flexDirection, paddingVertical: rowPadding }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={disabled}
    >
      <View style={iconWrapStyle}>
        <Ionicons name={icon} size={isTablet ? 22 : 18} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.label, isTablet && styles.labelTablet, { color: labelClr, textAlign }]}>{label}</Text>
        {sub ? (
          <Text style={[styles.sub, isTablet && styles.subTablet, { color: colors.gray400, textAlign, marginTop: isRTL ? RTL_SPACING.title + 1 : 1 }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {rightElement ?? (
        chevron ? (
          <Ionicons name={chevronForward as never} size={isTablet ? 20 : 16} color={colors.gray300} />
        ) : null
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
  },
  disabled: { opacity: 0.4 },
  iconWrap: {
    width:             34,
    height:            34,
    borderRadius:      10,
    alignItems:        'center',
    justifyContent:    'center',
  },
  glassIconWrap: {
    borderWidth:       1,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 1.5 },
    shadowOpacity:     0.06,
    shadowRadius:      3,
  },
  content: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600' },
  labelTablet: { fontSize: 17 },
  sub:   { fontSize: 12 },
  subTablet: { fontSize: 14 },
});
