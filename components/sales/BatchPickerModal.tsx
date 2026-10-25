import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { Ionicons } from '@expo/vector-icons';
import { AppSheet, AppSheetHeader } from '@/components/ui/AppSheet';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';
import * as Haptics from 'expo-haptics';
import type { ProductBatch } from '@/types/sales';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  visible: boolean;
  onClose: () => void;
  batches: ProductBatch[];
  selectedBatchNum?: number | null;
  onSelectBatch: (batch: ProductBatch) => void;
  productName: string;
  availableStock?: number;
  unit?: string;
}

export function BatchPickerModal({
  visible,
  onClose,
  batches,
  selectedBatchNum,
  onSelectBatch,
  productName,
  availableStock,
  unit,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();

  const isTablet =
    Platform.OS === 'ios'
      ? Boolean(Platform.isPad) || screenWidth >= 700
      : screenWidth >= 640;

  // State to toggle the FIFO details card (hidden by default)
  const [showInfo, setShowInfo] = useState(false);

  // Filter to only batches that currently have stock in the warehouse
  const activeBatches = (batches || []).filter((b) => (b.quantity ?? 0) > 0);

  // Default is batchNum of the first item (oldest or closest expiry)
  const currentSelectedNum = selectedBatchNum ?? (activeBatches.length > 0 ? activeBatches[0].batchNum : 1);

  const toggleInfo = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowInfo((prev) => !prev);
  };

  const handleSelect = (batch: ProductBatch) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
    onSelectBatch(batch);
    onClose();
  };

  const dynamicMaxHeight = isTablet
    ? Math.min(screenHeight * 0.6, 520)
    : Math.min(screenHeight * 0.52, 420);

  return (
    <AppSheet visible={visible} onClose={onClose}>
      <AppSheetHeader
        title={isKuLanguage ? 'دیاریکردنی وەجبەی فرۆشتن' : 'Select Sale Batch'}
        onClose={onClose}
      />

      {/* Subheader: Product Info & Interactive FIFO Info Button */}
      <View
        style={[
          styles.subHeaderRow,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.subHeaderText, { color: colors.gray500, textAlign }]} numberOfLines={1}>
            {productName}
            {availableStock !== undefined
              ? ` · ${isKuLanguage ? 'بەردەست' : 'Stock'}: ${availableStock} ${unit || (isKuLanguage ? 'دانە' : 'pcs')}`
              : ''}
          </Text>
        </View>

        {/* Info Icon Button (Opens FIFO explanation on tap) */}
        <TouchableOpacity
          onPress={toggleInfo}
          style={[
            styles.infoTriggerBtn,
            {
              backgroundColor: showInfo
                ? (isDark ? hexToRgba(colors.primary, 0.22) : '#FEF3C7')
                : (isDark ? hexToRgba(colors.primary, 0.1) : '#F1F5F9'),
              borderColor: showInfo
                ? colors.primary
                : (isDark ? hexToRgba(colors.primary, 0.25) : '#E2E8F0'),
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showInfo ? 'information-circle' : 'information-circle-outline'}
            size={16}
            color={isDark ? colors.primary : '#B45309'}
          />
          <Text
            style={[
              styles.infoTriggerLabel,
              { color: isDark ? colors.primary : '#92400E' },
            ]}
          >
            {isKuLanguage ? 'ڕێنمایی' : 'Info'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Short helpful note */}
      <View
        style={[
          styles.noticeBox,
          {
            backgroundColor: isDark ? hexToRgba(colors.primary, 0.08) : '#FFFBEB',
            borderColor: isDark ? hexToRgba(colors.primary, 0.25) : '#FDE68A',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <Ionicons name="sparkles" size={13} color={isDark ? colors.primary : '#D97706'} />
        <Text
          style={[
            styles.noticeText,
            { color: isDark ? colors.gray300 : '#92400E', textAlign },
          ]}
        >
          {isKuLanguage
            ? 'وەجبەی سەرەکی بەپێی نزیکترین بەرواری بەسەرچوون دیاری کراوە، دەتوانیت هەر وەجبەیەکی تر هەڵبژێریت.'
            : 'Primary batch is ordered by closest expiry date; you can freely select any batch.'}
        </Text>
      </View>

      {/* Expandable Details Card (Revealed only when info icon is tapped) */}
      {showInfo && (
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: isDark ? hexToRgba(colors.primary, 0.08) : '#FFFDF5',
              borderColor: isDark ? hexToRgba(colors.primary, 0.3) : '#FDE68A',
            },
          ]}
        >
          <View style={[styles.infoCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Ionicons name="sparkles" size={15} color={colors.primary} />
              <Text
                style={[
                  styles.infoCardTitle,
                  { color: isDark ? colors.primary : '#92400E', textAlign },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKuLanguage ? 'ڕێبەری وەجبەی فرۆشتن' : 'Batch Sales Guide'}
              </Text>
            </View>
            <TouchableOpacity onPress={toggleInfo} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close-circle" size={18} color={colors.gray400} />
            </TouchableOpacity>
          </View>

          <View style={styles.infoCardBody}>
            <View style={[styles.infoPointRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.infoIconEmoji}>📦</Text>
              <Text style={[styles.infoPointDesc, { color: isDark ? colors.gray300 : '#78350F', textAlign }]}>
                {isKuLanguage
                  ? 'وەجبەی سەرەکی بەپێی نزیکترین بەرواری بەسەرچوون (یان کۆنترین کڕین) دیاری دەکرێت بۆ پاراستنی کاڵاکان لە بەسەرچوون.'
                  : 'Primary batch is prioritized by closest expiry date (or oldest purchase) to prevent product expiration.'}
              </Text>
            </View>

            <View style={[styles.infoPointRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.infoIconEmoji}>💰</Text>
              <Text style={[styles.infoPointDesc, { color: isDark ? colors.gray300 : '#78350F', textAlign }]}>
                {isKuLanguage
                  ? 'قازانجی فرۆشتن بەپێی نرخی کڕینی ڕاستەقینەی ئەو وەجبەیە دیاری دەکرێت کە هەڵیدەبژێریت.'
                  : 'Profit is accurately calculated from the true purchase cost of the chosen batch.'}
              </Text>
            </View>

            <View style={[styles.infoPointRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.infoIconEmoji}>🔄</Text>
              <Text style={[styles.infoPointDesc, { color: isDark ? colors.gray300 : '#78350F', textAlign }]}>
                {isKuLanguage
                  ? 'ئازادیت لە هەڵبژاردنی هەر وەجبەیەکی تر بەپێی خواستی خۆت یان داواکاریی کڕیار.'
                  : 'You have full freedom to choose any other batch as requested or preferred.'}
              </Text>
            </View>

            <View style={[styles.infoPointRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.infoIconEmoji}>📉</Text>
              <Text style={[styles.infoPointDesc, { color: isDark ? colors.gray300 : '#78350F', textAlign }]}>
                {isKuLanguage
                  ? 'بڕی فرۆشراو تەنیا لە مەخزەنی ئەو وەجبەیە دەردەکرێت کە دیاری دەکرێت.'
                  : 'Sold quantity is deducted exclusively from the selected batch.'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={toggleInfo}
            style={[
              styles.infoCardDismissBtn,
              {
                backgroundColor: isDark ? hexToRgba(colors.primary, 0.2) : '#FEF3C7',
                borderColor: isDark ? hexToRgba(colors.primary, 0.4) : '#FDE68A',
              },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.infoCardDismissText,
                { color: isDark ? colors.primary : '#92400E' },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKuLanguage ? 'تێگەیشتم' : 'Got it'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Batch Cards List */}
      <ScrollView
        style={[styles.list, { maxHeight: dynamicMaxHeight }]}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {activeBatches.map((batch) => {
          const isSelected = batch.batchNum === currentSelectedNum;
          return (
            <TouchableOpacity
              key={`${batch.batchNum}_${batch.purchaseId || '0'}`}
              style={[
                styles.batchCard,
                {
                  backgroundColor: isSelected
                    ? isDark ? hexToRgba(colors.primary, 0.12) : '#FFFBEB'
                    : isDark ? colors.gray100 : '#FFFFFF',
                  borderColor: isSelected
                    ? colors.primary
                    : isDark ? colors.gray200 : '#E2E8F0',
                },
              ]}
              onPress={() => handleSelect(batch)}
              activeOpacity={0.8}
            >
              {/* Top Row: Responsive Layout with No Overlap */}
              <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {/* Left side: Batch # & FIFO Badge */}
                <View style={[styles.cardTopStart, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View
                    style={[
                      styles.batchBadge,
                      {
                        backgroundColor: isSelected ? colors.primary : (isDark ? colors.gray300 : '#94A3B8'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.batchBadgeText,
                        { color: colors.white },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {isKuLanguage ? `وەجبە ${batch.batchNum}` : `#${batch.batchNum}`}
                    </Text>
                  </View>

                  {batch.isOldest && (
                    <View
                      style={[
                        styles.oldestTag,
                        {
                          backgroundColor: isDark ? 'rgba(16,185,129,0.18)' : '#DCFCE7',
                          borderColor: isDark ? 'rgba(16,185,129,0.35)' : '#86EFAC',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                    >
                      <Ionicons name="sparkles" size={10} color={colors.success} style={{ marginHorizontal: 2 }} />
                      <Text style={[styles.oldestTagText, { color: colors.success }]}>
                        {isKuLanguage ? 'سەرەکی' : 'Primary'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Right side: Purchase Date & Radio Indicator */}
                <View style={[styles.cardTopEnd, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {Boolean(batch.date) && (
                    <View style={[styles.dateWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons name="calendar-outline" size={11} color={colors.gray400} />
                      <DateText
                        value={batch.date}
                        size="small"
                        style={[styles.dateText, { color: colors.gray500 }]}
                        numberOfLines={1}
                      />
                    </View>
                  )}

                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? colors.primary : colors.gray300,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                  </View>
                </View>
              </View>

              {/* Metrics Row: Buy Price, Sell Price, Stock Qty */}
              <View style={[styles.metricsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {/* Buy Cost */}
                <View
                  style={[
                    styles.metricCell,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                    },
                  ]}
                >
                  <Text style={[styles.metricLabel, { color: colors.gray400 }]}>
                    {isKuLanguage ? 'کڕین' : 'Cost'}
                  </Text>
                  <AmountText
                    value={batch.buyPriceIQD}
                    currency="IQD"
                    style={[styles.metricValue, { color: colors.black }]}
                  />
                </View>

                {/* Sell Price */}
                <View
                  style={[
                    styles.metricCell,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                    },
                  ]}
                >
                  <Text style={[styles.metricLabel, { color: colors.gray400 }]}>
                    {isKuLanguage ? 'فرۆشتن' : 'Price'}
                  </Text>
                  <AmountText
                    value={batch.sellPriceIQD}
                    currency="IQD"
                    style={[styles.metricValue, { color: colors.black }]}
                  />
                </View>

                {/* Available Quantity */}
                <View
                  style={[
                    styles.metricCell,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                    },
                  ]}
                >
                  <Text style={[styles.metricLabel, { color: colors.gray400 }]}>
                    {isKuLanguage ? 'بەردەست' : 'Stock'}
                  </Text>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    <Text style={[styles.metricValue, { color: colors.primary }]}>
                      {batch.quantity}
                    </Text>
                    <Text style={[styles.metricUnitText, { color: colors.gray400 }]}>
                      {unit || (isKuLanguage ? 'دانە' : 'pcs')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Extra Details: Supplier and/or Expiry Date */}
              {(batch.supplierName || batch.expiryDate) && (
                <View style={[styles.extraRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {batch.supplierName && (
                    <View style={[styles.extraItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons name="business-outline" size={11} color={colors.gray400} />
                      <Text style={[styles.extraText, { color: colors.gray500 }]} numberOfLines={1}>
                        {batch.supplierName}
                      </Text>
                    </View>
                  )}
                  {batch.expiryDate && (
                    <View style={[styles.extraItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons name="time-outline" size={11} color={colors.warning} />
                      <Text style={[styles.extraText, { color: colors.warning }]}>
                        {isKuLanguage ? `بەسەرچوون: ${batch.expiryDate}` : `Exp: ${batch.expiryDate}`}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  subHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: -4,
    gap: 8,
  },
  subHeaderText: {
    fontSize: 12.5,
  },
  noticeBox: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  noticeText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  infoTriggerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  infoTriggerLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
  },
  infoCardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  infoCardBody: {
    gap: 6,
  },
  infoPointRow: {
    alignItems: 'flex-start',
    gap: 6,
  },
  infoIconEmoji: {
    fontSize: 12,
    lineHeight: 16,
  },
  infoPointDesc: {
    fontSize: 11.5,
    lineHeight: 16.5,
    flex: 1,
  },
  infoCardDismissBtn: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4.5,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
  },
  infoCardDismissText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  list: {},
  listContent: {
    gap: 8,
    paddingBottom: 16,
  },
  batchCard: {
    borderWidth: 1.2,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  cardTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTopStart: {
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  cardTopEnd: {
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  batchBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  batchBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  oldestTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  oldestTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dateWrap: {
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
  },
  dateText: {
    fontSize: 10.5,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricsRow: {
    gap: 6,
    alignItems: 'stretch',
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 7,
    borderWidth: 0.8,
    gap: 1.5,
  },
  metricLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  metricUnitText: {
    fontSize: 10,
  },
  extraRow: {
    gap: 10,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.18)',
    paddingTop: 5,
    flexWrap: 'wrap',
  },
  extraItem: {
    alignItems: 'center',
    gap: 3,
  },
  extraText: {
    fontSize: 10.5,
  },
});

