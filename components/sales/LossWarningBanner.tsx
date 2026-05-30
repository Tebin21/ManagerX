import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

export function LossWarningBanner() {
  return (
    <MotiView
      from={{ opacity: 0, translateY: -8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.banner}
    >
      <Ionicons name="warning" size={18} color="#92400e" style={styles.icon} />
      <View style={styles.textBlock}>
        <Text style={styles.title}>Selling below cost</Text>
        <Text style={styles.sub}>One or more items are priced below purchase price.</Text>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  icon: { marginTop: 1 },
  textBlock: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 2 },
  sub: { fontSize: 12, color: '#92400e', opacity: 0.85, lineHeight: 17 },
});
