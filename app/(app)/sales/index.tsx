import React, { useEffect, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/common/AppHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { useSalesStore } from '@/store/salesStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, useDirectionalChevron } from '@/lib/rtl';
import { Theme } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { hexToRgba } from '@/lib/colorUtils';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

function getTodayStats(sales: ReturnType<typeof useSalesStore.getState>['sales']) {
  const today = new Date().toDateString();
  const todaySales = sales.filter((s) => new Date(s.createdAt).toDateString() === today);
  return {
    count:   todaySales.length,
    revenue: todaySales.reduce((sum, s) => sum + s.grandTotal, 0),
  };
}

export default function SalesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { chevronForward, arrowForward } = useDirectionalChevron();
  const { colors, isDark } = useAppTheme();
  const { sales, loadSales } = useSalesStore();
  const { isTablet, isTabletLandscape, contentContainerStyle } = useResponsive();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  useEffect(() => {
    loadSales();
  }, []);

  const { count, revenue } = useMemo(() => getTodayStats(sales), [sales]);

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('sales.title')}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.body,
          isTablet && contentContainerStyle,
          isTablet && { padding: isTabletLandscape ? 32 : 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentWrap, isTablet && { gap: isTabletLandscape ? 22 : 18 }]}>
          {/* 1. Main Giant CTA Button: Start New Sale (تەواوی ڕیزەکەی داگیر کردووە) */}
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            style={styles.mainAction}
          >
            <TouchableOpacity
              onPress={() => router.push('/(app)/sales/new-sale' as never)}
              activeOpacity={0.9}
              style={[styles.newSaleBtn, { shadowColor: colors.primary }]}
            >
              <LinearGradient
                colors={[colors.primaryDark, colors.primary]}
                style={[
                  styles.newSaleBtnGradient,
                  isTablet && {
                    paddingVertical: isTabletLandscape ? 36 : 30,
                    paddingHorizontal: isTabletLandscape ? 36 : 28,
                    borderRadius: 24,
                  },
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View
                  style={[
                    styles.newSaleBtnInner,
                    isTablet && { gap: 20 },
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View
                    style={[
                      styles.newSaleIconBox,
                      isTablet && {
                        width: isTabletLandscape ? 78 : 66,
                        height: isTabletLandscape ? 78 : 66,
                        borderRadius: 22,
                      },
                    ]}
                  >
                    <Ionicons
                      name="add"
                      size={isTabletLandscape ? 44 : isTablet ? 36 : 28}
                      color={colors.white}
                    />
                  </View>
                  <View style={{ flexShrink: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text
                      style={[
                        styles.newSaleTitle,
                        isTablet && {
                          fontSize: isTabletLandscape ? 26 : 23,
                          marginBottom: 6,
                        },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        { textAlign: isRTL ? 'right' : 'left' },
                      ]}
                    >
                      {t('sales.startNewSale')}
                    </Text>
                    <Text
                      style={[
                        styles.newSaleSub,
                        isTablet && {
                          fontSize: isTabletLandscape ? 16 : 14.5,
                          lineHeight: 22,
                        },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                        { textAlign: isRTL ? 'right' : 'left' },
                      ]}
                    >
                      {t('sales.startNewSaleSub')}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={arrowForward as never}
                  size={isTabletLandscape ? 32 : isTablet ? 28 : 20}
                  color="rgba(255,255,255,0.85)"
                />
              </LinearGradient>
            </TouchableOpacity>
          </MotiView>

          {/* 2. Right below it: Today's Revenue and Sales Stats (دوو بەتنی داهات و فرۆشتنەکانی ئەمڕۆ) */}
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 80 }}
            style={[
              styles.statsRow,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
              isTablet && { gap: isTabletLandscape ? 20 : 16 },
            ]}
          >
            {/* Today's Sales Count */}
            <PremiumCard
              style={[
                styles.statCard,
                isTablet && {
                  paddingVertical: isTabletLandscape ? 32 : 26,
                  borderRadius: 22,
                },
              ]}
            >
              <View
                style={[
                  styles.statIconBox,
                  isTablet && {
                    width: isTabletLandscape ? 60 : 54,
                    height: isTabletLandscape ? 60 : 54,
                    borderRadius: 18,
                    marginBottom: 12,
                  },
                  { backgroundColor: colors.softBlue },
                ]}
              >
                <Ionicons
                  name="receipt-outline"
                  size={isTabletLandscape ? 30 : isTablet ? 26 : 20}
                  color={colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.statValue,
                  isTablet && { fontSize: isTabletLandscape ? 34 : 30 },
                  { color: colors.black },
                ]}
              >
                {count}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  isTablet && { fontSize: isTabletLandscape ? 16 : 14.5 },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                  { color: colors.gray400 },
                ]}
              >
                {t('sales.todaySales')}
              </Text>
            </PremiumCard>

            {/* Today's Revenue */}
            <PremiumCard
              style={[
                styles.statCard,
                isTablet && {
                  paddingVertical: isTabletLandscape ? 32 : 26,
                  borderRadius: 22,
                },
              ]}
            >
              <View
                style={[
                  styles.statIconBox,
                  isTablet && {
                    width: isTabletLandscape ? 60 : 54,
                    height: isTabletLandscape ? 60 : 54,
                    borderRadius: 18,
                    marginBottom: 12,
                  },
                  { backgroundColor: isDark ? hexToRgba(colors.success, 0.15) : '#F0FDF4' },
                ]}
              >
                <Ionicons
                  name="trending-up"
                  size={isTabletLandscape ? 30 : isTablet ? 26 : 20}
                  color={colors.success}
                />
              </View>
              <AmountText
                value={revenue}
                currency="IQD"
                style={[
                  styles.statValue,
                  isTablet && {
                    fontSize: isTabletLandscape ? 34 : 30,
                    lineHeight: isTabletLandscape ? 40 : 36,
                  },
                  { color: colors.success },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              />
              <Text
                style={[
                  styles.statLabel,
                  isTablet && { fontSize: isTabletLandscape ? 16 : 14.5 },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                  { color: colors.gray400 },
                ]}
              >
                {t('sales.todayRevenue')}
              </Text>
            </PremiumCard>
          </MotiView>

          {/* 3. Next: Check Price Button (پشکنینی نرخ) */}
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 160 }}
          >
            <TouchableOpacity
              onPress={() => router.push('/(app)/sales/check-price' as never)}
              activeOpacity={0.85}
              style={[
                styles.secondaryBtn,
                isTablet && {
                  padding: isTabletLandscape ? 28 : 24,
                  borderRadius: 22,
                },
                { backgroundColor: colors.white, flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View
                style={[
                  styles.secondaryLeft,
                  isTablet && { gap: 18 },
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <View
                  style={[
                    styles.secondaryIcon,
                    isTablet && {
                      width: isTabletLandscape ? 64 : 56,
                      height: isTabletLandscape ? 64 : 56,
                      borderRadius: 18,
                    },
                    { backgroundColor: colors.softBlue },
                  ]}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={isTabletLandscape ? 30 : isTablet ? 26 : 20}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flexShrink: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text
                    style={[
                      styles.secondaryTitle,
                      isTablet && {
                        fontSize: isTabletLandscape ? 21 : 19,
                        marginBottom: 4,
                      },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      { color: colors.black, textAlign: isRTL ? 'right' : 'left' },
                    ]}
                  >
                    {t('sales.checkPrice')}
                  </Text>
                  <Text
                    style={[
                      styles.secondarySub,
                      isTablet && { fontSize: isTabletLandscape ? 15.5 : 14 },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                      { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' },
                    ]}
                  >
                    {t('sales.checkPriceSub')}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={chevronForward as never}
                size={isTabletLandscape ? 26 : isTablet ? 24 : 18}
                color={colors.gray300}
              />
            </TouchableOpacity>
          </MotiView>

          {/* 4. Lower down: View Sales History (مێژووی فرۆشتن ببینە) */}
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 240 }}
          >
            <TouchableOpacity
              onPress={() => router.push('/(app)/sales/history' as never)}
              activeOpacity={0.85}
              style={[
                styles.secondaryBtn,
                isTablet && {
                  padding: isTabletLandscape ? 28 : 24,
                  borderRadius: 22,
                },
                { backgroundColor: colors.white, flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View
                style={[
                  styles.secondaryLeft,
                  isTablet && { gap: 18 },
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <View
                  style={[
                    styles.secondaryIcon,
                    isTablet && {
                      width: isTabletLandscape ? 64 : 56,
                      height: isTabletLandscape ? 64 : 56,
                      borderRadius: 18,
                    },
                    { backgroundColor: isDark ? hexToRgba(colors.primary, 0.15) : '#FEF3C7' },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={isTabletLandscape ? 30 : isTablet ? 26 : 20}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flexShrink: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text
                    style={[
                      styles.secondaryTitle,
                      isTablet && {
                        fontSize: isTabletLandscape ? 21 : 19,
                        marginBottom: 4,
                      },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      { color: colors.black, textAlign: isRTL ? 'right' : 'left' },
                    ]}
                  >
                    {t('sales.viewHistory')}
                  </Text>
                  <Text
                    style={[
                      styles.secondarySub,
                      isTablet && { fontSize: isTabletLandscape ? 15.5 : 14 },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                      { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' },
                    ]}
                  >
                    {t('sales.viewHistorySub')}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={chevronForward as never}
                size={isTabletLandscape ? 26 : isTablet ? 24 : 18}
                color={colors.gray300}
              />
            </TouchableOpacity>
          </MotiView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 40 },
  contentWrap: { gap: 14, width: '100%' },

  mainAction: { width: '100%' },
  newSaleBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Theme.shadow.button,
    shadowOpacity: 0.35,
  },
  newSaleBtnGradient: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  newSaleBtnInner: {
    alignItems: 'center',
    gap: 14,
    flexShrink: 1,
  },
  newSaleIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSaleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  newSaleSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
  },

  statsRow: {
    gap: 12,
    width: '100%',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
  },
  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Theme.radius.card,
    padding: 16,
    ...Theme.shadow.soft,
    width: '100%',
  },
  secondaryLeft: {
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  secondaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  secondarySub: {
    fontSize: 12,
  },
});
