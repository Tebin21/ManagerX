import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Colors } from '@/constants/colors';
import type { CustomerInput } from '@/types/sales';

interface Props {
  value: CustomerInput;
  onChange: (patch: Partial<CustomerInput>) => void;
  customerFound?: boolean;
}

export function CustomerInputForm({ value, onChange, customerFound }: Props) {
  return (
    <View>
      <AppTextInput
        label="Customer Name"
        placeholder="Optional"
        value={value.name}
        onChangeText={(t) => onChange({ name: t })}
        returnKeyType="next"
      />
      <AppTextInput
        label="Phone Number"
        placeholder="Optional"
        value={value.phone}
        onChangeText={(t) => onChange({ phone: t })}
        keyboardType="phone-pad"
        returnKeyType="next"
      />
      {customerFound === true && (
        <MotiView
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 200 }}
          style={styles.foundBadge}
        >
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={styles.foundText}>Returning customer — info filled in</Text>
        </MotiView>
      )}
      <AppTextInput
        label="Address"
        placeholder="Optional"
        value={value.address}
        onChangeText={(t) => onChange({ address: t })}
        returnKeyType="next"
      />
      <AppTextInput
        label="Warranty"
        placeholder="e.g. 1 year, 6 months"
        value={value.warranty}
        onChangeText={(t) => onChange({ warranty: t })}
        returnKeyType="next"
      />
      <AppTextInput
        label="Notes"
        placeholder="Optional notes about the sale"
        value={value.notes}
        onChangeText={(t) => onChange({ notes: t })}
        multiline
        numberOfLines={3}
        style={{ height: 72, textAlignVertical: 'top', paddingTop: 10 }}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  foundBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0FDF4', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: 14, marginTop: -8,
  },
  foundText: { fontSize: 12, color: Colors.success, fontWeight: '600' },
});
