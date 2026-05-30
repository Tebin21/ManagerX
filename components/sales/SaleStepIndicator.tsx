import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Colors } from '@/constants/colors';

interface Props {
  step: 1 | 2 | 3;
}

export function SaleStepIndicator({ step }: Props) {
  return (
    <View style={styles.row}>
      {([1, 2, 3] as const).map((s) => (
        <MotiView
          key={s}
          animate={{
            scale: step === s ? 1.2 : 1,
            opacity: step >= s ? 1 : 0.4,
          }}
          transition={{ type: 'spring', damping: 18, stiffness: 280 }}
          style={[styles.dot, step === s && styles.activeDot]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
    width: 24,
    borderRadius: 4,
  },
});
