import React, { useMemo } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { IdText } from '@/components/ui/IdText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useCartStore } from '@/store/cartStore';
import { applyKurdishFont } from '@/lib/settingsFont';
import { fmtIQD, fmtUSD } from '@/utils/formatters';
import { useResponsive } from '@/hooks/useResponsive';
import type { Product } from '@/types/sales';

interface PriceCheckModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onScanAnother: () => void;
}

export function PriceCheckModal({
  visible,
  product,
  onClose,
  onScanAnother,
}: PriceCheckModalProps) {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { isTablet, sheetMaxWidth } = useResponsive();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const exchangeRate = useSettingsStore((s) => s.exchangeRate) || 1310;
  const addItemToCart = useCartStore((s) => s.addItem);

  const profit = useMemo(() => {
    if (!product) return 0;
    return (product.sellingPrice || 0) - (product.purchasePrice || 0);
  }, [product]);

  const marginPct = useMemo(() => {
    if (!product || !product.purchasePrice || product.purchasePrice <= 0) return 0;
    return ((profit / product.purchasePrice) * 100);
  }, [product, profit]);

  const sellUSD = useMemo(() => {
    if (!product || !product.sellingPrice || exchangeRate <= 0) return 0;
    return product.sellingPrice / exchangeRate;
  }, [product, exchangeRate]);

  const buyUSD = useMemo(() => {
    if (!product || !product.purchasePrice || exchangeRate <= 0) return 0;
    return product.purchasePrice / exchangeRate;
  }, [product, exchangeRate]);

  if (!product) return null;

  const isLowStock = product.quantity > 0 && product.quantity <= 5;
  const isOutOfStock = product.quantity <= 0 || !product.isActive;
  const hasProfit = profit > 0;
  const hasLoss = profit < 0;

  const handleSellNow = () => {
    onClose();
    addItemToCart(product);
    router.push('/(app)/sales/new-sale' as never);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, isTablet && { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        {/* Backdrop touch to dismiss */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
            isTablet && {
              width: '100%',
              maxWidth: sheetMaxWidth,
              borderRadius: 24,
              borderBottomWidth: 1,
              maxHeight: '88%',
            },
          ]}
        >
          {/* Sheet Handle */}
          <View style={styles.handleWrap}>
            <View
              style={[
                styles.handle,
                { backgroundColor: isDark ? '#475569' : '#CBD5E1' },
              ]}
            />
          </View>

          {/* Header Row */}
          <View style={[styles.headerRow, { flexDirection }]}>
            <View style={[styles.headerTitleWrap, { flexDirection }]}>
              <View
                style={[
                  styles.headerIconCircle,
                  { backgroundColor: isDark ? 'rgba(212,175,55,0.18)' : '#FEF3C7' },
                ]}
              >
                <Ionicons name="pricetag" size={18} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.headerTitle,
                  { color: colors.black },
                  isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
                ]}
              >
                {isKuLanguage ? 'پشکنینی نرخی کاڵا' : 'Price Inspection'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? '#334155' : '#F1F5F9' },
              ]}
              hitSlop={10}
            >
              <Ionicons
                name="close"
                size={20}
                color={isDark ? '#94A3B8' : '#64748B'}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Product Header Card */}
            <View
              style={[
                styles.productHeaderCard,
                {
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              {/* Badges Row */}
              <View style={[styles.badgesRow, { flexDirection }]}>
                {/* Category Badge */}
                {product.category ? (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#EDF2F7',
                        borderColor: isDark ? '#334155' : '#CBD5E1',
                      },
                    ]}
                  >
                    <Ionicons
                      name="folder-outline"
                      size={12}
                      color={colors.primary}
                      style={{ marginEnd: 4 }}
                    />
                    <Text
                      style={[
                        styles.badgeText,
                        { color: isDark ? '#E2E8F0' : '#475569' },
                        isKuLanguage && applyKurdishFont(true, {}),
                      ]}
                    >
                      {product.category}
                    </Text>
                  </View>
                ) : null}

                {/* Barcode / Item ID */}
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#EDF2F7',
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                    },
                  ]}
                >
                  <Ionicons
                    name="barcode-outline"
                    size={13}
                    color={colors.primary}
                    style={{ marginEnd: 4 }}
                  />
                  <IdText size="small" style={{ color: colors.primary, fontWeight: '700' }}>
                    {product.itemId ? product.itemId : `#${product.id}`}
                  </IdText>
                </View>

                {/* Stock Status Badge */}
                <View
                  style={[
                    styles.badge,
                    isOutOfStock
                      ? {
                          backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2',
                          borderColor: '#EF4444',
                        }
                      : isLowStock
                      ? {
                          backgroundColor: isDark ? 'rgba(245,158,11,0.2)' : '#FEF3C7',
                          borderColor: '#F59E0B',
                        }
                      : {
                          backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#DCFCE7',
                          borderColor: '#10B981',
                        },
                  ]}
                >
                  <Ionicons
                    name={
                      isOutOfStock
                        ? 'close-circle'
                        : isLowStock
                        ? 'alert-circle'
                        : 'checkmark-circle'
                    }
                    size={12}
                    color={
                      isOutOfStock
                        ? '#EF4444'
                        : isLowStock
                        ? '#D97706'
                        : '#10B981'
                    }
                    style={{ marginEnd: 4 }}
                  />
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color: isOutOfStock
                          ? '#EF4444'
                          : isLowStock
                          ? '#D97706'
                          : '#10B981',
                        fontWeight: '700',
                      },
                      isKuLanguage && applyKurdishFont(true, {}),
                    ]}
                  >
                    {isOutOfStock
                      ? (isKuLanguage ? 'نەماوە لە کۆگا' : 'Out of Stock')
                      : isLowStock
                      ? (isKuLanguage
                          ? `${product.quantity} ${product.unit} (کەمی ماوە)`
                          : `${product.quantity} ${product.unit} (Low Stock)`)
                      : (isKuLanguage
                          ? `${product.quantity} ${product.unit} بەردەستە`
                          : `${product.quantity} ${product.unit} in stock`)}
                  </Text>
                </View>
              </View>

              {/* Product Name */}
              <Text
                style={[
                  styles.productName,
                  { color: colors.black, textAlign },
                  isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
                ]}
              >
                {product.name}
              </Text>

              {/* Description / Item Description note */}
              {(product.itemDescription || product.description) ? (
                <View
                  style={[
                    styles.descBox,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={14}
                    color={colors.gray400}
                    style={{ marginEnd: 6 }}
                  />
                  <Text
                    style={[
                      styles.descText,
                      { color: colors.gray500, textAlign },
                      isKuLanguage && applyKurdishFont(true, {}),
                    ]}
                    numberOfLines={2}
                  >
                    {product.itemDescription || product.description}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* ─── Price Comparison Hero ─── */}
            <View style={styles.pricesSection}>
              {/* Selling Price Box (Top Highlight) */}
              <LinearGradient
                colors={
                  isDark
                    ? ['#33270A', '#1F1A08']
                    : ['#FEFCE8', '#FEF08A']
                }
                style={[
                  styles.sellPriceCard,
                  { borderColor: colors.primary },
                ]}
              >
                <View style={[styles.priceCardHeader, { flexDirection }]}>
                  <View style={[styles.priceTagRow, { flexDirection }]}>
                    <View style={styles.goldIconWrap}>
                      <Ionicons name="pricetag" size={14} color="#FFFFFF" />
                    </View>
                    <Text
                      style={[
                        styles.priceCardLabel,
                        { color: isDark ? '#FDE047' : '#854D0E' },
                        isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
                      ]}
                    >
                      {isKuLanguage ? 'نرخی فرۆشتن' : 'Selling Price'}
                    </Text>
                  </View>
                  <View style={styles.sellPill}>
                    <Text
                      style={[
                        styles.sellPillText,
                        isKuLanguage && applyKurdishFont(true, {}),
                      ]}
                    >
                      {isKuLanguage ? 'نرخی ئێستا' : 'Retail'}
                    </Text>
                  </View>
                </View>

                {/* Big Selling Price Amount */}
                <View style={[styles.amountRow, { flexDirection }]}>
                  <AmountText
                    value={product.sellingPrice}
                    currency="IQD"
                    variant="hero"
                    style={{ color: isDark ? '#FACC15' : '#A16207', fontWeight: '800' }}
                  />
                </View>

                {/* USD Equivalent */}
                {sellUSD > 0 && (
                  <View style={[styles.usdRow, { flexDirection }]}>
                    <Text style={[styles.usdLabel, { color: isDark ? '#CA8A04' : '#854D0E' }]}>
                      ≈ ${fmtUSD(sellUSD)} USD
                    </Text>
                  </View>
                )}
              </LinearGradient>

              {/* Purchase Cost Box */}
              <View
                style={[
                  styles.buyPriceCard,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                  },
                ]}
              >
                <View style={[styles.priceCardHeader, { flexDirection }]}>
                  <View style={[styles.priceTagRow, { flexDirection }]}>
                    <View
                      style={[
                        styles.slateIconWrap,
                        { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                      ]}
                    >
                      <Ionicons
                        name="cart-outline"
                        size={14}
                        color={isDark ? '#94A3B8' : '#475569'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.priceCardLabel,
                        { color: isDark ? '#94A3B8' : '#475569' },
                        isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
                      ]}
                    >
                      {isKuLanguage ? 'نرخی کڕین (تێچوو)' : 'Purchase Cost'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.costSubtext,
                      { color: colors.gray400 },
                      isKuLanguage && applyKurdishFont(true, {}),
                    ]}
                  >
                    {isKuLanguage ? 'تێچووی کۆگا' : 'Cost'}
                  </Text>
                </View>

                {/* Purchase Cost Amount */}
                <View style={[styles.amountRow, { flexDirection }]}>
                  <AmountText
                    value={product.purchasePrice}
                    currency="IQD"
                    variant="large"
                    style={{ color: colors.black, fontWeight: '700' }}
                  />
                </View>

                {/* USD Equivalent */}
                {buyUSD > 0 && (
                  <View style={[styles.usdRow, { flexDirection }]}>
                    <Text style={[styles.usdLabel, { color: colors.gray400 }]}>
                      ≈ ${fmtUSD(buyUSD)} USD
                    </Text>
                  </View>
                )}
              </View>

              {/* Profit / Margin Badge Banner */}
              <View
                style={[
                  styles.profitBanner,
                  hasProfit
                    ? {
                        backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#DCFCE7',
                        borderColor: isDark ? '#059669' : '#86EFAC',
                      }
                    : hasLoss
                    ? {
                        backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2',
                        borderColor: isDark ? '#DC2626' : '#FCA5A5',
                      }
                    : {
                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                ]}
              >
                <View style={[styles.profitRow, { flexDirection }]}>
                  <View style={[styles.profitLeft, { flexDirection }]}>
                    <Ionicons
                      name={
                        hasProfit
                          ? 'trending-up'
                          : hasLoss
                          ? 'trending-down'
                          : 'remove-outline'
                      }
                      size={20}
                      color={
                        hasProfit
                          ? '#10B981'
                          : hasLoss
                          ? '#EF4444'
                          : colors.gray400
                      }
                      style={{ marginEnd: 6 }}
                    />
                    <Text
                      style={[
                        styles.profitLabel,
                        {
                          color: hasProfit
                            ? (isDark ? '#34D399' : '#15803D')
                            : hasLoss
                            ? (isDark ? '#F87171' : '#B91C1C')
                            : colors.gray500,
                        },
                        isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
                      ]}
                    >
                      {hasProfit
                        ? (isKuLanguage ? 'قازانج لە یەک دانە:' : 'Profit per unit:')
                        : hasLoss
                        ? (isKuLanguage ? 'زەرەر لە یەک دانە:' : 'Loss per unit:')
                        : (isKuLanguage ? 'بێ قازانج (یەکسان):' : 'Break-even:')}
                    </Text>
                  </View>

                  <View style={[styles.profitValueWrap, { flexDirection }]}>
                    <Text
                      style={[
                        styles.profitValueText,
                        {
                          color: hasProfit
                            ? (isDark ? '#34D399' : '#15803D')
                            : hasLoss
                            ? (isDark ? '#F87171' : '#B91C1C')
                            : colors.gray500,
                        },
                      ]}
                    >
                      {hasProfit ? '+' : ''}{fmtIQD(profit)} IQD
                    </Text>
                    {marginPct !== 0 && (
                      <View
                        style={[
                          styles.marginPill,
                          {
                            backgroundColor: hasProfit
                              ? (isDark ? 'rgba(52,211,153,0.25)' : '#BBF7D0')
                              : (isDark ? 'rgba(248,113,113,0.25)' : '#FECDD3'),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.marginPillText,
                            {
                              color: hasProfit
                                ? (isDark ? '#34D399' : '#166534')
                                : (isDark ? '#F87171' : '#991B1B'),
                            },
                          ]}
                        >
                          {hasProfit ? '+' : ''}{marginPct.toFixed(1)}%
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Financial Stock Summary Row */}
              <View
                style={[
                  styles.stockSummaryBox,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.stockSummaryCol}>
                  <Text
                    style={[
                      styles.stockSummaryLabel,
                      { color: colors.gray400 },
                      isKuLanguage && applyKurdishFont(true, {}),
                    ]}
                  >
                    {isKuLanguage ? 'بەهای کۆگا بە کڕین' : 'Inventory Cost'}
                  </Text>
                  <AmountText
                    value={product.quantity * product.purchasePrice}
                    currency="IQD"
                    variant="small"
                    style={{ color: colors.black, fontWeight: '700', marginTop: 2 }}
                  />
                </View>

                <View
                  style={[
                    styles.stockSummaryDivider,
                    { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                  ]}
                />

                <View style={styles.stockSummaryCol}>
                  <Text
                    style={[
                      styles.stockSummaryLabel,
                      { color: colors.gray400 },
                      isKuLanguage && applyKurdishFont(true, {}),
                    ]}
                  >
                    {isKuLanguage ? 'بەهای کۆگا بە فرۆشتن' : 'Retail Value'}
                  </Text>
                  <AmountText
                    value={product.quantity * product.sellingPrice}
                    currency="IQD"
                    variant="small"
                    style={{ color: colors.primary, fontWeight: '700', marginTop: 2 }}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* ─── Bottom Actions ─── */}
          <View
            style={[
              styles.bottomActions,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderTopColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            {/* Primary Action: Scan Another Item */}
            <TouchableOpacity
              onPress={() => {
                onClose();
                onScanAnother();
              }}
              activeOpacity={0.85}
              style={[
                styles.scanAnotherBtn,
                { backgroundColor: colors.primary },
                isTablet && { paddingVertical: 18, borderRadius: 16 },
              ]}
            >
              <Ionicons name="barcode-outline" size={isTablet ? 24 : 20} color="#FFFFFF" style={{ marginEnd: 8 }} />
              <Text
                style={[
                  styles.scanAnotherText,
                  isTablet && { fontSize: 17 },
                  isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
                ]}
              >
                {isKuLanguage ? 'سکانکردنی کاڵای تر' : 'Scan Another Product'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.secondaryButtonsRow, { flexDirection }]}>
              {/* Add to Sale / Sell Now */}
              <TouchableOpacity
                onPress={handleSellNow}
                activeOpacity={0.8}
                style={[
                  styles.sellBtn,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                  },
                  isTablet && { paddingVertical: 16, borderRadius: 14 },
                ]}
              >
                <Ionicons
                  name="cart-outline"
                  size={isTablet ? 22 : 18}
                  color={colors.primary}
                  style={{ marginEnd: 6 }}
                />
                <Text
                  style={[
                    styles.sellBtnText,
                    { color: colors.black },
                    isTablet && { fontSize: 15 },
                    isKuLanguage && applyKurdishFont(true, { fontWeight: '600' }),
                  ]}
                >
                  {isKuLanguage ? 'فرۆشتنی ئەم کاڵایە' : 'Sell This Item'}
                </Text>
              </TouchableOpacity>

              {/* Close Button */}
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                style={[
                  styles.doneBtn,
                  {
                    backgroundColor: isDark ? '#334155' : '#E2E8F0',
                  },
                  isTablet && { paddingVertical: 16, paddingHorizontal: 28, borderRadius: 14 },
                ]}
              >
                <Text
                  style={[
                    styles.doneBtnText,
                    { color: colors.gray600 },
                    isTablet && { fontSize: 15 },
                    isKuLanguage && applyKurdishFont(true, { fontWeight: '600' }),
                  ]}
                >
                  {isKuLanguage ? 'داخستن' : 'Close'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  productHeaderCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  badgesRow: {
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
  },
  productName: {
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 28,
  },
  descBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  descText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  pricesSection: {
    gap: 12,
  },
  sellPriceCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  buyPriceCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  priceCardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceTagRow: {
    alignItems: 'center',
    gap: 8,
  },
  goldIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slateIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceCardLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  sellPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#D4AF37',
  },
  sellPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  costSubtext: {
    fontSize: 11,
  },
  amountRow: {
    alignItems: 'baseline',
    marginTop: 2,
  },
  usdRow: {
    marginTop: 4,
  },
  usdLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  profitBanner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  profitRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profitLeft: {
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  profitValueWrap: {
    alignItems: 'center',
    gap: 8,
  },
  profitValueText: {
    fontSize: 15,
    fontWeight: '800',
  },
  marginPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  marginPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  stockSummaryBox: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  stockSummaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  stockSummaryDivider: {
    width: 1,
    marginVertical: 4,
  },
  stockSummaryLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  scanAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  scanAnotherText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonsRow: {
    alignItems: 'center',
    gap: 10,
  },
  sellBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sellBtnText: {
    fontSize: 13,
  },
  doneBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 13,
  },
});
