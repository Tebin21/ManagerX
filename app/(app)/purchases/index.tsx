import React, { useEffect, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
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
import { useResponsive } from '@/hooks/useResponsive';
import { hexToRgba } from '@/lib/colorUtils';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useLanguageStore } from '@/store/languageStore';

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
  const { textAlign, flexDirection, isRTL } = useRTL();
  const { chevronForward, arrowForward } = useDirectionalChevron();
  const { colors, isDark } = useAppTheme();
  const { purchases, loadPurchases } = usePurchaseStore();
  const { isTablet, isTabletLandscape, contentContainerStyle } = useResponsive();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  useEffect(() => { loadPurchases(); }, []);

  const { count, total } = useMemo(() => getTodayStats(purchases), [purchases]);

  const recentPurchases = useMemo(() => {
    return purchases.slice(0, 4);
  }, [purchases]);

  const primaryCol = (
    <>
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
            style={[
              styles.newBtnGradient,
              isTablet && {
                paddingVertical: isTabletLandscape ? 36 : 30,
                paddingHorizontal: isTabletLandscape ? 34 : 28,
                borderRadius: 26,
              },
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View
              style={[
                styles.newBtnInner,
                isTablet && { gap: 20 },
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View
                style={[
                  styles.newBtnIconBox,
                  isTablet && {
                    width: isTabletLandscape ? 78 : 68,
                    height: isTabletLandscape ? 78 : 68,
                    borderRadius: 24,
                  },
                ]}
              >
                <Ionicons
                  name="add"
                  size={isTabletLandscape ? 44 : isTablet ? 38 : 28}
                  color={colors.white}
                />
              </View>
              <View style={{ flexShrink: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text
                  style={[
                    styles.newBtnTitle,
                    isTablet && {
                      fontSize: isTabletLandscape ? 26 : 23,
                      marginBottom: 6,
                    },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {t('purchases.startNewPurchase')}
                </Text>
                <Text
                  style={[
                    styles.newBtnSub,
                    isTablet && {
                      fontSize: isTabletLandscape ? 16 : 14.5,
                      lineHeight: 22,
                    },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {t('purchases.startNewPurchaseSub')}
                </Text>
              </View>
            </View>
            <Ionicons
              name={arrowForward as never}
              size={isTabletLandscape ? 32 : isTablet ? 28 : 20}
              color="rgba(255,255,255,0.9)"
            />
          </LinearGradient>
        </TouchableOpacity>
      </MotiView>

      {/* Today's Stats */}
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 80 }}
        style={[styles.statsRow, isTablet && { gap: 18, marginBottom: 20 }]}
      >
        <PremiumCard
          style={[
            styles.statCard,
            isTablet && {
              paddingVertical: isTabletLandscape ? 34 : 28,
              borderRadius: 24,
            },
          ]}
        >
          <View
            style={[
              styles.statIconBox,
              isTablet && {
                width: isTabletLandscape ? 62 : 54,
                height: isTabletLandscape ? 62 : 54,
                borderRadius: 18,
                marginBottom: 14,
              },
              { backgroundColor: colors.softBlue },
            ]}
          >
            <Ionicons
              name="cart-outline"
              size={isTabletLandscape ? 32 : isTablet ? 28 : 20}
              color={colors.primary}
            />
          </View>
          <Text
            style={[
              styles.statValue,
              isTablet && { fontSize: isTabletLandscape ? 36 : 30 },
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
            {t('purchases.todayCount')}
          </Text>
        </PremiumCard>

        <PremiumCard
          style={[
            styles.statCard,
            isTablet && {
              paddingVertical: isTabletLandscape ? 34 : 28,
              borderRadius: 24,
            },
          ]}
        >
          <View
            style={[
              styles.statIconBox,
              isTablet && {
                width: isTabletLandscape ? 62 : 54,
                height: isTabletLandscape ? 62 : 54,
                borderRadius: 18,
                marginBottom: 14,
              },
              { backgroundColor: isDark ? hexToRgba(colors.warning, 0.15) : '#FEF3C7' },
            ]}
          >
            <Ionicons
              name="cash-outline"
              size={isTabletLandscape ? 32 : isTablet ? 28 : 20}
              color={colors.warning}
            />
          </View>
          <AmountText
            value={total}
            currency="IQD"
            style={[
              styles.statValue,
              isTablet && {
                fontSize: isTabletLandscape ? 36 : 30,
                lineHeight: isTabletLandscape ? 42 : 36,
              },
              { color: colors.warning },
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
            {t('purchases.totalSpent')}
          </Text>
        </PremiumCard>
      </MotiView>
    </>
  );

  const secondaryCol = (
    <>
      {/* History shortcut */}
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 160 }}
      >
        <TouchableOpacity
          onPress={() => router.push('/(app)/purchases/history' as never)}
          activeOpacity={0.85}
          style={[
            styles.secondaryBtn,
            isTablet && {
              padding: isTabletLandscape ? 30 : 25,
              borderRadius: 24,
            },
            { backgroundColor: colors.white, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <View
            style={[
              styles.secondaryLeft,
              isTablet && { gap: 20 },
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <View
              style={[
                styles.secondaryIcon,
                isTablet && {
                  width: isTabletLandscape ? 66 : 58,
                  height: isTabletLandscape ? 66 : 58,
                  borderRadius: 20,
                },
                { backgroundColor: isDark ? hexToRgba(colors.success, 0.15) : '#F0FDF4' },
              ]}
            >
              <Ionicons
                name="list-outline"
                size={isTabletLandscape ? 32 : isTablet ? 28 : 20}
                color={colors.success}
              />
            </View>
            <View style={{ flexShrink: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text
                style={[
                  styles.secondaryTitle,
                  isTablet && {
                    fontSize: isTabletLandscape ? 22 : 19,
                    marginBottom: 5,
                  },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  { color: colors.black, textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {t('purchases.viewHistory')}
              </Text>
              <Text
                style={[
                  styles.secondarySub,
                  isTablet && { fontSize: isTabletLandscape ? 16 : 14.5 },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                  { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {t('purchases.viewHistorySub')}
              </Text>
            </View>
          </View>
          <Ionicons
            name={chevronForward as never}
            size={isTabletLandscape ? 30 : isTablet ? 26 : 18}
            color={colors.gray300}
          />
        </TouchableOpacity>
      </MotiView>

      {/* Suppliers shortcut */}
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 240 }}
        style={{ marginTop: isTablet ? 18 : 12 }}
      >
        <TouchableOpacity
          onPress={() => router.push('/(app)/suppliers' as never)}
          activeOpacity={0.85}
          style={[
            styles.secondaryBtn,
            isTablet && {
              padding: isTabletLandscape ? 30 : 25,
              borderRadius: 24,
            },
            { backgroundColor: colors.white, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <View
            style={[
              styles.secondaryLeft,
              isTablet && { gap: 20 },
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <View
              style={[
                styles.secondaryIcon,
                isTablet && {
                  width: isTabletLandscape ? 66 : 58,
                  height: isTabletLandscape ? 66 : 58,
                  borderRadius: 20,
                },
                { backgroundColor: colors.softBlue },
              ]}
            >
              <Ionicons
                name="business-outline"
                size={isTabletLandscape ? 32 : isTablet ? 28 : 20}
                color={colors.primary}
              />
            </View>
            <View style={{ flexShrink: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text
                style={[
                  styles.secondaryTitle,
                  isTablet && {
                    fontSize: isTabletLandscape ? 22 : 19,
                    marginBottom: 5,
                  },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  { color: colors.black, textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {t('dashboard.suppliers')}
              </Text>
              <Text
                style={[
                  styles.secondarySub,
                  isTablet && { fontSize: isTabletLandscape ? 16 : 14.5 },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                  { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {t('dashboard.suppliersSub')}
              </Text>
            </View>
          </View>
          <Ionicons
            name={chevronForward as never}
            size={isTabletLandscape ? 30 : isTablet ? 26 : 18}
            color={colors.gray300}
          />
        </TouchableOpacity>
      </MotiView>

      {/* Recent Purchases Feed (Tablet Exclusive) */}
      {isTablet && recentPurchases.length > 0 && (
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 300 }}
          style={{ marginTop: 20 }}
        >
          <PremiumCard style={{ padding: 20, borderRadius: 24 }}>
            <View
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
                paddingBottom: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.gray200,
              }}
            >
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text
                  style={[
                    { fontSize: 16, color: colors.black },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKuLanguage ? 'دواین پسوولەکانی کڕین' : 'Recent Purchases'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(app)/purchases/history' as never)}
                style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}
              >
                <Text
                  style={[
                    { fontSize: 13, color: colors.primary },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKuLanguage ? 'بینینی هەمووی' : 'View All'}
                </Text>
                <Ionicons name={chevronForward as never} size={15} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10 }}>
              {recentPurchases.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/(app)/purchases/${item.id}` as never)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    backgroundColor: isDark ? colors.gray100 : colors.gray50,
                  }}
                >
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text
                      style={[
                        { fontSize: 15, fontWeight: '700', color: colors.black },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                      numberOfLines={1}
                    >
                      {item.productName}
                    </Text>
                    <Text
                      style={[
                        { fontSize: 12, color: colors.gray400, marginTop: 2 },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                      ]}
                    >
                      {item.supplierName || (isKuLanguage ? 'دابینکەری گشتی' : 'General Supplier')} • {item.quantity} {isKuLanguage ? 'دانە' : 'qty'}
                    </Text>
                  </View>
                  <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                    <AmountText
                      value={item.totalIQD}
                      currency="IQD"
                      style={{ fontSize: 15, fontWeight: '800', color: colors.primary }}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        color: item.paymentStatus === 'paid' ? colors.success : colors.error,
                        marginTop: 2,
                        fontWeight: '600',
                      }}
                    >
                      {item.paymentStatus === 'paid'
                        ? (isKuLanguage ? 'پارەدراو' : 'Paid')
                        : (isKuLanguage ? 'قەرز' : 'Debt')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </PremiumCard>
        </MotiView>
      )}
    </>
  );

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

      <ScrollView
        contentContainerStyle={[
          styles.body,
          isTablet && contentContainerStyle,
          isTablet && { padding: isTabletLandscape ? 34 : 26 },
        ]}
      >
        {isTablet ? (
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 26, alignItems: 'flex-start' }}>
            <View style={{ flex: 1.15 }}>{primaryCol}</View>
            <View style={{ flex: 1 }}>{secondaryCol}</View>
          </View>
        ) : (
          <>
            {primaryCol}
            {secondaryCol}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  body:       { padding: 20, paddingBottom: 24 },

  mainAction: { marginBottom: 16 },
  newBtn: {
    borderRadius: 24,
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
  newBtnInner:   { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
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
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 18, borderRadius: Theme.radius.card },
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
  secondaryLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  secondaryIcon:  { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  secondaryTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  secondarySub:   { fontSize: 12 },
});
