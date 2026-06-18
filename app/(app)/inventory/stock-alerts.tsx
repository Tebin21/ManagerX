import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/common/AppHeader';
import { useInventoryStore } from '@/store/inventoryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import { computeProductLowStock } from '@/lib/lowStock';
import type { InventoryProduct } from '@/types/inventory';

const THRESHOLD_OPTIONS = [1, 2, 3, 5, 10, 20, 50];

// ─────────────────────────────────────────────────────────
// Product row
// ─────────────────────────────────────────────────────────
interface RowProps {
  product: InventoryProduct;
  globalEnabled: boolean;
  globalThreshold: number;
  onStatusChange: (id: number, active: boolean) => void;
  onSaveThreshold: (id: number, value: number | null) => void;
  onPress: (id: number) => void;
}

function StockAlertRow({
  product, globalEnabled, globalThreshold,
  onStatusChange, onSaveThreshold, onPress,
}: RowProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const isProductActive = product.lowStockEnabled !== 0;
  const isCurrentlyLow  = computeProductLowStock(product, globalEnabled, globalThreshold);

  const [localValue, setLocalValue] = useState(
    product.lowStockThreshold !== null ? String(product.lowStockThreshold) : ''
  );

  const handleEndEditing = useCallback(() => {
    const trimmed = localValue.trim();
    if (!trimmed) { onSaveThreshold(product.id, null); return; }
    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onSaveThreshold(product.id, parsed);
    } else {
      setLocalValue(product.lowStockThreshold !== null ? String(product.lowStockThreshold) : '');
    }
  }, [localValue, product.id, product.lowStockThreshold, onSaveThreshold]);

  const handleClear = useCallback((e: any) => {
    e?.stopPropagation?.();
    setLocalValue('');
    onSaveThreshold(product.id, null);
  }, [product.id, onSaveThreshold]);

  const stopAndCall = (e: any, fn: () => void) => {
    e?.stopPropagation?.();
    fn();
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 4 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 260 }}
    >
      <TouchableOpacity
        style={[
          styles.row,
          { backgroundColor: colors.white },
          !isProductActive && { opacity: 0.6 },
        ]}
        onPress={() => onPress(product.id)}
        activeOpacity={0.82}
      >
        {/* ── Top line: name · qty · threshold ── */}
        <View style={styles.rowTop}>
          <Text style={[styles.rowName, { color: colors.black }]} numberOfLines={1}>
            {product.name}
          </Text>

          <View style={styles.rowTopRight}>
            {/* Qty badge */}
            <View style={[
              styles.qtyBadge,
              { backgroundColor: isCurrentlyLow ? '#FEF3C7' : '#DCFCE7' },
            ]}>
              <Text style={[
                styles.qtyText,
                { color: isCurrentlyLow ? '#92400E' : '#166534' },
              ]}>
                {product.quantity}
              </Text>
            </View>

            {/* Threshold override input */}
            <View style={styles.threshWrap}>
              <TextInput
                style={[
                  styles.threshInput,
                  {
                    borderColor: localValue.trim() ? '#FDE68A' : colors.gray200,
                    color: colors.black,
                    backgroundColor: colors.white,
                  },
                ]}
                value={localValue}
                onChangeText={setLocalValue}
                onEndEditing={handleEndEditing}
                keyboardType="number-pad"
                placeholder={String(globalThreshold)}
                placeholderTextColor={colors.gray300}
              />
              {localValue.trim().length > 0 && (
                <TouchableOpacity
                  onPress={handleClear}
                  style={[styles.clearBtn, { backgroundColor: colors.gray100 }]}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={10} color={colors.gray500} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ── Bottom line: category · Active/Disabled ── */}
        <View style={styles.rowBottom}>
          <View style={[styles.catChip, { backgroundColor: colors.softBlue }]}>
            <Text style={[styles.catText, { color: colors.primaryDark }]}>
              {product.category}
            </Text>
          </View>

          {/* Active / Disabled segmented control */}
          <View style={[styles.statusControl, { borderColor: colors.gray200 }]}>
            <TouchableOpacity
              onPress={(e) => stopAndCall(e, () => onStatusChange(product.id, true))}
              style={[
                styles.statusBtn,
                isProductActive && { backgroundColor: colors.primary },
              ]}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.statusBtnText,
                { color: isProductActive ? '#fff' : colors.gray500 },
              ]}>
                {t('inventory.productActive')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={(e) => stopAndCall(e, () => onStatusChange(product.id, false))}
              style={[
                styles.statusBtn,
                !isProductActive && { backgroundColor: colors.gray200 },
              ]}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.statusBtnText,
                { color: !isProductActive ? colors.gray600 : colors.gray400 },
              ]}>
                {t('inventory.productDisabled')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}

// ─────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────
export default function StockAlertsScreen() {
  const router   = useRouter();
  const { t }    = useTranslation();
  const { colors } = useAppTheme();

  const { products, editProduct } = useInventoryStore();
  const {
    globalLowStockEnabled,
    globalLowStockThreshold,
    setGlobalLowStockEnabled,
    setGlobalLowStockThreshold,
  } = useSettingsStore();

  const [search, setSearch] = useState('');

  const alertCount = useMemo(
    () => products.filter((p) =>
      computeProductLowStock(p, globalLowStockEnabled, globalLowStockThreshold)
    ).length,
    [products, globalLowStockEnabled, globalLowStockThreshold]
  );

  const filtered = useMemo(() => {
    let r = products.filter((p) => p.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((p) => p.name.toLowerCase().includes(q));
    }
    return r;
  }, [products, search]);

  const handleStatusChange = useCallback(async (id: number, active: boolean) => {
    await editProduct(id, { lowStockEnabled: active ? null : 0 });
  }, [editProduct]);

  const handleSaveThreshold = useCallback(async (id: number, value: number | null) => {
    await editProduct(id, { lowStockThreshold: value });
  }, [editProduct]);

  const handleProductPress = useCallback((id: number) => {
    router.push(`/(app)/inventory/${id}` as never);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('inventory.stockAlertsTitle')}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Global ON/OFF card ── */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 240 }}
        >
          <View style={[styles.globalCard, { backgroundColor: colors.white }]}>
            {/* Toggle row */}
            <View style={styles.globalRow}>
              <View style={styles.globalLeft}>
                <View style={[
                  styles.bellWrap,
                  { backgroundColor: globalLowStockEnabled ? '#FEF3C7' : colors.gray100 },
                ]}>
                  <Ionicons
                    name="notifications-outline"
                    size={16}
                    color={globalLowStockEnabled ? '#92400E' : colors.gray400}
                  />
                </View>
                <Text style={[styles.globalTitle, { color: colors.black }]}>
                  {t('inventory.inventoryAlerts')}
                </Text>
              </View>
              <Switch
                value={globalLowStockEnabled}
                onValueChange={setGlobalLowStockEnabled}
                trackColor={{ false: colors.gray200, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* Threshold chips — only when ON */}
            {globalLowStockEnabled && (
              <MotiView
                from={{ opacity: 0, translateY: -4 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 180 }}
              >
                <View style={[styles.thresholdSection, { borderTopColor: colors.gray100 }]}>
                  <Text style={[styles.thresholdLabel, { color: colors.gray500 }]}>
                    {t('inventory.globalAlertQuantity')}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chips}>
                      {THRESHOLD_OPTIONS.map((val) => (
                        <TouchableOpacity
                          key={val}
                          onPress={() => setGlobalLowStockThreshold(val)}
                          style={[
                            styles.chip,
                            { borderColor: colors.gray200 },
                            globalLowStockThreshold === val && {
                              backgroundColor: colors.primary,
                              borderColor: colors.primary,
                            },
                          ]}
                          activeOpacity={0.75}
                        >
                          <Text style={[
                            styles.chipText,
                            { color: globalLowStockThreshold === val ? '#fff' : colors.gray600 },
                          ]}>
                            {val}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </MotiView>
            )}
          </View>
        </MotiView>

        {/* ── Summary banner ── */}
        {globalLowStockEnabled && alertCount > 0 && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 200, delay: 60 }}
          >
            <View style={styles.summaryBanner}>
              <Ionicons name="warning-outline" size={13} color="#92400E" />
              <Text style={styles.summaryText}>
                {t('inventory.alertSummary', { count: alertCount })}
              </Text>
            </View>
          </MotiView>
        )}

        {/* ── Search + count (sticky) ── */}
        <View style={[styles.searchSection, { backgroundColor: colors.gray50 }]}>
          <View style={styles.searchRow}>
            <View style={[styles.searchWrap, { backgroundColor: colors.white, borderColor: colors.gray200 }]}>
              <Ionicons name="search" size={14} color={colors.gray400} />
              <TextInput
                style={[styles.searchInput, { color: colors.black }]}
                value={search}
                onChangeText={setSearch}
                placeholder={t('inventory.search')}
                placeholderTextColor={colors.gray400}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={14} color={colors.gray400} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.countLabel, { color: colors.gray400 }]}>
              {filtered.length} {t('inventory.products')}
            </Text>
          </View>
        </View>

        {/* ── Product list ── */}
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="checkmark-circle-outline" size={38} color={colors.gray300} />
            <Text style={[styles.emptyText, { color: colors.gray400 }]}>
              {t('inventory.noResults')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((product) => (
              <StockAlertRow
                key={product.id}
                product={product}
                globalEnabled={globalLowStockEnabled}
                globalThreshold={globalLowStockThreshold}
                onStatusChange={handleStatusChange}
                onSaveThreshold={handleSaveThreshold}
                onPress={handleProductPress}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Global card ──
  globalCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: Theme.radius.card,
    ...Theme.shadow.soft,
    overflow: 'hidden',
  },
  globalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  globalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bellWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globalTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  thresholdSection: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
  },
  thresholdLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chips: { flexDirection: 'row', gap: 7 },
  chip: {
    minWidth: 40,
    height: 32,
    borderRadius: Theme.radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chipText: { fontSize: 13, fontWeight: '700' },

  // ── Summary banner ──
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: Theme.radius.md,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  summaryText: { fontSize: 12, fontWeight: '600', color: '#92400E' },

  // ── Search (sticky) ──
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: Theme.radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 11,
    height: 38,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '500' },
  countLabel:  { fontSize: 11, fontWeight: '500', flexShrink: 0 },

  // ── Product rows ──
  list: { paddingHorizontal: 16, paddingTop: 6, gap: 8 },

  row: {
    borderRadius: Theme.radius.card,
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
    ...Theme.shadow.soft,
  },

  // Top line
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowName: { flex: 1, fontSize: 13, fontWeight: '700' },

  rowTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 0,
  },
  qtyBadge: {
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 3,
    minWidth: 36,
    alignItems: 'center',
  },
  qtyText: { fontSize: 13, fontWeight: '800' },

  threshWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  threshInput: {
    width: 46,
    height: 30,
    borderRadius: 7,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  clearBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom line
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  catChip: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  catText: { fontSize: 10, fontWeight: '600' },

  // Active / Disabled segmented
  statusControl: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: Theme.radius.full,
    overflow: 'hidden',
  },
  statusBtn: {
    paddingHorizontal: 13,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBtnText: { fontSize: 11, fontWeight: '700' },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 44, gap: 10 },
  emptyText: { fontSize: 13, fontWeight: '500' },
});
