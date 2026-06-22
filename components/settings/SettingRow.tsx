import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING, useDirectionalChevron } from '@/lib/rtl';

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

  const iconBg    = destructive ? '#FEE2E2' : isDark ? colors.gray200 + '33' : colors.softBlue;
  const iconColor = destructive ? colors.error : colors.primary;
  const labelClr  = destructive ? colors.error : colors.black;

  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.disabled, { flexDirection, paddingVertical: isRTL ? RTL_SPACING.rowPadV + 2 : 12 }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={disabled}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg, marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? RTL_SPACING.gapXl : 0 }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.label, { color: labelClr, textAlign }]}>{label}</Text>
        {sub ? (
          <Text style={[styles.sub, { color: colors.gray400, textAlign, marginTop: isRTL ? RTL_SPACING.title + 1 : 1 }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {rightElement ?? (
        chevron ? (
          <Ionicons name={chevronForward as never} size={16} color={colors.gray300} />
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
  content: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600' },
  sub:   { fontSize: 12 },
});
