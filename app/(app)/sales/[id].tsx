import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, InteractionManager, Alert, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { LoadingView } from '@/components/ui/LoadingView';
import { InvoiceView } from '@/components/sales/InvoiceView';
import { useTranslation } from 'react-i18next';
import { useBusinessStore } from '@/store/businessStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { getSaleById } from '@/lib/sqlite';
import { shareInvoice } from '@/lib/generateInvoice';
import { Theme } from '@/constants/theme';
import { Typography } from '@/constants/typography';
import { useResponsive } from '@/hooks/useResponsive';
import type { Sale } from '@/types/sales';
import type { ReceiptCurrencyMode } from '@/lib/invoiceTemplate';

const HEADER_TITLE_STYLE = { ...Typography.title, color: '#FFFFFF', letterSpacing: 0.15 };

export default function SaleDetailScreen() {
  const { id, new: isNew, currency } = useLocalSearchParams<{ id: string; new?: string; currency?: string }>();
  const baseCurrency = useSettingsStore(s => s.baseCurrency);
  const receiptCurrency: ReceiptCurrencyMode = currency === 'usd' || currency === 'both' ? currency : (baseCurrency === 'USD' ? 'usd' : 'iqd');
  const router   = useRouter();
  const { t } = useTranslation();
  const { isRTL, textAlign } = useRTL();
  const { colors, isDark } = useAppTheme();
  const { isTablet, contentContainerStyle } = useResponsive();
  const business = useBusinessStore();

  const [sale, setSale]         = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => { loadSale(); }, [id]);

  useEffect(() => {
    if (isNew === '1' && sale) {
      const task = InteractionManager.runAfterInteractions(() => handleShare());
      return () => task.cancel();
    }
  }, [isNew, sale]);

  async function loadSale() {
    try {
      const data = await getSaleById(Number(id));
      setSale(data);
    } catch (err) {
      console.error('Failed to load sale:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleShare() {
    if (!sale) return;
    setIsSharing(true);
    try {
      await shareInvoice(sale, {
        name: business.name, phone: business.phone,
        address: business.address, logoUri: business.logoUri,
      }, receiptCurrency);
    } catch (err) {
      console.error('[PDF] handleShare unexpected error:', err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally { setIsSharing(false); }
  }

  const numId = Number(id);
  if (!id || isNaN(numId)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('sales.title')} showBack />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('sales.title')} />
        <LoadingView />
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('sales.title')} />
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.gray500, textAlign }]}>{t('sales.saleNotFound')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={<IdText style={HEADER_TITLE_STYLE}>{sale.invoiceNumber}</IdText>}
        rightAction={
          isNew === '1' ? (
            <HeaderActionButton icon="share-outline" onPress={handleShare} disabled={isSharing} />
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={[styles.body, isTablet && contentContainerStyle]}>
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
        >
          <PremiumCard>
            <InvoiceView sale={sale} />
          </PremiumCard>
        </MotiView>

        <View style={styles.actions}>
          {isNew === '1' ? (
            <>
              <PrimaryButton label={isSharing ? t('sales.preparingPdf') : t('sales.shareInvoice')} onPress={handleShare} loading={isSharing} />
              <View style={styles.spacer} />
            </>
          ) : (
            <>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/(app)/invoices' as never)}
                style={[
                  styles.invoicesBanner,
                  {
                    backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.14)',
                    borderColor: colors.primary,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View style={[styles.invoicesBannerIcon, { backgroundColor: colors.primary }]}>
                  <Ionicons name="receipt" size={16} color="#0F172A" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.invoicesBannerTitle, { color: colors.black, textAlign: isRTL ? 'right' : 'left' }]}>
                    {isRTL ? 'چاپکردنی وەسڵ لە بەشی پسوڵەکان' : 'Print Invoice via Invoices Hub'}
                  </Text>
                  <Text style={[styles.invoicesBannerSub, { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>
                    {isRTL
                      ? 'بۆ چاپکردن یان بینینی وەسڵەکە، کلیک لێرە بکە بۆ چوونە بەشی پسوڵەکان.'
                      : 'To print or view this invoice, tap here to open Invoices Hub.'}
                  </Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.primary} />
              </TouchableOpacity>
              <View style={styles.spacer} />
            </>
          )}
          <PrimaryButton label={t('sales.editInvoice')} onPress={() => router.push(`/(app)/sales/edit/${id}` as never)} variant="outline" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body:      { padding: 16, paddingBottom: 40 },
  actions:   { marginTop: 16, gap: 10 },
  spacer:    { height: 4 },
  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15 },
  invoicesBanner: {
    padding: 14,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  invoicesBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoicesBannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  invoicesBannerSub: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
});
