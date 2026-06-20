import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING } from '@/lib/rtl';

interface Props {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: boolean;
  delay?: number;
}

export function InventoryStatsCard({ label, value, icon, accent = false, delay = 0 }: Props) {
  const { colors } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  return (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 220, delay }}
      style={[
        styles.card,
        accent && styles.accentCard,
        { flexDirection, paddingVertical: isRTL ? 12 : 10, paddingHorizontal: isRTL ? RTL_SPACING.gap : 12 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accent ? '#FEF3C7' : colors.softBlue, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? RTL_SPACING.gap : 0 }]}>
        <Ionicons name={icon} size={14} color={accent ? '#B45309' : colors.primary} />
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.value, accent && styles.accentValue, { textAlign, marginBottom: isRTL ? RTL_SPACING.title : 1 }]} numberOfLines={1}>{value}</Text>
        <Text style={[styles.label, { textAlign }]} numberOfLines={1}>{label}</Text>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...Theme.shadow.soft,
  },
  accentCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 1,
  },
  accentValue: {
    color: '#B45309',
  },
  label: {
    fontSize: 10,
    color: Colors.gray500,
    fontWeight: '500',
  },
});
