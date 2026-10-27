import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  createContext,
  useContext,
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
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { useInventoryStore } from '@/store/inventoryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { Theme, MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { computeProductLowStock } from '@/lib/lowStock';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import type { InventoryProduct } from '@/types/inventory';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import { toEnglishDigits } from '@/utils/formatters';
import i18n from '@/lib/i18n';

const THRESHOLD_OPTIONS = [1, 2, 3, 5, 10, 20, 50];

// ─────────────────────────────────────────────────────────
// Local keyboard-avoidance
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

type ProductOrFiller = InventoryProduct | { id: string; isFiller: true };

// ─────────────────────────────────────────────────────────
// Shared Props for Row & Grid Card
// ─────────────────────────────────────────────────────────
interface ProductCardProps {
  product: InventoryProduct;
  globalEnabled: boolean;
  globalThreshold: number;
  onStatusChange: (id: number, active: boolean) => void;
  onSaveThreshold: (id: number, value: number | null) => void;
  onPress: (id: number) => void;
}

// ─────────────────────────────────────────────────────────
// 1. StockAlertRow (درێژ / List Mode)
// ─────────────────────────────────────────────────────────
const StockAlertRow = React.memo(function StockAlertRow({
  product,
  globalEnabled,
  globalThreshold,
  onStatusChange,
  onSaveThreshold,
  onPress,
}: ProductCardProps) {
  const { colors, isDark } = useAppTheme();
  const scrollIntoView = useStockAlertsFocus();
  const { textAlign, flexDirection } = useRTL();
  const { isTablet } = useResponsive();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

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
        {
          backgroundColor: isDark ? colors.gray100 : colors.white,
          borderColor: isDark ? colors.gray200 : colors.gray200,
        },
        isTablet && styles.rowTablet,
        !isProductActive && { opacity: 0.6 },
      ]}
      onPress={() => onPress(product.id)}
      activeOpacity={0.82}
    >
      {/* ── Top line: name · qty · threshold ── */}
      <View style={[styles.rowTop, { flexDirection }]}>
        <Text
          style={[
            styles.rowName,
            isTablet && styles.rowNameTablet,
            { color: colors.black, textAlign },
            isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
          ]}
          numberOfLines={1}
        >
          {product.name}
        </Text>

        <View style={[styles.rowTopRight, { flexDirection, gap: isTablet ? 10 : 7 }]}>
          {/* Qty badge */}
          <View
            style={[
              styles.qtyBadge,
              isTablet && styles.qtyBadgeTablet,
              { backgroundColor: qtyTint.bg },
            ]}
          >
            <Text
              style={[
                styles.qtyText,
                isTablet && styles.qtyTextTablet,
                { color: qtyTint.text },
              ]}
            >
              {toEnglishDigits(product.quantity)}
            </Text>
          </View>

          {/* Threshold override input */}
          <View style={[styles.threshWrap, { flexDirection }]}>
            <TextInput
              style={[
                styles.threshInput,
                isTablet && styles.threshInputTablet,
                {
                  borderColor: localValue.trim() ? colors.warning : colors.gray200,
                  color: colors.black,
                  backgroundColor: isDark ? colors.gray200 : colors.white,
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
                style={[
                  styles.clearBtn,
                  isTablet && styles.clearBtnTablet,
                  { backgroundColor: isDark ? colors.gray300 : colors.gray100 },
                ]}
                hitSlop={8}
              >
                <Ionicons name="close" size={isTablet ? 12 : 10} color={colors.gray500} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ── Bottom line: category · Active/Disabled ── */}
      <View style={[styles.rowBottom, { flexDirection }]}>
        <View
          style={[
            styles.catChip,
            isTablet && styles.catChipTablet,
            { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : colors.softBlue },
          ]}
        >
          <Text
            style={[
              styles.catText,
              isTablet && styles.catTextTablet,
              { color: isDark ? '#38BDF8' : colors.primaryDark },
            ]}
          >
            {product.category}
          </Text>
        </View>

        {/* Active / Disabled segmented control */}
        <View
          style={[
            styles.statusControl,
            isTablet && styles.statusControlTablet,
            { borderColor: colors.gray200, flexDirection },
          ]}
        >
          <TouchableOpacity
            onPress={(e) => stopAndCall(e, () => onStatusChange(product.id, true))}
            style={[
              styles.statusBtn,
              isTablet && styles.statusBtnTablet,
              isProductActive && { backgroundColor: colors.primary },
            ]}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.statusBtnText,
                isTablet && styles.statusBtnTextTablet,
                { color: isProductActive ? colors.white : colors.gray500 },
                isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
              ]}
            >
              {i18n.t('inventory.productActive')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => stopAndCall(e, () => onStatusChange(product.id, false))}
            style={[
              styles.statusBtn,
              isTablet && styles.statusBtnTablet,
              !isProductActive && { backgroundColor: isDark ? colors.gray300 : colors.gray200 },
            ]}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.statusBtnText,
                isTablet && styles.statusBtnTextTablet,
                { color: !isProductActive ? (isDark ? colors.white : colors.gray700) : colors.gray400 },
                isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
              ]}
            >
              {i18n.t('inventory.productDisabled')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────────────────
// 2. StockAlertGridCard (چوارگۆشە / Grid Mode)
// ─────────────────────────────────────────────────────────
const StockAlertGridCard = React.memo(function StockAlertGridCard({
  product,
  globalEnabled,
  globalThreshold,
  onStatusChange,
  onSaveThreshold,
  onPress,
}: ProductCardProps) {
  const { colors, isDark } = useAppTheme();
  const scrollIntoView = useStockAlertsFocus();
  const { textAlign, flexDirection } = useRTL();
  const { isTablet } = useResponsive();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

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
        styles.gridCard,
        {
          backgroundColor: isDark ? colors.gray100 : colors.white,
          borderColor: isDark ? colors.gray200 : colors.gray200,
        },
        isTablet && styles.gridCardTablet,
        !isProductActive && { opacity: 0.6 },
      ]}
      onPress={() => onPress(product.id)}
      activeOpacity={0.82}
    >
      {/* ── Top row: Category Chip & Qty Badge ── */}
      <View style={[styles.gridCardHeader, { flexDirection }]}>
        <View
          style={[
            styles.catChip,
            isTablet && styles.catChipTablet,
            { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : colors.softBlue },
          ]}
        >
          <Text
            style={[
              styles.catText,
              isTablet && styles.catTextTablet,
              { color: isDark ? '#38BDF8' : colors.primaryDark },
            ]}
            numberOfLines={1}
          >
            {product.category}
          </Text>
        </View>

        <View
          style={[
            styles.qtyBadge,
            isTablet && styles.qtyBadgeTablet,
            { backgroundColor: qtyTint.bg },
          ]}
        >
          <Text
            style={[
              styles.qtyText,
              isTablet && styles.qtyTextTablet,
              { color: qtyTint.text },
            ]}
          >
            {toEnglishDigits(product.quantity)}
          </Text>
        </View>
      </View>

      {/* ── Middle: Product Name ── */}
      <Text
        style={[
          styles.gridCardTitle,
          isTablet && styles.gridCardTitleTablet,
          { color: colors.black, textAlign },
          isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
        ]}
        numberOfLines={2}
      >
        {product.name}
      </Text>

      {/* ── Threshold Row ── */}
      <View style={[styles.gridThreshRow, { flexDirection }]}>
        <Text
          style={[
            styles.gridThreshLabel,
            isTablet && styles.gridThreshLabelTablet,
            { color: colors.gray500, textAlign },
            isKuLanguage && applyKurdishFont(false, { fontWeight: '600' }),
          ]}
        >
          {isKuLanguage ? 'ئاگاداری لە:' : 'Alert at:'}
        </Text>
        <View style={[styles.threshWrap, { flexDirection }]}>
          <TextInput
            style={[
              styles.threshInput,
              isTablet && styles.threshInputTablet,
              {
                borderColor: localValue.trim() ? colors.warning : colors.gray200,
                color: colors.black,
                backgroundColor: isDark ? colors.gray200 : colors.white,
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
              style={[
                styles.clearBtn,
                isTablet && styles.clearBtnTablet,
                { backgroundColor: isDark ? colors.gray300 : colors.gray100 },
              ]}
              hitSlop={8}
            >
              <Ionicons name="close" size={isTablet ? 12 : 10} color={colors.gray500} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Bottom: Active / Disabled segmented control ── */}
      <View
        style={[
          styles.gridStatusControl,
          isTablet && styles.statusControlTablet,
          { borderColor: colors.gray200, flexDirection },
        ]}
      >
        <TouchableOpacity
          onPress={(e) => stopAndCall(e, () => onStatusChange(product.id, true))}
          style={[
            styles.statusBtn,
            isTablet && styles.statusBtnTablet,
            { flex: 1 },
            isProductActive && { backgroundColor: colors.primary },
          ]}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.statusBtnText,
              isTablet && styles.statusBtnTextTablet,
              { color: isProductActive ? colors.white : colors.gray500 },
              isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
            ]}
          >
            {i18n.t('inventory.productActive')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={(e) => stopAndCall(e, () => onStatusChange(product.id, false))}
          style={[
            styles.statusBtn,
            isTablet && styles.statusBtnTablet,
            { flex: 1 },
            !isProductActive && { backgroundColor: isDark ? colors.gray300 : colors.gray200 },
          ]}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.statusBtnText,
              isTablet && styles.statusBtnTextTablet,
              { color: !isProductActive ? (isDark ? colors.white : colors.gray700) : colors.gray400 },
              isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
            ]}
          >
            {i18n.t('inventory.productDisabled')}
          </Text>
        </TouchableOpacity>
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
  const {
    isTablet,
    isTabletLandscape,
    contentContainerStyle,
    contentMaxWidth,
  } = useResponsive();

  const { products, editProduct } = useInventoryStore();
  const {
    globalLowStockEnabled,
    globalLowStockThreshold,
    setGlobalLowStockEnabled,
    setGlobalLowStockThreshold,
    stockAlertsGridLayout,
    setStockAlertsGridLayout,
  } = useSettingsStore();

  const isGridView = stockAlertsGridLayout;

  const handleToggleViewMode = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    setStockAlertsGridLayout(!stockAlertsGridLayout);
  }, [stockAlertsGridLayout, setStockAlertsGridLayout]);

  // Custom Threshold Modal State
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customInputText, setCustomInputText] = useState(String(globalLowStockThreshold));

  const handleCustomStep = useCallback((delta: number) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    const current = parseInt(customInputText, 10) || 5;
    const nextVal = Math.max(1, Math.min(99999, current + delta));
    setCustomInputText(String(nextVal));
  }, [customInputText]);

  const handleCustomConfirm = useCallback(() => {
    const val = parseInt(customInputText, 10);
    if (!isNaN(val) && val >= 1) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
      setGlobalLowStockThreshold(val);
      setCustomModalVisible(false);
    }
  }, [customInputText, setGlobalLowStockThreshold]);

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

  const numColumns = useMemo(() => {
    if (isGridView) {
      return isTabletLandscape ? 4 : isTablet ? 3 : 2;
    }
    return isTablet ? (isTabletLandscape ? 2 : 1) : 1;
  }, [isGridView, isTablet, isTabletLandscape]);

  // Balance out incomplete rows in multi-column view with transparent fillers
  const gridFormattedProducts: ProductOrFiller[] = useMemo(() => {
    if (numColumns <= 1 || filtered.length === 0) {
      return filtered;
    }
    const remainder = filtered.length % numColumns;
    if (remainder === 0) return filtered;
    const needed = numColumns - remainder;
    const fillers: ProductOrFiller[] = Array.from({ length: needed }, (_, i) => ({
      id: `__grid_filler_${i}`,
      isFiller: true as const,
    }));
    return [...filtered, ...fillers];
  }, [filtered, numColumns]);

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
  const listRef = useRef<FlatList<any>>(null);
  const scrollOffsetY = useRef(0);
  const keyboardHeight = useRef(0);
  const focusedTarget = useRef<FocusedTarget | null>(null);

  const measureAndScroll = useCallback(() => {
    const target = focusedTarget.current;
    if (target == null || keyboardHeight.current <= 0) return;
    requestAnimationFrame(() => {
      if (focusedTarget.current !== target) return;
      target.measureInWindow((_x, y, width, height) => {
        if (height === 0 && width === 0 && y === 0) return;
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

  const keyExtractor = useCallback(
    (item: ProductOrFiller) => ('isFiller' in item && item.isFiller ? item.id : String(item.id)),
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ProductOrFiller; index: number }) => {
      if ('isFiller' in item && item.isFiller) {
        return (
          <View
            style={{
              flex: 1,
              margin: isTablet ? 6 : 4,
              backgroundColor: 'transparent',
            }}
            pointerEvents="none"
          />
        );
      }

      const product = item as InventoryProduct;

      return (
        <View
          style={[
            isGridView ? styles.gridWrap : styles.rowWrap,
            isTablet && (isGridView ? styles.gridWrapTablet : styles.rowWrapTablet),
            {
              flex: 1,
              marginTop: isGridView ? (isTablet ? 12 : 8) : (index === 0 ? 6 : 8),
            },
          ]}
        >
          <MotiView
            from={{ opacity: 0, translateY: 4 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: 'spring',
              damping: 22,
              stiffness: 260,
              delay: index < 12 ? index * 30 : 0,
            }}
            style={{ flex: 1 }}
          >
            {isGridView ? (
              <StockAlertGridCard
                product={product}
                globalEnabled={globalLowStockEnabled}
                globalThreshold={globalLowStockThreshold}
                onStatusChange={handleStatusChange}
                onSaveThreshold={handleSaveThreshold}
                onPress={handleProductPress}
              />
            ) : (
              <StockAlertRow
                product={product}
                globalEnabled={globalLowStockEnabled}
                globalThreshold={globalLowStockThreshold}
                onStatusChange={handleStatusChange}
                onSaveThreshold={handleSaveThreshold}
                onPress={handleProductPress}
              />
            )}
          </MotiView>
        </View>
      );
    },
    [
      isGridView,
      isTablet,
      globalLowStockEnabled,
      globalLowStockThreshold,
      handleStatusChange,
      handleSaveThreshold,
      handleProductPress,
    ]
  );

  const listHeader = useMemo(() => (
    <View style={[{ width: '100%' }, isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center' }]}>
      {/* ── Global ON/OFF card ── */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 240 }}
      >
        <View
          style={[
            styles.globalCard,
            isTablet && styles.globalCardTablet,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: isDark ? colors.gray200 : colors.gray200,
            },
          ]}
        >
          {/* Toggle row */}
          <View style={[styles.globalRow, isTablet && styles.globalRowTablet, { flexDirection }]}>
            <View style={[styles.globalLeft, isTablet && { gap: 14 }, { flexDirection }]}>
              <View
                style={[
                  styles.bellWrap,
                  isTablet && styles.bellWrapTablet,
                  { backgroundColor: globalLowStockEnabled ? bellTint.bg : (isDark ? colors.gray200 : colors.gray100) },
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={isTablet ? 22 : 16}
                  color={globalLowStockEnabled ? bellTint.text : colors.gray400}
                />
              </View>
              <Text
                style={[
                  styles.globalTitle,
                  isTablet && styles.globalTitleTablet,
                  { color: colors.black, textAlign },
                  isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
                ]}
              >
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
              <View
                style={[
                  styles.thresholdSection,
                  isTablet && styles.thresholdSectionTablet,
                  { borderTopColor: isDark ? colors.gray200 : colors.gray100 },
                ]}
              >
                <Text
                  style={[
                    styles.thresholdLabel,
                    isTablet && styles.thresholdLabelTablet,
                    { color: colors.gray500, textAlign, writingDirection },
                    isKuLanguage && applyKurdishFont(false, { fontWeight: '600' }),
                  ]}
                >
                  {t('inventory.globalAlertQuantity')}
                </Text>

                {/* RTL flipped ScrollView to guarantee right-to-left layout and right alignment */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
                  contentContainerStyle={[
                    styles.chipsScrollContent,
                    { flexDirection: 'row' },
                  ]}
                >
                  <View style={[styles.chips, isTablet && { gap: 10 }, { flexDirection: 'row' }]}>
                    {THRESHOLD_OPTIONS.map((val) => {
                      const isSelected = globalLowStockThreshold === val;
                      return (
                        <TouchableOpacity
                          key={val}
                          onPress={() => setGlobalLowStockThreshold(val)}
                          style={[
                            styles.chip,
                            isTablet && styles.chipTablet,
                            isRTL && { transform: [{ scaleX: -1 }] },
                            {
                              borderColor: isSelected ? colors.primary : colors.gray200,
                              backgroundColor: isSelected
                                ? colors.primary
                                : isDark ? colors.gray200 : colors.white,
                            },
                          ]}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              isTablet && styles.chipTextTablet,
                              { color: isSelected ? colors.white : colors.gray600 },
                              isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
                            ]}
                          >
                            {toEnglishDigits(val)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    {/* Custom Option Chip */}
                    {(() => {
                      const isCustom = !THRESHOLD_OPTIONS.includes(globalLowStockThreshold);
                      return (
                        <TouchableOpacity
                          onPress={() => {
                            setCustomInputText(String(globalLowStockThreshold));
                            setCustomModalVisible(true);
                          }}
                          style={[
                            styles.chip,
                            styles.customChip,
                            isTablet && styles.chipTablet,
                            isRTL && { transform: [{ scaleX: -1 }] },
                            {
                              borderColor: isCustom ? colors.primary : colors.gray200,
                              backgroundColor: isCustom
                                ? colors.primary
                                : isDark ? colors.gray200 : colors.white,
                            },
                          ]}
                          activeOpacity={0.75}
                        >
                          <Ionicons
                            name="create-outline"
                            size={isTablet ? 17 : 14}
                            color={isCustom ? colors.white : colors.gray600}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              isTablet && styles.chipTextTablet,
                              { color: isCustom ? colors.white : colors.gray600 },
                              isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
                            ]}
                          >
                            {isCustom
                              ? isKuLanguage
                                ? `تایبەت (${toEnglishDigits(globalLowStockThreshold)})`
                                : `Custom (${globalLowStockThreshold})`
                              : isKuLanguage
                                ? 'تایبەت...'
                                : 'Custom...'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })()}
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
          <View
            style={[
              styles.summaryBanner,
              isTablet && styles.summaryBannerTablet,
              { backgroundColor: bellTint.bg, flexDirection },
            ]}
          >
            <Ionicons name="warning-outline" size={isTablet ? 18 : 13} color={bellTint.text} />
            <Text
              style={[
                styles.summaryText,
                isTablet && styles.summaryTextTablet,
                { color: bellTint.text, textAlign, writingDirection },
                isKuLanguage && applyKurdishFont(true, { fontWeight: '600' }),
              ]}
            >
              {t('inventory.alertSummary', { count: alertCount })}
            </Text>
          </View>
        </MotiView>
      )}

      {/* ── Search Bar, Count & View Mode Toggle Row ── */}
      <View style={[styles.searchSection, isTablet && styles.searchSectionTablet]}>
        <View style={[styles.searchRow, { flexDirection, gap: isTablet ? 12 : 8 }]}>
          {/* Search Wrap */}
          <View
            style={[
              styles.searchWrap,
              isTablet && styles.searchWrapTablet,
              {
                backgroundColor: isDark ? colors.gray100 : colors.white,
                borderColor: isDark ? colors.gray200 : colors.gray200,
                flexDirection,
              },
            ]}
          >
            <Ionicons name="search" size={isTablet ? 18 : 14} color={colors.gray400} />
            <TextInput
              style={[
                styles.searchInput,
                isTablet && styles.searchInputTablet,
                { color: colors.black, textAlign, writingDirection },
                applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: search, placeholder: t('inventory.search') }), {}),
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
                <Ionicons name="close-circle" size={isTablet ? 18 : 14} color={colors.gray400} />
              </TouchableOpacity>
            )}
          </View>

          {/* Count Badge */}
          <View
            style={[
              styles.countBadge,
              isTablet && styles.countBadgeTablet,
              {
                backgroundColor: isDark ? colors.gray100 : colors.white,
                borderColor: isDark ? colors.gray200 : colors.gray200,
              },
            ]}
          >
            <Text
              style={[
                styles.countLabel,
                isTablet && styles.countLabelTablet,
                { color: colors.gray500, textAlign },
                isKuLanguage && applyKurdishFont(true, { fontWeight: '600' }),
              ]}
            >
              {toEnglishDigits(filtered.length)} {t('inventory.products')}
            </Text>
          </View>

          {/* View Mode Toggle Button (درێژ / چوارگۆشە) */}
          <TouchableOpacity
            style={[
              styles.viewToggleBtn,
              isTablet && styles.viewToggleBtnTablet,
              {
                backgroundColor: isDark ? colors.gray100 : colors.white,
                borderColor: isDark ? colors.gray200 : colors.gray200,
              },
            ]}
            onPress={handleToggleViewMode}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isGridView ? 'list-outline' : 'grid-outline'}
              size={isTablet ? 22 : 18}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), [
    isTablet,
    contentMaxWidth,
    isDark,
    colors,
    flexDirection,
    globalLowStockEnabled,
    bellTint,
    t,
    isKuLanguage,
    setGlobalLowStockEnabled,
    globalLowStockThreshold,
    setGlobalLowStockThreshold,
    alertCount,
    search,
    handleFocus,
    filtered.length,
    isGridView,
    handleToggleViewMode,
    textAlign,
    writingDirection,
    isRTL,
    setCustomInputText,
    setCustomModalVisible,
  ]);

  const listFooter = useMemo(() => (
    <>
      {filtered.length === 0 && (
        <View style={styles.emptyWrap}>
          <Ionicons name="checkmark-circle-outline" size={isTablet ? 48 : 38} color={colors.gray300} />
          <Text style={[styles.emptyText, isTablet && { fontSize: 16 }, { color: colors.gray400 }]}>
            {t('inventory.noResults')}
          </Text>
        </View>
      )}
      <View style={{ height: EXTRA_SCROLL_SPACE }} />
    </>
  ), [filtered.length, isTablet, colors.gray300, colors.gray400, t]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.gray50 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        title={t('inventory.stockAlertsTitle')}
        showBack
        onBack={() => router.back()}
        rightAction={
          <HeaderActionButton
            icon={isGridView ? 'list-outline' : 'grid-outline'}
            onPress={handleToggleViewMode}
          />
        }
      />

      <StockAlertsFocusContext.Provider value={handleFocus}>
        <FlatList
          ref={listRef}
          key={`stock-alerts-${isGridView ? 'grid' : 'list'}-${numColumns}-${isRTL ? 'rtl' : 'ltr'}`}
          data={gridFormattedProducts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={numColumns}
          columnWrapperStyle={
            numColumns > 1
              ? {
                  gap: isTablet ? 12 : 8,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  paddingHorizontal: isTablet ? (isTabletLandscape ? 24 : 18) : 16,
                  maxWidth: contentMaxWidth,
                  alignSelf: 'center',
                }
              : undefined
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          contentContainerStyle={[
            { paddingBottom: isTablet ? 120 : 60 },
            isTablet && contentContainerStyle,
          ]}
          removeClippedSubviews={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={11}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
        />
      </StockAlertsFocusContext.Provider>

      {/* ── Custom Threshold Modal ── */}
      <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalKeyboardWrap}
            >
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View
                  style={[
                    styles.customModalCard,
                    isTablet && styles.customModalCardTablet,
                    {
                      backgroundColor: isDark ? colors.gray100 : colors.white,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.gray200,
                    },
                  ]}
                >
                  {/* Modal Header */}
                  <View style={[styles.customModalHeader, { flexDirection }]}>
                    <View style={[styles.customModalTitleGroup, { flexDirection }]}>
                      <View style={[styles.customModalIconBadge, { backgroundColor: colors.primary + '22' }]}>
                        <Ionicons name="notifications" size={isTablet ? 24 : 20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text
                          style={[
                            styles.customModalTitle,
                            isTablet && { fontSize: 18 },
                            { color: colors.black, textAlign },
                            isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
                          ]}
                        >
                          {isKuLanguage ? 'دیاریکردنی ژمارەی ئاگادارکردنەوە' : 'Custom Alert Threshold'}
                        </Text>
                        <Text
                          style={[
                            styles.customModalSubtitle,
                            isTablet && { fontSize: 13 },
                            { color: colors.gray400, textAlign },
                            isKuLanguage && applyKurdishFont(false, { fontWeight: '500' }),
                          ]}
                        >
                          {isKuLanguage
                            ? 'کەمترین بڕی کاڵا بنووسە بۆ ئاگادارکردنەوەی کەمی کۆگا:'
                            : 'Enter minimum stock quantity to trigger low stock alert:'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => setCustomModalVisible(false)}
                      style={[styles.customModalCloseBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={isTablet ? 20 : 18} color={colors.gray600} />
                    </TouchableOpacity>
                  </View>

                  {/* Stepper + Big Numeric Input */}
                  <View
                    style={[
                      styles.customInputCard,
                      {
                        backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
                      },
                    ]}
                  >
                    <View style={[styles.stepperRow, { flexDirection }]}>
                      {/* Minus Button */}
                      <TouchableOpacity
                        onPress={() => handleCustomStep(-1)}
                        style={[
                          styles.stepBtn,
                          isTablet && styles.stepBtnTablet,
                          {
                            backgroundColor: isDark ? colors.gray100 : colors.white,
                            borderColor: isDark ? colors.gray300 : colors.gray200,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="remove" size={isTablet ? 24 : 20} color={colors.black} />
                      </TouchableOpacity>

                      {/* Number Input Box */}
                      <View style={styles.numberInputBox}>
                        <TextInput
                          value={toEnglishDigits(customInputText)}
                          onChangeText={(t) => setCustomInputText(toEnglishDigits(t).replace(/[^0-9]/g, ''))}
                          keyboardType="number-pad"
                          maxLength={5}
                          selectTextOnFocus
                          style={[
                            styles.numberInputText,
                            isTablet && { fontSize: 36 },
                            { color: colors.primary },
                            isKuLanguage && applyKurdishFont(true, { fontWeight: '800' }),
                          ]}
                        />
                        <Text
                          style={[
                            styles.unitLabel,
                            isTablet && { fontSize: 13 },
                            { color: colors.gray400 },
                            isKuLanguage && applyKurdishFont(false, { fontWeight: '500' }),
                          ]}
                        >
                          {isKuLanguage ? 'کەمترین بڕی کۆگا' : 'minimum stock'}
                        </Text>
                      </View>

                      {/* Plus Button */}
                      <TouchableOpacity
                        onPress={() => handleCustomStep(1)}
                        style={[
                          styles.stepBtn,
                          isTablet && styles.stepBtnTablet,
                          {
                            backgroundColor: isDark ? colors.gray100 : colors.white,
                            borderColor: isDark ? colors.gray300 : colors.gray200,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={isTablet ? 24 : 20} color={colors.black} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Quick Suggestions */}
                  <View style={styles.suggestionsSection}>
                    <Text
                      style={[
                        styles.suggestionsLabel,
                        isTablet && { fontSize: 13 },
                        { color: colors.gray400, textAlign },
                        isKuLanguage && applyKurdishFont(false, { fontWeight: '600' }),
                      ]}
                    >
                      {isKuLanguage ? 'پێشنیارە خێراکان:' : 'Quick suggestions:'}
                    </Text>
                    <View style={[styles.suggestionsRow, { flexDirection }]}>
                      {[15, 25, 30, 40, 100].map((sug) => (
                        <TouchableOpacity
                          key={sug}
                          onPress={() => {
                            try {
                              Haptics.selectionAsync().catch(() => {});
                            } catch {}
                            setCustomInputText(String(sug));
                          }}
                          style={[
                            styles.suggestionPill,
                            isTablet && styles.suggestionPillTablet,
                            {
                              backgroundColor: parseInt(customInputText, 10) === sug
                                ? colors.primary + '22'
                                : (isDark ? colors.gray200 : colors.white),
                              borderColor: parseInt(customInputText, 10) === sug
                                ? colors.primary
                                : colors.gray200,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.suggestionPillText,
                              isTablet && { fontSize: 14 },
                              {
                                color: parseInt(customInputText, 10) === sug ? colors.primary : colors.black,
                              },
                              isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
                            ]}
                          >
                            {toEnglishDigits(sug)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={[styles.modalActionsRow, { flexDirection, gap: isTablet ? 14 : 10 }]}>
                    <TouchableOpacity
                      onPress={handleCustomConfirm}
                      style={[
                        styles.modalSaveBtn,
                        isTablet && { height: 54 },
                        { backgroundColor: colors.primary },
                      ]}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.modalSaveBtnText,
                          isTablet && { fontSize: 16 },
                          { color: colors.white },
                          isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
                        ]}
                      >
                        {isKuLanguage ? 'پاشەکەوتکردن' : 'Save'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setCustomModalVisible(false)}
                      style={[
                        styles.modalCancelBtn,
                        isTablet && { height: 54 },
                        { borderColor: colors.gray200 },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modalCancelBtnText,
                          isTablet && { fontSize: 15 },
                          { color: colors.gray500 },
                          isKuLanguage && applyKurdishFont(false, { fontWeight: '600' }),
                        ]}
                      >
                        {isKuLanguage ? 'داخستن' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    borderWidth: 1.2,
    ...Theme.shadow.soft,
    overflow: 'hidden',
  },
  globalCardTablet: {
    margin: 20,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1.4,
  },
  globalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  globalRowTablet: {
    paddingHorizontal: 22,
    paddingVertical: 18,
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
  bellWrapTablet: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  globalTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  globalTitleTablet: {
    fontSize: 17,
  },
  thresholdSection: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
  },
  thresholdSectionTablet: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 12,
  },
  thresholdLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  thresholdLabelTablet: {
    fontSize: 13,
  },
  chipsScrollContent: {
    paddingVertical: 2,
    alignItems: 'center',
  },
  chips: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
  },
  chip: {
    minWidth: 40,
    height: 32,
    borderRadius: Theme.radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chipTablet: {
    minWidth: 54,
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
  chipTextTablet: { fontSize: 15.5 },
  customChip: {
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

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
  summaryBannerTablet: {
    marginHorizontal: 20,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 14,
    gap: 10,
    marginBottom: 6,
  },
  summaryText: { fontSize: 12, fontWeight: '600' },
  summaryTextTablet: { fontSize: 14.5 },

  // ── Search & Filter Section ──
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchSectionTablet: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Theme.radius.md,
    borderWidth: 1.2,
    paddingHorizontal: 12,
    height: 38,
  },
  searchWrapTablet: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.4,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '500' },
  searchInputTablet: { fontSize: 15.5 },

  countBadge: {
    height: 38,
    paddingHorizontal: 10,
    borderRadius: Theme.radius.md,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeTablet: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.4,
  },
  countLabel: { fontSize: 11, fontWeight: '600', flexShrink: 0 },
  countLabelTablet: { fontSize: 13 },

  viewToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: Theme.radius.md,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleBtnTablet: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.4,
  },

  // ── List Mode Row ──
  rowWrap: { paddingHorizontal: 16 },
  rowWrapTablet: { paddingHorizontal: 20 },

  row: {
    borderRadius: Theme.radius.card,
    borderWidth: 1.2,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 11,
    gap: 10,
    ...Theme.shadow.soft,
  },
  rowTablet: {
    borderRadius: 18,
    borderWidth: 1.4,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowName: { flex: 1, fontSize: 13.5, fontWeight: '700' },
  rowNameTablet: { fontSize: 16.5 },

  rowTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 0,
  },
  qtyBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadgeTablet: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    minWidth: 44,
  },
  qtyText: { fontSize: 13, fontWeight: '800' },
  qtyTextTablet: { fontSize: 15.5 },

  threshWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  threshInput: {
    width: 46,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  threshInputTablet: {
    width: 56,
    height: 38,
    borderRadius: 10,
    fontSize: 14.5,
  },
  clearBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnTablet: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },

  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  catChip: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  catChipTablet: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  catText: { fontSize: 11, fontWeight: '600' },
  catTextTablet: { fontSize: 12.5 },

  statusControl: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: Theme.radius.full,
    overflow: 'hidden',
  },
  statusControlTablet: {
    borderRadius: 24,
  },
  statusBtn: {
    paddingHorizontal: 13,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBtnTablet: {
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  statusBtnText: { fontSize: 11, fontWeight: '700' },
  statusBtnTextTablet: { fontSize: 13 },

  // ── Grid Mode Card (چوارگۆشە) ──
  gridWrap: {
    paddingHorizontal: 4,
  },
  gridWrapTablet: {
    paddingHorizontal: 4,
  },
  gridCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 13,
    gap: 10,
    ...Theme.shadow.soft,
    justifyContent: 'space-between',
  },
  gridCardTablet: {
    borderRadius: 20,
    borderWidth: 1.4,
    padding: 16,
    gap: 12,
  },
  gridCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    minHeight: 38,
    lineHeight: 20,
  },
  gridCardTitleTablet: {
    fontSize: 16.5,
    minHeight: 44,
    lineHeight: 24,
  },
  gridThreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingTop: 2,
  },
  gridThreshLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  gridThreshLabelTablet: {
    fontSize: 13,
  },
  gridStatusControl: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: Theme.radius.full,
    overflow: 'hidden',
    marginTop: 4,
  },

  // ── Empty ──
  emptyWrap: { alignItems: 'center', paddingTop: 44, gap: 10 },
  emptyText: { fontSize: 13, fontWeight: '500' },

  // ── Custom Threshold Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalKeyboardWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1.2,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    gap: 16,
  },
  customModalCardTablet: {
    maxWidth: 480,
    padding: 26,
    borderRadius: 28,
  },
  customModalHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  customModalTitleGroup: {
    flex: 1,
    gap: 12,
    alignItems: 'flex-start',
  },
  customModalIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customModalTitle: {
    fontSize: 16.5,
    fontWeight: '700',
  },
  customModalSubtitle: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 18,
  },
  customModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customInputCard: {
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 16,
    alignItems: 'center',
  },
  stepperRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 14,
  },
  stepBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnTablet: {
    width: 52,
    height: 52,
    borderRadius: 16,
  },
  numberInputBox: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  numberInputText: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    padding: 0,
    margin: 0,
    minWidth: 80,
  },
  unitLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  suggestionsSection: {
    gap: 8,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionsRow: {
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  suggestionPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.2,
  },
  suggestionPillTablet: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 24,
  },
  suggestionPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalActionsRow: {
    marginTop: 6,
    gap: 10,
  },
  modalSaveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalCancelBtn: {
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
