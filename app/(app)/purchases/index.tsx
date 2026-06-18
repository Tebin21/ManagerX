import React, { useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { useTranslation } from 'react-i18next';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, useDirectionalChevron } from '@/lib/rtl';
import { Theme } from '@/constants/theme';
import { fmtIQD } from '@/utils/formatters';


function getTodayStats(purchases: ReturnType<typeof usePurchaseStore.getState>['purchases']) {
  const today = new Date().toDateString();
  const todayPurchases = purchases.filter(
    (p) => new Date(p.createdAt).toDateString() === today
  );
  return {
    count: todayPurchases.length,
    total: todayPurchases.reduce((sum, p) => sum + p.totalIQD, 0),
  };
}

export default function PurchasesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const { chevronForward, arrowForward } = useDirectionalChevron();
  const { colors, isDark } = useAppTheme();
  const { purchases, loadPurchases } = usePurchaseStore();

  useEffect(() => { loadPurchases(); }, []);

  const { count, total } = getTodayStats(purchases);

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('purchases.title')}
        showBack
        onBack={() => router.back()}
        rightAction={
          <HeaderActionButton
            icon="time-outline"
            onPress={() => router.push('/(app)/purchases/history' as never)}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.body}>

        {/* Main CTA */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200 }}
          style={styles.mainAction}
        >
          <TouchableOpacity
            onPress={() => router.push('/(app)/purchases/new-purchase' as never)}
            activeOpacity={0.9}
            style={[styles.newBtn, { shadowColor: colors.primary }]}
          >
            <LinearGradient
              colors={[colors.primaryDark, colors.primary]}
              style={[styles.newBtnGradient, { flexDirection }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.newBtnInner, { flexDirection }]}>
                <View style={styles.newBtnIconBox}>
                  <Ionicons name="add" size={28} color={colors.white} />
                </View>
                <View>
                  <Text style={[styles.newBtnTitle, { textAlign }]}>{t('purchases.startNewPurchase')}</Text>
                  <Text style={[styles.newBtnSub, { textAlign }]}>{t('purchases.startNewPurchaseSub')}</Text>
                </View>
              </View>
              <Ionicons name={arrowForward as never} size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>

        {/* Today's Stats */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 80 }}
          style={styles.statsRow}
        >
          <PremiumCard style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: colors.softBlue }]}>
              <Ionicons name="cart-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.black }]}>{count}</Text>
            <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('purchases.todayCount')}</Text>
          </PremiumCard>

          <PremiumCard style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="cash-outline" size={20} color={colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: colors.warning }]}>{fmtIQD(total)}</Text>
            <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('purchases.totalSpent')}</Text>
          </PremiumCard>
        </MotiView>

        {/* History shortcut */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 160 }}
        >
          <TouchableOpacity
            onPress={() => router.push('/(app)/purchases/history' as never)}
            activeOpacity={0.85}
            style={[styles.secondaryBtn, { backgroundColor: colors.white, flexDirection }]}
          >
            <View style={[styles.secondaryLeft, { flexDirection }]}>
              <View style={[styles.secondaryIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="list-outline" size={20} color={colors.success} />
              </View>
              <View>
                <Text style={[styles.secondaryTitle, { color: colors.black, textAlign }]}>{t('purchases.viewHistory')}</Text>
                <Text style={[styles.secondarySub, { color: colors.gray400, textAlign }]}>{t('purchases.viewHistorySub')}</Text>
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
  header:     { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  body:       { padding: 20, paddingBottom: 24 },

  mainAction: { marginBottom: 16 },
  newBtn: {
    borderRadius: 20,
    overflow:     'hidden',
    ...Theme.shadow.button,
    shadowOpacity: 0.35,
  },
  newBtnGradient: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        20,
  },
  newBtnInner:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  newBtnIconBox: {
    width:          48,
    height:         48,
    borderRadius:   14,
    backgroundColor:'rgba(255,255,255,0.2)',
    alignItems:     'center',
    justifyContent: 'center',
  },
  newBtnTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  newBtnSub:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 16 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statIconBox: {
    width:          40,
    height:         40,
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   8,
  },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },

  secondaryBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    borderRadius:   Theme.radius.card,
    padding:        16,
    ...Theme.shadow.soft,
  },
  secondaryLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  secondaryIcon:  { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  secondaryTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  secondarySub:   { fontSize: 12 },
});
