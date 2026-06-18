import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { useReportStore } from '@/store/reportStore';
import { fmtIQD } from '@/utils/formatters';
import type { FinancialSummaryCards } from '@/types/reports';
import { ExpensesCard } from './ExpensesCard';
import { CashBalanceCard } from './CashBalanceCard';

interface MiniCardConfig {
  labelKey: string;
  value: number;
  icon: string;
  color: string;
}

export function FinancialOverviewSection() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { financialCards, cashBalance, dashboardExpenseTotals, isLoading } = useReportStore();

  const showSkeleton = isLoading && !financialCards;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 20, delay: 0 }}
        style={styles.sectionHeader}
      >
        <Text style={[styles.sectionTitle, { color: colors.darkBlue }]}>
          {t('dashboard.financialOverview')}
        </Text>
        <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
      </MotiView>

      {showSkeleton ? (
        <SkeletonCards colors={colors} />
      ) : (
        <>
          {/* 4 summary mini-cards in 2×2 grid */}
          {financialCards && (
            <View style={styles.grid}>
              {getMiniCards(financialCards, colors).map((card, i) => (
                <MiniCard key={card.labelKey} card={card} index={i} colors={colors} />
              ))}
            </View>
          )}

          {/* Expenses card */}
          {dashboardExpenseTotals && (
            <ExpensesCard totals={dashboardExpenseTotals} index={2} />
          )}

          {/* Net cash balance card */}
          {cashBalance && (
            <CashBalanceCard data={cashBalance} index={3} />
          )}
        </>
      )}
    </View>
  );
}

function getMiniCards(
  cards: FinancialSummaryCards,
  colors: AppColors,
): MiniCardConfig[] {
  return [
    { labelKey: 'dashboard.totalSales',   value: cards.totalSales,            icon: 'trending-up-outline',   color: colors.primary },
    { labelKey: 'dashboard.netProfit',    value: cards.netProfit,             icon: 'bar-chart-outline',     color: colors.success },
    { labelKey: 'dashboard.totalLoss',    value: cards.totalLoss,             icon: 'trending-down-outline', color: colors.error },
    { labelKey: 'dashboard.customerDebt', value: cards.remainingCustomerDebt, icon: 'people-outline',        color: colors.warning },
  ];
}

interface MiniCardProps {
  card: MiniCardConfig;
  index: number;
  colors: AppColors;
}

function MiniCard({ card, index, colors }: MiniCardProps) {
  const { t } = useTranslation();
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 18, delay: index * 50 }}
      style={[styles.miniCard, { backgroundColor: colors.white, borderColor: colors.lightBlue }]}
    >
      <View style={[styles.miniIcon, { backgroundColor: card.color + '15' }]}>
        <Ionicons name={card.icon as never} size={16} color={card.color} />
      </View>
      <Text style={[styles.miniValue, { color: colors.darkBlue }]} numberOfLines={1}>
        {fmtIQD(card.value)}
      </Text>
      <Text style={[styles.miniLabel, { color: colors.gray400 }]} numberOfLines={1}>
        {t(card.labelKey)}
      </Text>
    </MotiView>
  );
}

function SkeletonCards({ colors }: { colors: AppColors }) {
  return (
    <View>
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <MotiView
            key={i}
            from={{ opacity: 0.3 }}
            animate={{ opacity: 0.7 }}
            transition={{ type: 'timing', duration: 800, loop: true }}
            style={[styles.miniCard, styles.skeleton, { backgroundColor: colors.lightBlue }]}
          />
        ))}
      </View>
      <MotiView
        from={{ opacity: 0.3 }}
        animate={{ opacity: 0.7 }}
        transition={{ type: 'timing', duration: 800, loop: true, delay: 100 }}
        style={[styles.skeletonFull, { backgroundColor: colors.lightBlue }]}
      />
      <MotiView
        from={{ opacity: 0.3 }}
        animate={{ opacity: 0.7 }}
        transition={{ type: 'timing', duration: 800, loop: true, delay: 200 }}
        style={[styles.skeletonFull, { backgroundColor: colors.lightBlue }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  miniCard: {
    width: '47.5%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  miniIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  miniValue: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  miniLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  skeleton: {
    height: 90,
  },
  skeletonFull: {
    height: 100,
    borderRadius: 16,
    marginBottom: 12,
  },
});
