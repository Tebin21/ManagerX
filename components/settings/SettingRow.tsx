import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';

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
  const { textAlign } = useRTL();

  const iconBg    = destructive ? '#FEE2E2' : isDark ? colors.gray200 + '33' : colors.softBlue;
  const iconColor = destructive ? colors.error : colors.primary;
  const labelClr  = destructive ? colors.error : colors.black;

  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.disabled]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={disabled}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.label, { color: labelClr, textAlign }]}>{label}</Text>
        {sub ? (
          <Text style={[styles.sub, { color: colors.gray400, textAlign }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {rightElement ?? (
        chevron ? (
          <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
        ) : null
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 12,
  },
  disabled: { opacity: 0.4 },
  iconWrap: {
    width:             34,
    height:            34,
    borderRadius:      10,
    alignItems:        'center',
    justifyContent:    'center',
    marginRight:       12,
  },
  content: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600' },
  sub:   { fontSize: 12, marginTop: 1 },
});
