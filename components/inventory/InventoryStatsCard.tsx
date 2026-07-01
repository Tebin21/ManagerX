import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import { AmountText } from '@/components/ui/AmountText';

interface Props {
  label: string;
  /** Plain display value (counts, etc). Ignored when `amount` is set. */
  value?: string;
  /** Raw IQD amount — always renders the full value, shrinking font to fit. */
  amount?: number;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: boolean;
  delay?: number;
}

export function InventoryStatsCard({ label, value, amount, icon, accent = false, delay = 0 }: Props) {
  const { colors } = useAppTheme();
  const { isRTL, textAlign, valueAlign, flexDirection } = useRTL();
  const valueStyle = [styles.value, accent && styles.accentValue, { flex: 1, textAlign: valueAlign }];
  return (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 220, delay }}
      style={[
        styles.card,
        accent && styles.accentCard,
        { paddingVertical: isRTL ? 12 : 10, paddingHorizontal: isRTL ? RTL_SPACING.gap : 12 },
      ]}
    >
      <View style={[styles.topRow, { flexDirection }]}>
        <View style={[styles.iconWrap, { backgroundColor: accent ? '#FEF3C7' : colors.softBlue }]}>
          <Ionicons name={icon} size={14} color={accent ? '#B45309' : colors.primary} />
        </View>
        {amount !== undefined ? (
          <AmountText value={amount} style={valueStyle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} />
        ) : (
          <Text style={valueStyle} numberOfLines={1}>{value}</Text>
        )}
      </View>
      <Text style={[styles.label, { textAlign }]}>{label}</Text>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'column',
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.black,
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
