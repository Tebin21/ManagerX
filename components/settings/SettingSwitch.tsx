import React from 'react';
import { View, Switch, StyleSheet, Platform } from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';

import { hexToRgba } from '@/lib/colorUtils';

interface Props {
  icon:    ComponentProps<typeof Ionicons>['name'];
  label:   string;
  sub?:    string;
  value:   boolean;
  onToggle: (val: boolean) => void;
  disabled?: boolean;
  color?:   string;
}

const IS_IOS = Platform.OS === 'ios';

export function SettingSwitch({ icon, label, sub, value, onToggle, disabled, color }: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const { isTablet } = useResponsive();

  const baseColor = disabled ? colors.gray300 : (color || colors.primary);
  const iconBg = IS_IOS
    ? hexToRgba(baseColor, isDark ? 0.18 : 0.10)
    : hexToRgba(baseColor, isDark ? 0.18 : 0.10);

  const borderColor = IS_IOS
    ? hexToRgba(baseColor, isDark ? 0.32 : 0.20)
    : 'transparent';

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
          borderColor: borderColor,
          shadowColor: isDark ? baseColor : '#000000',
          shadowOpacity: isDark ? 0.24 : 0.06,
          marginEnd: isRTL ? (isTablet ? 16 : RTL_SPACING.gapXl) : (isTablet ? 16 : 12),
        },
      ]
    : [
        styles.iconWrap,
        {
          width: tabletIconSize,
          height: tabletIconSize,
          borderRadius: tabletIconRadius,
          backgroundColor: iconBg,
          marginEnd: isRTL ? (isTablet ? 16 : RTL_SPACING.gapXl) : (isTablet ? 16 : 12),
        },
      ];

  const rowPadding = isTablet ? 18 : (isRTL ? RTL_SPACING.rowPadV + 2 : 12);

  return (
    <View style={[styles.row, { paddingVertical: rowPadding }]}>
      <View style={iconWrapStyle}>
        <Ionicons name={icon} size={isTablet ? 22 : 18} color={colors.primary} />
      </View>
      <View style={[styles.content, { marginEnd: isRTL ? RTL_SPACING.gap : 8 }]}>
        <Text style={[styles.label, isTablet && styles.labelTablet, { color: colors.black, textAlign }]}>{label}</Text>
        {sub ? (
          <Text style={[styles.sub, isTablet && styles.subTablet, { color: colors.gray400, textAlign, marginTop: isRTL ? RTL_SPACING.title + 1 : 1 }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{
          false: IS_IOS ? (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)') : colors.gray200,
          true: colors.primary,
        }}
        thumbColor={IS_IOS ? '#FFFFFF' : (value ? colors.primary : colors.gray300)}
        ios_backgroundColor={isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
  },
  iconWrap: {
    width:          34,
    height:         34,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  glassIconWrap: {
    borderWidth:    1,
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 1.5 },
    shadowOpacity:  0.06,
    shadowRadius:   3,
  },
  content: { flex: 1 },
  label:   { fontSize: 15, fontWeight: '600' },
  labelTablet: { fontSize: 17 },
  sub:     { fontSize: 12 },
  subTablet: { fontSize: 14 },
});
