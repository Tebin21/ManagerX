import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { useResponsive } from '@/hooks/useResponsive';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useCapitalStore, type DrawerFullStats } from '@/store/capitalStore';

export function CapitalDrawerReportCard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const { isEnabled, loadDrawerStats, deposits } = useCapitalStore();
  const [stats, setStats] = useState<DrawerFullStats | null>(null);

  const fetchStats = useCallback(async () => {
    if (!isEnabled) return;
    try {
      const data = await loadDrawerStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load capital report stats:', e);
    }
  }, [isEnabled, loadDrawerStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, deposits]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  if (!isEnabled || !stats) {
    return null;
  }

  const isPositive = stats.currentBalance >= 0;
  const balanceColor = isPositive ? colors.success : colors.error;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300, delay: 20 }}
    >
      <PremiumCard style={[styles.card, { borderColor: colors.primary + '30', backgroundColor: colors.white }]}>
        {/* Header row */}
        <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.titleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="cash" size={isTablet ? 22 : 18} color={colors.primary} />
            </View>
            <View>
              <Text
                style={[
                  styles.title,
                  { color: colors.darkBlue, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('capital.reportCardTitle')}
              </Text>
              <Text style={[styles.subTitle, { color: colors.gray400, textAlign }]}>
                {t('capital.statusActive')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(app)/reports/expenses?tab=capital' as never)}
            style={[styles.manageBtn, { backgroundColor: colors.primary + '14', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            <Text
              style={[
                styles.manageBtnText,
                { color: colors.primary },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {t('capital.capitalTab')}
            </Text>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={14}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Big Balance Row */}
        <View style={[styles.balanceSection, { backgroundColor: isDark ? colors.gray100 : colors.gray50 }]}>
          <Text style={[styles.balanceLabel, { color: colors.gray500, textAlign }]}>
            {t('capital.currentBalance')}
          </Text>
          <View style={[styles.balanceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <AmountText
              value={Math.abs(stats.currentBalance)}
              style={[styles.balanceAmt, { color: balanceColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            />
          </View>
        </View>

        {/* Breakdown Grid */}
        <View style={[styles.grid, { gap: isTablet ? 14 : 8, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Initial / Net Capital */}
          <View style={[
            styles.gridItem,
            {
              backgroundColor: isDark ? colors.gray100 : colors.gray50,
              borderColor: colors.gray200,
              minWidth: isTablet ? '30%' : '47%',
              padding: isTablet ? 16 : 10,
              borderRadius: isTablet ? 14 : 12,
            }
          ]}>
            <Text style={[styles.gridLabel, { color: colors.gray400, textAlign, fontSize: isTablet ? 13 : 11 }]}>
              {t('capital.initialCapital')}
            </Text>
            <AmountText
              value={stats.netCapital}
              style={[styles.gridValue, { color: colors.darkBlue, textAlign, fontSize: isTablet ? 16 : 13.5 }]}
            />
          </View>

          {/* Cash Purchases */}
          <View style={[
            styles.gridItem,
            {
              backgroundColor: isDark ? colors.gray100 : colors.gray50,
              borderColor: colors.gray200,
              minWidth: isTablet ? '30%' : '47%',
              padding: isTablet ? 16 : 10,
              borderRadius: isTablet ? 14 : 12,
            }
          ]}>
            <Text style={[styles.gridLabel, { color: colors.gray400, textAlign, fontSize: isTablet ? 13 : 11 }]}>
              {t('capital.purchasesCash')}
            </Text>
            <AmountText
              value={stats.purchasesCash}
              style={[styles.gridValue, { color: colors.error, textAlign, fontSize: isTablet ? 16 : 13.5 }]}
            />
          </View>

          {/* Expenses */}
          <View style={[
            styles.gridItem,
            {
              backgroundColor: isDark ? colors.gray100 : colors.gray50,
              borderColor: colors.gray200,
              minWidth: isTablet ? '30%' : '47%',
              padding: isTablet ? 16 : 10,
              borderRadius: isTablet ? 14 : 12,
            }
          ]}>
            <Text style={[styles.gridLabel, { color: colors.gray400, textAlign, fontSize: isTablet ? 13 : 11 }]}>
              {t('capital.expensesCash')}
            </Text>
            <AmountText
              value={stats.expensesCash}
              style={[styles.gridValue, { color: colors.warning, textAlign, fontSize: isTablet ? 16 : 13.5 }]}
            />
          </View>
        </View>
      </PremiumCard>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 18,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleGroup: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  manageBtn: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  manageBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  balanceSection: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  balanceRow: {
    alignItems: 'baseline',
  },
  balanceAmt: {
    fontSize: 26,
    fontWeight: '800',
  },
  balanceCurr: {
    fontSize: 14,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    flex: 1,
    minWidth: '47%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  gridLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  disclaimer: {
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  disclaimerText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
});
