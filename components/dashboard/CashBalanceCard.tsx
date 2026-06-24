import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { CompactAmount } from '@/components/shared/CompactAmount';
import type { NetCashBalanceData } from '@/types/reports';

interface Props {
  data: NetCashBalanceData;
  index?: number;
}

export function CashBalanceCard({ data, index = 0 }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { isRTL, textAlign } = useRTL();

  const isPositive = data.netBalance >= 0;
  const balanceColor = isPositive ? colors.success : colors.error;
  const bgColor = isPositive ? colors.success + '12' : colors.error + '12';
  const borderColor = isPositive ? colors.success + '30' : colors.error + '30';

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 18, delay: 80 + index * 60 }}
      style={[styles.card, { backgroundColor: colors.white, borderColor: colors.lightBlue }]}
    >
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.iconWrap, { backgroundColor: bgColor, borderColor }]}>
          <Ionicons
            name={isPositive ? 'wallet-outline' : 'warning-outline'}
            size={20}
            color={balanceColor}
          />
        </View>
        <Text style={[styles.label, { color: colors.gray500, textAlign }]}>
          {t('dashboard.netCashBalance')}
        </Text>
      </View>

      {/* Main balance */}
      <View style={[styles.balanceRow, { justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}>
        <CompactAmount
          value={Math.abs(data.netBalance)}
          showCurrency={false}
          style={[styles.balance, { color: balanceColor }]}
        />
        <Text style={[styles.currency, { color: balanceColor + 'AA' }]}> IQD</Text>
      </View>
      {!isPositive && (
        <Text style={[styles.negativeTag, { color: colors.error, textAlign }]}>
          {t('dashboard.negativeBalance')}
        </Text>
      )}

      {/* Breakdown rows */}
      <View style={[styles.divider, { backgroundColor: colors.lightBlue }]} />

      <View style={styles.breakdown}>
        <BreakdownRow
          icon="arrow-up-circle-outline"
          label={t('dashboard.cashReceived')}
          value={data.cashReceived}
          color={colors.success}
          colors={colors}
          isRTL={isRTL}
        />
        <BreakdownRow
          icon="arrow-down-circle-outline"
          label={t('dashboard.expensesDeducted')}
          value={data.expensesTotal}
          color={colors.error}
          colors={colors}
          negative
          isRTL={isRTL}
        />
      </View>

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: colors.gray50, borderColor: colors.lightBlue, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name="information-circle-outline" size={13} color={colors.gray400} />
        <Text style={[styles.disclaimerText, { color: colors.gray400, textAlign }]}>
          {t('dashboard.debtExcluded')}
        </Text>
      </View>
    </MotiView>
  );
}

interface BreakdownRowProps {
  icon: string;
  label: string;
  value: number;
  color: string;
  colors: AppColors;
  negative?: boolean;
  isRTL: boolean;
}

function BreakdownRow({ icon, label, value, color, colors, negative, isRTL }: BreakdownRowProps) {
  return (
    <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.rowLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name={icon as never} size={15} color={color} />
        <Text style={[styles.rowLabel, { color: colors.gray600, textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
      </View>
      <CompactAmount
        value={value}
        prefix={negative ? '− ' : '+ '}
        style={[styles.rowValue, { color: negative ? colors.gray700 : color, textAlign: isRTL ? 'left' : 'right' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  balance: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
  },
  negativeTag: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  breakdown: {
    gap: 10,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  disclaimerText: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
  },
});
