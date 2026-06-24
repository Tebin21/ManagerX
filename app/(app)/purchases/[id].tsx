import React, { useEffect, useState } from 'react';
import {
  View, ScrollView,
  Alert, StyleSheet,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useBusinessStore } from '@/store/businessStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getPurchaseById, getPurchaseItemsByPurchaseId } from '@/lib/sqlite';
import { sharePurchaseInvoice } from '@/lib/generateInvoice';
import { Theme } from '@/constants/theme';
import type { Purchase } from '@/types/purchases';
import type { PurchaseItem } from '@/lib/sqlite';
import { fmtIQD, fmtExchangeRate } from '@/utils/formatters';
import { useRTL } from '@/lib/rtl';

// Plain alphanumeric codes (item/shared/warranty IDs like "K5421") — never
// Kurdish prose, so this never collides with real Kurdish field values.
const ID_CODE_PATTERN = /^[A-Za-z0-9-]+$/;
function isIdCode(value: string): boolean {
  return ID_CODE_PATTERN.test(value) && /[A-Za-z]/.test(value) && /\d/.test(value);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  const { isRTL, flexDirection } = useRTL();
  const ValueText = isIdCode(value) ? IdText : Text;
  return (
    <View style={[infoRow.row, { borderBottomColor: colors.gray100, flexDirection }]}>
      <Text style={[infoRow.label, { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
      <ValueText style={[infoRow.value, { color: colors.black, textAlign: 'right' }]}>{value}</ValueText>
    </View>
  );
}
const infoRow = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, gap: 16 },
  label: { fontSize: 13, flex: 1 },
  value: { fontSize: 13, fontWeight: '600', flex: 2 },
});

export default function PurchaseDetailScreen() {
  const { id, new: isNew } = useLocalSearchParams<{ id: string; new?: string }>();
  const router   = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { isRTL, flexDirection, alignEnd } = useRTL();
  const { deletePurchase } = usePurchaseStore();
  const business = useBusinessStore();

  const [purchase, setPurchase]       = useState<Purchase | null>(null);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isSharing, setIsSharing]     = useState(false);
  const [isDeleting, setIsDeleting]   = useState(false);

  useEffect(() => { loadPurchase(); }, [id]);

  useEffect(() => {
    if (isNew === '1' && purchase) handleShare();
  }, [isNew, purchase]);

  async function loadPurchase() {
    try {
      const purchaseId = Number(id);
      const [data, items] = await Promise.all([
        getPurchaseById(purchaseId),
        getPurchaseItemsByPurchaseId(purchaseId),
      ]);
      setPurchase(data);
      setPurchaseItems(items);
    } catch (err) {
      console.error('Failed to load purchase:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleShare() {
    if (!purchase) return;
    setIsSharing(true);
    try {
      await sharePurchaseInvoice(purchase, purchaseItems, {
        name: business.name, phone: business.phone,
        address: business.address, logoUri: business.logoUri,
      });
    } finally { setIsSharing(false); }
  }

  function confirmDelete() {
    Alert.alert(
      t('purchases.deleteConfirmTitle'),
      t('purchases.deleteConfirmMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('purchases.confirmDelete'), style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deletePurchase(Number(id));
              router.back();
            } catch (err: any) {
              console.error(err);
              setIsDeleting(false);
              if (err?.message === 'PURCHASE_HAS_SALES') {
                Alert.alert(t('purchases.cannotDeleteTitle'), t('purchases.cannotDeleteHasSales'));
              } else if (err?.message === 'PURCHASE_HAS_ACTIVE_DEBT') {
                Alert.alert(t('purchases.cannotDeleteTitle'), t('purchases.cannotDeleteHasDebt'));
              } else {
                Alert.alert(t('common.error'), t('common.tryAgain'));
              }
            }
          },
        },
      ]
    );
  }

  const numId = Number(id);
  if (!id || isNaN(numId)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('purchases.purchaseInvoice')} showBack />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('purchases.purchaseInvoice')} />
        <LoadingSpinner />
      </View>
    );
  }

  if (!purchase) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('purchases.purchaseInvoice')} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.gray300} />
          <Text style={[styles.notFoundText, { color: colors.gray500 }]}>{t('common.notFound')}</Text>
        </View>
      </View>
    );
  }

  const isPaid = purchase.paymentStatus === 'paid';
  const hasIds = purchase.itemIds.some((v) => v.trim());

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={purchase.purchaseNumber}
        rightAction={
          <View style={{ flexDirection, gap: 4 }}>
            <HeaderActionButton
              icon="create-outline"
              onPress={() => router.push(`/(app)/purchases/edit/${id}` as never)}
            />
            <HeaderActionButton
              icon="share-outline"
              onPress={handleShare}
              disabled={isSharing}
            />
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Invoice header */}
        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 18, stiffness: 200 }}>
          <LinearGradient
            colors={[colors.primaryDark, colors.primary]}
            style={styles.invoiceHeaderCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={[styles.invoiceHeaderTop, { flexDirection }]}>
              <View>
                <Text style={styles.invoiceLabel}>{t('purchases.purchaseInvoice')}</Text>
                <IdText style={styles.invoiceNumber}>{purchase.purchaseNumber}</IdText>
              </View>
              <View style={[styles.statusPill, isPaid ? styles.statusPillPaid : styles.statusPillDebt]}>
                <Text style={[styles.statusPillText, isPaid ? styles.statusPillTextPaid : styles.statusPillTextDebt]}>
                  {isPaid ? t('common.paid') : t('common.debt')}
                </Text>
              </View>
            </View>
            <DateText value={purchase.date} style={styles.invoiceDate} />
            <View style={[styles.invoiceTotalRow, { flexDirection }]}>
              <Text style={styles.invoiceTotalLabel}>{t('purchases.totalLabel')}</Text>
              <AmountText value={purchase.totalIQD} currency="IQD" variant="large" style={styles.invoiceTotalValue} />
            </View>
          </LinearGradient>
        </MotiView>

        {/* Product */}
        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 60 }}>
          <PremiumCard style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.productSection')}</Text>
            <InfoRow label={t('purchases.productName')} value={purchase.productName} />
            {purchase.category ? <InfoRow label={t('purchases.category')} value={purchase.category} /> : null}
            <InfoRow label={t('purchases.qty')} value={String(purchase.quantity)} />
            <InfoRow label={`${t('purchases.buyPrice')} (IQD)`} value={`${fmtIQD(purchase.buyPriceIQD)} IQD`} />
            <InfoRow label={`${t('purchases.buyPrice')} (USD)`} value={`$${purchase.buyPriceUSD.toFixed(2)}`} />
            <InfoRow label={t('purchases.exchangeRate')} value={`100 USD = ${fmtExchangeRate(purchase.exchangeRate)} IQD`} />
            {purchase.sellPriceIQD > 0 && (
              <>
                <InfoRow label={`${t('purchases.sellPrice')} (IQD)`} value={`${fmtIQD(purchase.sellPriceIQD)} IQD`} />
                <InfoRow label={t('purchases.profitLabel')} value={`${purchase.profitIQD >= 0 ? '+' : ''}${fmtIQD(purchase.profitIQD)} IQD`} />
              </>
            )}
            {purchase.warranty ? <InfoRow label={t('purchases.warranty')} value={purchase.warranty} /> : null}
          </PremiumCard>
        </MotiView>

        {/* Items */}
        {purchaseItems.length > 1 && (
          <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 80 }}>
            <PremiumCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.itemsCount')} ({purchaseItems.length})</Text>
              {purchaseItems.map((item) => (
                <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.gray100, flexDirection }]}>
                  <View style={styles.itemLeft}>
                    <Text style={[styles.itemName, { color: colors.black, textAlign: isRTL ? 'right' : 'left' }]}>{item.productName}</Text>
                    {item.category ? <Text style={[styles.itemCat, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>{item.category}</Text> : null}
                  </View>
                  <View style={[styles.itemRight, { alignItems: alignEnd }]}>
                    <Text style={[styles.itemQty, { color: colors.gray400 }]}>×{item.quantity}</Text>
                    <AmountText value={item.lineTotalIQD} currency="IQD" style={[styles.itemPrice, { color: colors.primary }]} />
                  </View>
                </View>
              ))}
            </PremiumCard>
          </MotiView>
        )}

        {/* Supplier */}
        {(purchase.supplierName || purchase.supplierPhone || purchase.supplierAddress) && (
          <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 100 }}>
            <PremiumCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.supplierSection')}</Text>
              {purchase.supplierName    ? <InfoRow label={t('purchases.supplierName')}    value={purchase.supplierName} />    : null}
              {purchase.supplierPhone   ? <InfoRow label={t('inventory.phone')}           value={purchase.supplierPhone} />   : null}
              {purchase.supplierAddress ? <InfoRow label={t('inventory.address')}         value={purchase.supplierAddress} /> : null}
            </PremiumCard>
          </MotiView>
        )}

        {/* Item IDs */}
        {hasIds && (
          <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 140 }}>
            <PremiumCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>
                {purchase.idType === 'shared' ? t('purchases.sharedIdTitle') : `${t('purchases.itemIdsTitle')} (${purchase.itemIds.length})`}
              </Text>
              {purchase.idType === 'shared' ? (
                <View style={[styles.sharedIdBox, { backgroundColor: colors.softBlue }]}>
                  <IdText style={[styles.sharedIdText, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>{purchase.itemIds[0] || '—'}</IdText>
                </View>
              ) : (
                <View style={styles.chipsWrap}>
                  {purchase.itemIds.map((v, i) => (
                    <View key={i} style={[styles.idChip, { backgroundColor: colors.softBlue, flexDirection }]}>
                      <Text style={[styles.idChipBadge, { backgroundColor: colors.primary }]}>{i + 1}</Text>
                      <IdText style={[styles.idChipText, { color: colors.primary }]}>{v || '—'}</IdText>
                    </View>
                  ))}
                </View>
              )}
            </PremiumCard>
          </MotiView>
        )}

        {/* Additional info */}
        {(purchase.description || purchase.notes) && (
          <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 180 }}>
            <PremiumCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.additionalSection')}</Text>
              {purchase.description && (
                <View style={styles.notesBlock}>
                  <Text style={[styles.notesLabel, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.description')}</Text>
                  <Text style={[styles.notesText, { color: colors.gray600, textAlign: isRTL ? 'right' : 'left' }]}>{purchase.description}</Text>
                </View>
              )}
              {purchase.notes && (
                <View style={styles.notesBlock}>
                  <Text style={[styles.notesLabel, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.notes')}</Text>
                  <Text style={[styles.notesText, { color: colors.gray600, textAlign: isRTL ? 'right' : 'left' }]}>{purchase.notes}</Text>
                </View>
              )}
            </PremiumCard>
          </MotiView>
        )}

        {/* Actions */}
        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 220 }} style={styles.actionsWrap}>
          <PrimaryButton
            label={isSharing ? t('purchases.preparingPdf') : t('purchases.shareInvoice')}
            onPress={handleShare}
            loading={isSharing}
            disabled={isSharing || isDeleting}
          />
          <View style={styles.gap} />
          <PrimaryButton
            label={isDeleting ? t('purchases.deleting') : t('purchases.deletePurchase')}
            onPress={confirmDelete}
            loading={isDeleting}
            disabled={isDeleting || isSharing}
            variant="outline"
          />
        </MotiView>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  body:         { padding: 16, paddingBottom: 48 },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16 },

  invoiceHeaderCard: { borderRadius: Theme.radius.card, padding: 20, marginBottom: 14, ...Theme.shadow.button, shadowOpacity: 0.3 },
  invoiceHeaderTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  invoiceLabel:      { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  invoiceNumber:     { fontSize: 18, fontWeight: '700', color: '#fff' },
  invoiceDate:       { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 16 },
  statusPill:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Theme.radius.full },
  statusPillPaid:    { backgroundColor: 'rgba(16,185,129,0.25)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)' },
  statusPillDebt:    { backgroundColor: 'rgba(245,158,11,0.25)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)' },
  statusPillText:    { fontSize: 12, fontWeight: '700' },
  statusPillTextPaid:{ color: '#D1FAE5' },
  statusPillTextDebt:{ color: '#FEF3C7' },
  invoiceTotalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Theme.radius.md, padding: 14 },
  invoiceTotalLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  invoiceTotalValue: { fontSize: 20, fontWeight: '800', color: '#fff' },

  section:      { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },

  sharedIdBox:  { borderRadius: Theme.radius.md, padding: 12, marginTop: 4 },
  sharedIdText: { fontSize: 15, fontWeight: '700' },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  idChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Theme.radius.md, paddingHorizontal: 10, paddingVertical: 6 },
  idChipBadge:{ fontSize: 11, fontWeight: '700', color: '#fff', width: 20, height: 20, borderRadius: 10, textAlign: 'center', lineHeight: 20 },
  idChipText: { fontSize: 13, fontWeight: '600' },

  itemRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1 },
  itemLeft:  { flex: 1 },
  itemName:  { fontSize: 14, fontWeight: '600', marginBottom: 1 },
  itemCat:   { fontSize: 11 },
  itemRight: { alignItems: 'flex-end', gap: 2 },
  itemQty:   { fontSize: 12 },
  itemPrice: { fontSize: 14, fontWeight: '700' },

  notesBlock: { marginBottom: 12 },
  notesLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  notesText:  { fontSize: 14, lineHeight: 20 },

  actionsWrap: { marginTop: 4 },
  gap:         { height: 10 },
});
