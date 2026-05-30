import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { InvoiceView } from '@/components/sales/InvoiceView';
import { useTranslation } from 'react-i18next';
import { useSalesStore } from '@/store/salesStore';
import { useBusinessStore } from '@/store/businessStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getSaleById } from '@/lib/sqlite';
import { shareInvoice } from '@/lib/generateInvoice';
import type { Sale } from '@/types/sales';

export default function SaleDetailScreen() {
  const { id, new: isNew } = useLocalSearchParams<{ id: string; new?: string }>();
  const router   = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { deleteSale } = useSalesStore();
  const business = useBusinessStore();

  const [sale, setSale]         = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { loadSale(); }, [id]);

  useEffect(() => {
    if (isNew === '1' && sale) handleShare();
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
      });
    } finally { setIsSharing(false); }
  }

  function confirmDelete() {
    Alert.alert(
      t('sales.deleteTitle'),
      t('sales.deleteMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('sales.confirmDelete'), style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try { await deleteSale(Number(id)); router.back(); }
            catch (err) { console.error(err); setIsDeleting(false); }
          },
        },
      ]
    );
  }

  const gradColors = [colors.gradientStart, colors.gradientMid] as [string, string];

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
        <LoadingSpinner />
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('sales.title')} />
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.gray500 }]}>{t('sales.saleNotFound')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={sale.invoiceNumber}
        rightAction={
          <HeaderActionButton icon="share-outline" onPress={handleShare} disabled={isSharing} />
        }
      />

      <ScrollView contentContainerStyle={styles.body}>
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
          <PrimaryButton label={isSharing ? t('sales.preparingPdf') : t('sales.shareInvoice')} onPress={handleShare} loading={isSharing} />
          <View style={styles.spacer} />
          <PrimaryButton label={t('sales.deleteTitle')} onPress={confirmDelete} loading={isDeleting} variant="outline" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header:    { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  body:      { padding: 16, paddingBottom: 40 },
  actions:   { marginTop: 16, gap: 10 },
  spacer:    { height: 4 },
  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15 },
});
