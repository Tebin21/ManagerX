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


function getTodayStats(sales: ReturnType<typeof useSalesStore.getState>['sales']) {
  const today = new Date().toDateString();
  const todaySales = sales.filter((s) => new Date(s.createdAt).toDateString() === today);
  return {
    count:   todaySales.length,
    revenue: todaySales.reduce((sum, s) => sum + s.grandTotal, 0),
  };
}

export default function SalesScreen() {
  const router  = useRouter();
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const { chevronForward, arrowForward } = useDirectionalChevron();
  const { colors } = useAppTheme();
  const { sales, loadSales } = useSalesStore();

  useEffect(() => { loadSales(); }, []);

  const { count, revenue } = useMemo(() => getTodayStats(sales), [sales]);

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('sales.title')}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.body}>

        <MotiView
          from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }}
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
              style={[styles.newSaleBtnGradient, { flexDirection }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={[styles.newSaleBtnInner, { flexDirection }]}>
                <View style={styles.newSaleIconBox}>
                  <Ionicons name="add" size={28} color={colors.white} />
                </View>
                <View>
                  <Text style={[styles.newSaleTitle, { textAlign }]}>{t('sales.startNewSale')}</Text>
                  <Text style={[styles.newSaleSub, { textAlign }]}>{t('sales.startNewSaleSub')}</Text>
                </View>
              </View>
              <Ionicons name={arrowForward as never} size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 80 }}
          style={styles.statsRow}
        >
          <PremiumCard style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: colors.softBlue }]}>
              <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.black }]}>{count}</Text>
            <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('sales.todaySales')}</Text>
          </PremiumCard>

          <PremiumCard style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="trending-up" size={20} color={colors.success} />
            </View>
            <AmountText
              value={revenue}
              currency="IQD"
              style={[styles.statValue, { color: colors.success, lineHeight: 28 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            />
            <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('sales.todayRevenue')}</Text>
          </PremiumCard>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 160 }}
        >
          <TouchableOpacity
            onPress={() => router.push('/(app)/sales/check-price' as never)}
            activeOpacity={0.85}
            style={[styles.secondaryBtn, { backgroundColor: colors.white, flexDirection }]}
          >
            <View style={[styles.secondaryLeft, { flexDirection }]}>
              <View style={[styles.secondaryIcon, { backgroundColor: colors.softBlue }]}>
                <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.secondaryTitle, { color: colors.black, textAlign }]}>{t('sales.checkPrice')}</Text>
                <Text style={[styles.secondarySub, { color: colors.gray400, textAlign }]}>{t('sales.checkPriceSub')}</Text>
              </View>
            </View>
            <Ionicons name={chevronForward as never} size={18} color={colors.gray300} />
          </TouchableOpacity>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 240 }}
          style={styles.secondaryBtnSpacing}
        >
          <TouchableOpacity
            onPress={() => router.push('/(app)/sales/history' as never)}
            activeOpacity={0.85}
            style={[styles.secondaryBtn, { backgroundColor: colors.white, flexDirection }]}
          >
            <View style={[styles.secondaryLeft, { flexDirection }]}>
              <View style={[styles.secondaryIcon, { backgroundColor: colors.softBlue }]}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.secondaryTitle, { color: colors.black, textAlign }]}>{t('sales.viewHistory')}</Text>
                <Text style={[styles.secondarySub, { color: colors.gray400, textAlign }]}>{t('sales.viewHistorySub')}</Text>
              </View>
            </View>
            <Ionicons name={chevronForward as never} size={18} color={colors.gray300} />
          </TouchableOpacity>
        </MotiView>

      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  body:       { padding: 20, paddingBottom: 24 },
  mainAction: { marginBottom: 16 },
  newSaleBtn: { borderRadius: 20, overflow: 'hidden', ...Theme.shadow.button, shadowOpacity: 0.35 },
  newSaleBtnGradient:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  newSaleBtnInner:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  newSaleIconBox:      { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  newSaleTitle:        { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  newSaleSub:          { fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 15 },
  statsRow:    { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard:    { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue:   { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel:   { fontSize: 11, fontWeight: '500' },
  secondaryBtnSpacing: { marginTop: 12 },
  secondaryBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Theme.radius.card, padding: 16, ...Theme.shadow.soft },
  secondaryLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  secondaryIcon:  { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  secondaryTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  secondarySub:   { fontSize: 12 },
});
