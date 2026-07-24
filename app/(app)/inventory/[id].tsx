import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { useTranslation } from 'react-i18next';
import { LowStockBadge } from '@/components/inventory/LowStockBadge';
import { getInventoryProductById, getSalesByProductId, setProductStoreVisibility } from '@/lib/sqlite';
import { useInventoryStore } from '@/store/inventoryStore';
import { useOnlineStoreSubscriptionStore } from '@/store/onlineStoreSubscriptionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import { computeProductLowStock } from '@/lib/lowStock';
import type { InventoryProduct } from '@/types/inventory';
import { useRTL, RTL_SPACING, useDirectionalChevron } from '@/lib/rtl';

export default function InventoryDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { removeProduct } = useInventoryStore();
  const hasActiveSubscription = useOnlineStoreSubscriptionStore((s) => s.isActive);
  const { globalLowStockEnabled, globalLowStockThreshold } = useSettingsStore();
  const { colors } = useAppTheme();
  const { chevronForward } = useDirectionalChevron();
  const { isRTL, textAlign, writingDirection, valueAlign, flexDirection, alignEnd } = useRTL();
  const sectionTitleStyle = [styles.sectionTitle, { color: colors.gray400, textAlign, writingDirection }];

  const [product, setProduct] = useState<InventoryProduct | null>(null);
  const [salesHistory, setSalesHistory] = useState<{
    id: number; saleId: number; invoiceNumber: string;
    quantity: number; sellingPrice: number; lineTotal: number; saleCreatedAt: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, sales] = await Promise.all([
        getInventoryProductById(Number(id)),
        getSalesByProductId(Number(id)),
      ]);
      setProduct(p);
      setSalesHistory(sales);
    } catch (err) {
      console.error('Failed to load product detail:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const confirmDelete = useCallback(() => {
    if (!product) return;
    Alert.alert(
      t('inventory.deleteTitle'),
      t('inventory.deleteMsg', { name: product.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await removeProduct(product.id);
            router.back();
          },
        },
      ]
    );
  }, [product, removeProduct, router]);

  const handleToggleStoreVisible = useCallback(async (value: boolean) => {
    if (!product) return;
    await setProductStoreVisibility(product.id, value);
    await load();
  }, [product, load]);

  const numId = Number(id);
  if (!id || isNaN(numId)) {
    return (
      <View style={[styles.loadWrap, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('inventory.productDetails')} showBack />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.loadWrap, { backgroundColor: colors.gray50 }]}>
        <AppHeader title="" />
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.loadWrap, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('inventory.productNotFound')} />
        <Text style={[styles.notFound, { color: colors.gray500 }]}>{t('inventory.productNotFound')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.backBtnText}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLowStock = computeProductLowStock(product, globalLowStockEnabled, globalLowStockThreshold);
  const isSold = !product.isActive || (product.idMode === 'unique' && product.quantity === 0);
  const totalValue = product.purchasePrice * product.quantity;
  const profitPerUnit = product.sellingPrice - product.purchasePrice;
  const isCustom = product.idMode === 'unique';

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={product.name} showBack>
        {/* Category + status row inside gradient — centered & wrapped so it
            never crowds the title or collides with the gradient's bottom edge */}
        <View style={[styles.headerMeta, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 8 }]}>
          <View style={styles.catChip}>
            <Text style={styles.catText} numberOfLines={1}>{product.category}</Text>
          </View>
          {isLowStock && !isSold && <LowStockBadge />}
          {isSold && (
            <View style={styles.soldBadge}>
              <Text style={styles.soldBadgeText}>{t('inventory.soldBadge')}</Text>
            </View>
          )}
          <View style={[styles.payBadge, product.paymentStatus === 'paid' ? styles.payBadgePaid : styles.payBadgeDebt]}>
            <Text style={[styles.payBadgeText, product.paymentStatus === 'paid' ? styles.payTextPaid : styles.payTextDebt]}>
              {product.paymentStatus === 'paid' ? t('common.paid') : t('common.debt')}
            </Text>
          </View>
        </View>
      </AppHeader>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Key stats */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 220 }}
          style={[styles.statsCard, { backgroundColor: colors.white }]}
        >
          <View style={[styles.statsRow, { paddingVertical: isRTL ? RTL_SPACING.rowPadV : 14, paddingHorizontal: isRTL ? RTL_SPACING.gap : 16 }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.gray400, marginBottom: isRTL ? RTL_SPACING.title : 4 }]}>{t('inventory.quantity')}</Text>
              <Text style={[styles.statValue, { color: isSold ? colors.gray400 : colors.black }]}>
                {isSold ? t('inventory.soldBadge') : `${product.quantity} ${product.unit}`}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.gray100 }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.gray400, marginBottom: isRTL ? RTL_SPACING.title : 4 }]}>{t('inventory.buyPrice')}</Text>
              <AmountText value={product.purchasePrice} currency="IQD" style={[styles.statValue, { color: colors.black }]} />
            </View>
          </View>
          <View style={[styles.statsRowBorder, { backgroundColor: colors.gray100 }]} />
          <View style={[styles.statsRow, { paddingVertical: isRTL ? RTL_SPACING.rowPadV : 14, paddingHorizontal: isRTL ? RTL_SPACING.gap : 16 }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.gray400, marginBottom: isRTL ? RTL_SPACING.title : 4 }]}>{t('inventory.sellPrice')}</Text>
              <AmountText value={product.sellingPrice} currency="IQD" style={[styles.statValue, { color: colors.primary }]} />
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.gray100 }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.gray400, marginBottom: isRTL ? RTL_SPACING.title : 4 }]}>{t('inventory.totalValueLabel')}</Text>
              <AmountText value={totalValue} currency="IQD" style={[styles.statValue, { color: colors.black }]} />
            </View>
          </View>
          {profitPerUnit !== 0 && (
            <>
              <View style={[styles.statsRowBorder, { backgroundColor: colors.gray100 }]} />
              <View style={[styles.statsRow, { paddingVertical: isRTL ? RTL_SPACING.rowPadV : 14, paddingHorizontal: isRTL ? RTL_SPACING.gap : 16 }]}>
                <View style={[styles.statItem, { flex: 1 }]}>
                  <Text style={[styles.statLabel, { color: colors.gray400, marginBottom: isRTL ? RTL_SPACING.title : 4 }]}>{t('inventory.profitPerUnit')}</Text>
                  <AmountText
                    value={profitPerUnit}
                    currency="IQD"
                    prefix={profitPerUnit > 0 ? '+' : ''}
                    style={[styles.statValue, { color: profitPerUnit > 0 ? colors.success : colors.error }]}
                  />
                </View>
              </View>
            </>
          )}
        </MotiView>

        {/* Supplier section */}
        {(product.supplierName || product.purchaseDate) && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 60 }}
            style={[styles.section, { backgroundColor: colors.white, padding: isRTL ? RTL_SPACING.cardPad : 16 }]}
          >
            <Text style={sectionTitleStyle}>{t('inventory.supplierAndPurchase')}</Text>
            {product.supplierName && (
              <View style={[styles.infoRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8 }]}>
                <Ionicons name="business-outline" size={16} color={colors.gray400} />
                <Text style={[styles.infoLabel, { color: colors.gray500, textAlign, writingDirection, width: isRTL ? 88 : 70 }]}>{t('inventory.supplier')}</Text>
                <Text style={[styles.infoValue, { color: colors.black, textAlign, writingDirection }]}>{product.supplierName}</Text>
              </View>
            )}
            {product.supplierPhone && (
              <View style={[styles.infoRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8 }]}>
                <Ionicons name="call-outline" size={16} color={colors.gray400} />
                <Text style={[styles.infoLabel, { color: colors.gray500, textAlign, writingDirection, width: isRTL ? 88 : 70 }]}>{t('inventory.phone')}</Text>
                <Text style={[styles.infoValue, { color: colors.black, textAlign: valueAlign }]}>{product.supplierPhone}</Text>
              </View>
            )}
            {product.supplierAddress && (
              <View style={[styles.infoRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8 }]}>
                <Ionicons name="location-outline" size={16} color={colors.gray400} />
                <Text style={[styles.infoLabel, { color: colors.gray500, textAlign, writingDirection, width: isRTL ? 88 : 70 }]}>{t('inventory.address')}</Text>
                <Text style={[styles.infoValue, { color: colors.black, textAlign, writingDirection }]}>{product.supplierAddress}</Text>
              </View>
            )}
            {product.purchaseDate && (
              <View style={[styles.infoRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8 }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.gray400} />
                <Text style={[styles.infoLabel, { color: colors.gray500, textAlign, writingDirection, width: isRTL ? 88 : 70 }]}>{t('inventory.date')}</Text>
                <DateText value={product.purchaseDate} style={[styles.infoValue, { color: colors.black, textAlign: valueAlign }]} />
              </View>
            )}
            {product.purchaseId && (
              <TouchableOpacity
                style={[styles.linkRow, { borderTopColor: colors.gray100, flexDirection, gap: isRTL ? RTL_SPACING.gap : 8 }]}
                onPress={() => router.push(`/(app)/purchases/${product.purchaseId}` as never)}
                activeOpacity={0.75}
              >
                <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                <Text style={[styles.linkText, { color: colors.primary, textAlign, writingDirection }]}>{t('inventory.viewPurchaseInvoice')}</Text>
                <Ionicons name={chevronForward as never} size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </MotiView>
        )}

        {/* Item IDs section */}
        {product.itemId && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 120 }}
            style={[styles.section, { backgroundColor: colors.white, padding: isRTL ? RTL_SPACING.cardPad : 16 }]}
          >
            <Text style={sectionTitleStyle}>{isCustom ? t('inventory.itemIdUnique') : t('inventory.itemIdShared')}</Text>
            <View style={[styles.idChipWrap, { flexDirection }]}>
              <View style={[styles.idChip, { backgroundColor: colors.softBlue }]}>
                <IdText style={[styles.idChipText, { color: colors.primaryDark, lineHeight: undefined }]}>{product.itemId}</IdText>
              </View>
              {isCustom && (
                <View style={[styles.idChip, isSold ? { backgroundColor: colors.gray100 } : styles.idChipAvail]}>
                  <Text style={[styles.idChipText, { color: colors.primaryDark }]}>{isSold ? t('inventory.soldBadge') : t('inventory.availableBadge')}</Text>
                </View>
              )}
            </View>
          </MotiView>
        )}

        {/* Warranty / Notes */}
        {(product.warranty || product.description || product.notes) && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 160 }}
            style={[styles.section, { backgroundColor: colors.white, padding: isRTL ? RTL_SPACING.cardPad : 16 }]}
          >
            <Text style={sectionTitleStyle}>{t('inventory.details')}</Text>
            {product.warranty && (
              <View style={[styles.infoRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8 }]}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.gray400} />
                <Text style={[styles.infoLabel, { color: colors.gray500, textAlign, writingDirection, width: isRTL ? 88 : 70 }]}>{t('inventory.warranty')}</Text>
                <Text style={[styles.infoValue, { color: colors.black, textAlign, writingDirection }]}>{product.warranty}</Text>
              </View>
            )}
            {product.description && (
              <View style={styles.noteRow}>
                <Text style={[styles.noteLabel, { color: colors.gray400, textAlign, writingDirection }]}>{t('inventory.description')}</Text>
                <Text style={[styles.noteText, { color: colors.black, textAlign, writingDirection }]}>{product.description}</Text>
              </View>
            )}
            {product.notes && (
              <View style={styles.noteRow}>
                <Text style={[styles.noteLabel, { color: colors.gray400, textAlign, writingDirection }]}>{t('inventory.notes')}</Text>
                <Text style={[styles.noteText, { color: colors.black, textAlign, writingDirection }]}>{product.notes}</Text>
              </View>
            )}
          </MotiView>
        )}

        {/* Sales history */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 200 }}
          style={[styles.section, { backgroundColor: colors.white, padding: isRTL ? RTL_SPACING.cardPad : 16 }]}
        >
          <Text style={sectionTitleStyle}>{t('inventory.salesHistory')} ({salesHistory.length})</Text>
          {salesHistory.length === 0 ? (
            <Text style={[styles.noSales, { color: colors.gray400, textAlign, writingDirection }]}>{t('inventory.noSales')}</Text>
          ) : (
            salesHistory.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.saleRow, { borderTopColor: colors.gray100, flexDirection }]}
                onPress={() => router.push(`/(app)/sales/${s.saleId}` as never)}
                activeOpacity={0.75}
              >
                <View>
                  <IdText style={[styles.saleInvoice, { color: colors.black, textAlign }]}>{s.invoiceNumber}</IdText>
                  <DateText value={s.saleCreatedAt} size="small" style={[styles.saleDate, { color: colors.gray400, textAlign }]} />
                </View>
                <View style={[styles.saleRight, { alignItems: alignEnd }]}>
                  <Text style={[styles.saleQty, { color: colors.gray500 }]}>× {s.quantity}</Text>
                  <AmountText value={s.lineTotal} currency="IQD" style={[styles.saleTotal, { color: colors.primary }]} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </MotiView>

        {/* Actions */}
        <View style={[styles.storeVisRow, { backgroundColor: colors.white, flexDirection, gap: isRTL ? RTL_SPACING.gap : 12, padding: isRTL ? RTL_SPACING.cardPad : 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.storeVisLabel, { color: colors.black, textAlign, writingDirection }]}>{t('inventory.onlineStoreVisible')}</Text>
            <Text style={[styles.storeVisSub, { color: colors.gray400, textAlign, writingDirection }]}>
              {hasActiveSubscription
                ? t('inventory.onlineStoreVisibleSub')
                : t('dashboard.onlineStore.subscriptionRequired')}
            </Text>
          </View>
          <Switch
            value={product.storeVisible}
            onValueChange={handleToggleStoreVisible}
            disabled={!hasActiveSubscription}
            trackColor={{ false: colors.gray200, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        <View style={[styles.actions, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 12 }]}>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.primary, flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 8 }]}
            onPress={() => router.push(`/(app)/inventory/edit/${product.id}` as never)}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={18} color={colors.white} />
            <Text style={styles.editBtnText}>{t('inventory.editProduct')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.error, flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 6 }]}
            onPress={confirmDelete}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[styles.deleteBtnText, { color: colors.error }]}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound:  { fontSize: 15, marginBottom: 16 },
  backBtn:   { paddingHorizontal: 20, paddingVertical: 10, borderRadius: Theme.radius.md },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    rowGap: 8,
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 10,
    paddingBottom: 16,
  },
  catChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  catText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  soldBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  soldBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  payBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  payBadgePaid: { backgroundColor: 'rgba(16,185,129,0.25)' },
  payBadgeDebt: { backgroundColor: 'rgba(245,158,11,0.25)' },
  payBadgeText: { fontSize: 12, fontWeight: '600' },
  payTextPaid:  { color: '#ECFDF5' },
  payTextDebt:  { color: '#FFFBEB' },

  scroll: { padding: 16, paddingBottom: 40 },

  statsCard:      { borderRadius: Theme.radius.card, marginBottom: 14, overflow: 'hidden', ...Theme.shadow.card },
  statsRow:       { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16 },
  statsRowBorder: { height: 1 },
  statDivider:    { width: 1, marginVertical: 4 },
  statItem:       { flex: 1, alignItems: 'center' },
  statLabel:      { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  statValue:      { fontSize: 15, fontWeight: '700' },
  section:        { borderRadius: Theme.radius.card, padding: 16, marginBottom: 14, ...Theme.shadow.soft },
  sectionTitle:   { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  infoRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  infoLabel:      { fontSize: 13, width: 70 },
  infoValue:      { flex: 1, fontSize: 13, fontWeight: '600' },
  linkRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12, marginTop: 4, borderTopWidth: 1 },
  linkText:       { flex: 1, fontSize: 13, fontWeight: '600' },
  noteRow:        { marginBottom: 10 },
  noteLabel:      { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  noteText:       { fontSize: 13, lineHeight: 19 },
  idChipWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  idChip:         { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  idChipAvail:    { backgroundColor: '#DCFCE7' },
  idChipText:     { fontSize: 13, fontWeight: '600' },
  noSales:        { fontSize: 13, fontStyle: 'italic' },
  saleRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1 },
  saleInvoice:    { fontSize: 13, fontWeight: '700' },
  saleDate:       { fontSize: 12, marginTop: 2 },
  saleRight:      { alignItems: 'flex-end' },
  saleQty:        { fontSize: 12 },
  saleTotal:      { fontSize: 13, fontWeight: '700' },
  storeVisRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Theme.radius.card, padding: 16, marginBottom: 14, ...Theme.shadow.card },
  storeVisLabel:  { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  storeVisSub:    { fontSize: 12, lineHeight: 16 },

  actions:        { flexDirection: 'row', gap: 12, marginTop: 4 },
  editBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Theme.radius.md, paddingVertical: 14, ...Theme.shadow.button },
  editBtnText:    { fontSize: 15, fontWeight: '700', color: '#fff' },
  deleteBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: Theme.radius.md, paddingVertical: 14, paddingHorizontal: 18 },
  deleteBtnText:  { fontSize: 15, fontWeight: '700' },
});
