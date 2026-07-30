import React, {
  useState, useMemo, useCallback, useRef, useEffect, createContext, useContext,
} from 'react';
import {
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  TextInputProps,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import { getStatusTint } from '@/constants/statusTints';
import { Theme } from '@/constants/theme';
import { computeProductLowStock } from '@/lib/lowStock';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import type { InventoryProduct } from '@/types/inventory';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish } from '@/lib/settingsFont';
import i18n from '@/lib/i18n';

const THRESHOLD_OPTIONS = [1, 2, 3, 5, 10, 20, 50];

// ─────────────────────────────────────────────────────────
// Local keyboard-avoidance (mirrors components/common/KeyboardAwareScrollView's
// focus contract, but targets a FlatList via scrollToOffset instead of a
// ScrollView's scrollTo — kept file-local since this screen's rows are
// virtualized, unlike that shared wrapper's plain-ScrollView children model).
// ─────────────────────────────────────────────────────────
type FocusHandler = NonNullable<TextInputProps['onFocus']>;
type FocusedTarget = Parameters<FocusHandler>[0]['target'];

const StockAlertsFocusContext = createContext<FocusHandler | null>(null);

function useStockAlertsFocus(): FocusHandler {
  const notify = useContext(StockAlertsFocusContext);
  return useCallback<FocusHandler>((e) => { notify?.(e); }, [notify]);
}

const EXTRA_SPACE_ABOVE_KEYBOARD = 16;
const EXTRA_SCROLL_SPACE = 80;

// ─────────────────────────────────────────────────────────
// List item shape (search bar is item 0, virtualized alongside rows so it
// can be targeted precisely via stickyHeaderIndices)
// ─────────────────────────────────────────────────────────
type ListItem =
  | { kind: 'search' }
  | { kind: 'row'; product: InventoryProduct };

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

const StockAlertRow = React.memo(function StockAlertRow({
  product, globalEnabled, globalThreshold,
  onStatusChange, onSaveThreshold, onPress,
}: RowProps) {
  const { colors, isDark } = useAppTheme();
  const scrollIntoView = useStockAlertsFocus();
  const { textAlign, flexDirection } = useRTL();

  const isProductActive = product.lowStockEnabled !== 0;
  const isCurrentlyLow  = computeProductLowStock(product, globalEnabled, globalThreshold);
  const qtyTint = getStatusTint(isCurrentlyLow ? 'warning' : 'success', colors, isDark);

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
      <View style={[styles.rowTop, { flexDirection }]}>
        <Text style={[styles.rowName, { color: colors.black, textAlign }]} numberOfLines={1}>
          {product.name}
        </Text>

        <View style={[styles.rowTopRight, { flexDirection }]}>
          {/* Qty badge */}
          <View style={[
            styles.qtyBadge,
            { backgroundColor: qtyTint.bg },
          ]}>
            <Text style={[
              styles.qtyText,
              { color: qtyTint.text },
            ]}>
              {product.quantity}
            </Text>
          </View>

          {/* Threshold override input */}
          <View style={[styles.threshWrap, { flexDirection }]}>
            <TextInput
              style={[
                styles.threshInput,
                {
                  borderColor: localValue.trim() ? colors.warning : colors.gray200,
                  color: colors.black,
                  backgroundColor: colors.white,
                },
              ]}
              value={localValue}
              onChangeText={setLocalValue}
              onEndEditing={handleEndEditing}
              onFocus={scrollIntoView}
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
      <View style={[styles.rowBottom, { flexDirection }]}>
        <View style={[styles.catChip, { backgroundColor: colors.softBlue }]}>
          <Text style={[styles.catText, { color: colors.primaryDark }]}>
            {product.category}
          </Text>
        </View>

        {/* Active / Disabled segmented control */}
        <View style={[styles.statusControl, { borderColor: colors.gray200, flexDirection }]}>
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
              { color: isProductActive ? colors.white : colors.gray500 },
            ]}>
              {i18n.t('inventory.productActive')}
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
              {i18n.t('inventory.productDisabled')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────
export default function StockAlertsScreen() {
  const router   = useRouter();
  const { t }    = useTranslation();
  const { colors, isDark } = useAppTheme();
  const bellTint = getStatusTint('warning', colors, isDark);
  const { isRTL, textAlign, writingDirection, flexDirection } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

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

  // ── Keyboard-aware scrolling (search box + every row's threshold input) ──
  const listRef = useRef<FlatList<ListItem>>(null);
  const scrollOffsetY = useRef(0);
  const keyboardHeight = useRef(0);
  const focusedTarget = useRef<FocusedTarget | null>(null);

  const measureAndScroll = useCallback(() => {
    const target = focusedTarget.current;
    if (target == null || keyboardHeight.current <= 0) return;
    requestAnimationFrame(() => {
      if (focusedTarget.current !== target) return;
      target.measureInWindow((_x, y, width, height) => {
        if (height === 0 && width === 0 && y === 0) return; // measurement failed
        const screenHeight = Dimensions.get('window').height;
        const visibleBottom = screenHeight - keyboardHeight.current;
        const overlap = y + height - visibleBottom + EXTRA_SPACE_ABOVE_KEYBOARD;
        if (overlap > 0) {
          listRef.current?.scrollToOffset({
            offset: Math.max(0, scrollOffsetY.current + overlap),
            animated: true,
          });
        }
      });
    });
  }, []);

  const handleFocus = useCallback<FocusHandler>((e) => {
    focusedTarget.current = e.target;
    measureAndScroll();
  }, [measureAndScroll]);

  useEffect(() => {
    const onShow = (e: { endCoordinates?: { height: number } }) => {
      keyboardHeight.current = e.endCoordinates?.height ?? 0;
      measureAndScroll();
    };
    const onHide = () => { keyboardHeight.current = 0; };
    const subs = [
      Keyboard.addListener('keyboardWillShow', onShow),
      Keyboard.addListener('keyboardDidShow', onShow),
      Keyboard.addListener('keyboardWillHide', onHide),
      Keyboard.addListener('keyboardDidHide', onHide),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [measureAndScroll]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetY.current = e.nativeEvent.contentOffset.y;
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // ── Virtualized list data: the sticky search bar is item 0 ──
  const listData = useMemo<ListItem[]>(
    () => [{ kind: 'search' }, ...filtered.map((product) => ({ kind: 'row' as const, product }))],
    [filtered]
  );

  const keyExtractor = useCallback(
    (item: ListItem) => (item.kind === 'search' ? 'search' : String(item.product.id)),
    []
  );

  const renderItem = useCallback(({ item, index }: { item: ListItem; index: number }) => {
    if (item.kind === 'search') {
      return (
        <View style={[styles.searchSection, { backgroundColor: colors.gray50 }]}>
          <View style={[styles.searchRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 10 }]}>
            <View style={[styles.searchWrap, { backgroundColor: colors.white, borderColor: colors.gray200, flexDirection }]}>
              <Ionicons name="search" size={14} color={colors.gray400} />
              <TextInput
                style={[
                  styles.searchInput,
                  { color: colors.black, textAlign, writingDirection },
                  isKuLanguage && applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: search }), {}),
                ]}
                value={search}
                onChangeText={setSearch}
                onFocus={handleFocus}
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
            <Text style={[styles.countLabel, { color: colors.gray400, textAlign }]}>
              {filtered.length} {t('inventory.products')}
            </Text>
          </View>
        </View>
      );
    }

    const productIndex = index - 1;
    return (
      <View style={[styles.rowWrap, { marginTop: productIndex === 0 ? 6 : 8 }]}>
        <MotiView
          from={{ opacity: 0, translateY: 4 }}
          animate={{ opacity: 1, translateY: 0 }}
          // Stagger only the first screenful — rows that scroll into view later
          // (or reappear after an unrelated re-render) shouldn't replay a fade-in.
          transition={{ type: 'spring', damping: 22, stiffness: 260, delay: productIndex < 10 ? productIndex * 35 : 0 }}
        >
          <StockAlertRow
            product={item.product}
            globalEnabled={globalLowStockEnabled}
            globalThreshold={globalLowStockThreshold}
            onStatusChange={handleStatusChange}
            onSaveThreshold={handleSaveThreshold}
            onPress={handleProductPress}
          />
        </MotiView>
      </View>
    );
  }, [
    colors, flexDirection, isRTL, textAlign, writingDirection, isKuLanguage,
    search, handleFocus, t, filtered.length,
    globalLowStockEnabled, globalLowStockThreshold,
    handleStatusChange, handleSaveThreshold, handleProductPress,
  ]);

  const listFooter = useMemo(() => (
    <>
      {filtered.length === 0 && (
        <View style={styles.emptyWrap}>
          <Ionicons name="checkmark-circle-outline" size={38} color={colors.gray300} />
          <Text style={[styles.emptyText, { color: colors.gray400 }]}>
            {t('inventory.noResults')}
          </Text>
        </View>
      )}
      <View style={{ height: EXTRA_SCROLL_SPACE }} />
    </>
  ), [filtered.length, colors.gray300, colors.gray400, t]);

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.gray50 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader
        title={t('inventory.stockAlertsTitle')}
        showBack
        onBack={() => router.back()}
      />

      <StockAlertsFocusContext.Provider value={handleFocus}>
        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          stickyHeaderIndices={[1]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          contentContainerStyle={{ paddingBottom: 40 }}
          removeClippedSubviews
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={11}
          ListHeaderComponent={
            <>
              {/* ── Global ON/OFF card ── */}
              <MotiView
                from={{ opacity: 0, translateY: 8 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 240 }}
              >
                <View style={[styles.globalCard, { backgroundColor: colors.white }]}>
                  {/* Toggle row */}
                  <View style={[styles.globalRow, { flexDirection }]}>
                    <View style={[styles.globalLeft, { flexDirection }]}>
                      <View style={[
                        styles.bellWrap,
                        { backgroundColor: globalLowStockEnabled ? bellTint.bg : colors.gray100 },
                      ]}>
                        <Ionicons
                          name="notifications-outline"
                          size={16}
                          color={globalLowStockEnabled ? bellTint.text : colors.gray400}
                        />
                      </View>
                      <Text style={[styles.globalTitle, { color: colors.black, textAlign }]}>
                        {t('inventory.inventoryAlerts')}
                      </Text>
                    </View>
                    <Switch
                      value={globalLowStockEnabled}
                      onValueChange={setGlobalLowStockEnabled}
                      trackColor={{ false: colors.gray200, true: colors.primary }}
                      thumbColor={colors.white}
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
                        <Text style={[styles.thresholdLabel, { color: colors.gray500, textAlign, writingDirection }]}>
                          {t('inventory.globalAlertQuantity')}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={[styles.chips, { flexDirection }]}>
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
                                  { color: globalLowStockThreshold === val ? colors.white : colors.gray600 },
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
                  <View style={[styles.summaryBanner, { backgroundColor: bellTint.bg, flexDirection }]}>
                    <Ionicons name="warning-outline" size={13} color={bellTint.text} />
                    <Text style={[styles.summaryText, { color: bellTint.text, textAlign, writingDirection }]}>
                      {t('inventory.alertSummary', { count: alertCount })}
                    </Text>
                  </View>
                </MotiView>
              )}
            </>
          }
          ListFooterComponent={listFooter}
        />
      </StockAlertsFocusContext.Provider>
    </KeyboardAvoidingView>
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
    borderRadius: Theme.radius.md,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  summaryText: { fontSize: 12, fontWeight: '600' },

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
  rowWrap: { paddingHorizontal: 16 },

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
