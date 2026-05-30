import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

interface Props {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: boolean;
  delay?: number;
}

export function InventoryStatsCard({ label, value, icon, accent = false, delay = 0 }: Props) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 220, delay }}
      style={[styles.card, accent && styles.accentCard]}
    >
      <View style={[styles.iconWrap, accent && styles.accentIcon]}>
        <Ionicons name={icon} size={18} color={accent ? '#B45309' : Colors.primary} />
      </View>
      <Text style={[styles.value, accent && styles.accentValue]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Theme.radius.card,
    padding: 14,
    alignItems: 'flex-start',
    ...Theme.shadow.soft,
  },
  accentCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  accentIcon: {
    backgroundColor: '#FEF3C7',
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.black,
    marginBottom: 2,
  },
  accentValue: {
    color: '#B45309',
  },
  label: {
    fontSize: 12,
    color: Colors.gray500,
    fontWeight: '500',
  },
});
