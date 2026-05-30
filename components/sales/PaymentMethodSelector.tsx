import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import type { PaymentMethod } from '@/types/sales';

interface Option {
  method: PaymentMethod;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: Option[] = [
  { method: 'cash', label: 'Cash',  icon: 'cash-outline' },
  { method: 'fib',  label: 'FIB',   icon: 'phone-portrait-outline' },
  { method: 'debt', label: 'Debt',  icon: 'time-outline' },
];

interface Props {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({ selected, onChange }: Props) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const active = selected === opt.method;
        return (
          <TouchableOpacity
            key={opt.method}
            onPress={() => onChange(opt.method)}
            activeOpacity={0.8}
            style={[styles.option, active && styles.optionActive]}
          >
            <Ionicons
              name={opt.icon}
              size={20}
              color={active ? Colors.primary : Colors.gray400}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray200,
    backgroundColor: Colors.gray50,
  },
  optionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.softBlue,
  },
  label: { fontSize: 13, fontWeight: '600', color: Colors.gray500 },
  labelActive: { color: Colors.primary },
});
