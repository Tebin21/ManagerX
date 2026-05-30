import React from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';

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
  const { textAlign } = useRTL();

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: colors.softBlue }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.black, textAlign }]}>{label}</Text>
        {sub ? (
          <Text style={[styles.sub, { color: colors.gray400, textAlign }]} numberOfLines={1}>
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
    paddingVertical: 12,
  },
  iconWrap: {
    width:          34,
    height:         34,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
    marginRight:    12,
  },
  content: { flex: 1, marginRight: 8 },
  label:   { fontSize: 15, fontWeight: '600' },
  sub:     { fontSize: 12, marginTop: 1 },
});
