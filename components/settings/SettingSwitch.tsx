import React from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING } from '@/lib/rtl';

interface Props {
  icon:    ComponentProps<typeof Ionicons>['name'];
  label:   string;
  sub?:    string;
  value:   boolean;
  onToggle: (val: boolean) => void;
  disabled?: boolean;
}

export function SettingSwitch({ icon, label, sub, value, onToggle, disabled }: Props) {
  const { colors } = useAppTheme();
  const { isRTL, textAlign } = useRTL();

  return (
    <View style={[styles.row, { paddingVertical: isRTL ? RTL_SPACING.rowPadV + 2 : 12 }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.softBlue, marginEnd: isRTL ? RTL_SPACING.gapXl : 12 }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={[styles.content, { marginEnd: isRTL ? RTL_SPACING.gap : 8 }]}>
        <Text style={[styles.label, { color: colors.black, textAlign }]}>{label}</Text>
        {sub ? (
          <Text style={[styles.sub, { color: colors.gray400, textAlign, marginTop: isRTL ? RTL_SPACING.title + 1 : 1 }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: colors.gray200, true: colors.primary + '55' }}
        thumbColor={value ? colors.primary : colors.gray300}
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
  content: { flex: 1 },
  label:   { fontSize: 15, fontWeight: '600' },
  sub:     { fontSize: 12 },
});
