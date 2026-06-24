import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { CompactAmount } from '@/components/shared/CompactAmount';

type Filter = 'today' | 'weekly' | 'monthly' | 'yearly';

interface Props {
  totals: { today: number; weekly: number; monthly: number; yearly: number };
  index?: number;
  showLink?: boolean;
}

export function ExpensesCard({ totals, index = 0, showLink = true }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('today');

  const filters: { key: Filter; label: string }[] = [
    { key: 'today',   label: t('dashboard.today') },
    { key: 'weekly',  label: t('dashboard.week') },
    { key: 'monthly', label: t('dashboard.month') },
    { key: 'yearly',  label: t('dashboard.year') },
  ];

  const amount = totals[filter];
  const hasExpenses = amount > 0;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 18, delay: 40 + index * 60 }}
      style={[styles.card, { backgroundColor: colors.white, borderColor: colors.lightBlue }]}
    >
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.error + '12', borderColor: colors.error + '30' }]}>
          <Ionicons name="receipt-outline" size={20} color={colors.error} />
        </View>
        <Text style={[styles.title, { color: colors.gray500, textAlign }]}>
          {t('dashboard.expensesCard')}
        </Text>
      </View>

      {/* Filter pills */}
      <View style={[styles.filterRow, { backgroundColor: colors.gray50, borderColor: colors.lightBlue, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.pill,
                active && { backgroundColor: colors.error, shadowColor: colors.error },
              ]}
            >
              <Text style={[styles.pillText, { color: active ? '#fff' : colors.gray500 }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Amount — numbers always LTR, row anchors to reading-direction start */}
      <View style={[styles.amountLine, { justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}>
        <CompactAmount
          value={amount}
          showCurrency={false}
          style={[styles.amount, { color: hasExpenses ? colors.error : colors.gray400 }]}
        />
        <Text style={[styles.currency, { color: hasExpenses ? colors.error + 'AA' : colors.gray300 }]}> IQD</Text>
      </View>

      {/* Link to full report — only shown outside the reports screen */}
      {showLink && (
        <TouchableOpacity
          onPress={() => router.push('/(app)/reports/expenses' as never)}
          style={[styles.linkRow, { borderTopColor: colors.lightBlue, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          hitSlop={8}
        >
          <Text style={[styles.linkText, { color: colors.primary }]}>
            {t('dashboard.viewFullReport')}
          </Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </MotiView>
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
    marginBottom: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  filterRow: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 2,
    marginBottom: 16,
  },
  pill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0,
    shadowRadius: 4,
    elevation: 0,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  amount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  currency: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 4,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
