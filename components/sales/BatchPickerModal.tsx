import React from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { Ionicons } from '@expo/vector-icons';
import { AppSheet, AppSheetHeader } from '@/components/ui/AppSheet';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';
import * as Haptics from 'expo-haptics';
import type { ProductBatch } from '@/types/sales';

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
  const { isRTL, flexDirection, textAlign } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  // If no selectedBatchNum passed, default is batchNum of the first item (FIFO oldest)
  const currentSelectedNum = selectedBatchNum ?? (batches.length > 0 ? batches[0].batchNum : 1);

  const handleSelect = (batch: ProductBatch) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
    onSelectBatch(batch);
    onClose();
  };

  return (
    <AppSheet visible={visible} onClose={onClose}>
      <AppSheetHeader
        title={isKuLanguage ? 'دیاریکردنی وەجبەی فرۆشتن' : 'Select Sale Batch'}
        onClose={onClose}
      />

      <View style={{ marginBottom: 12, marginTop: -6 }}>
        <Text style={[{ fontSize: 13, color: colors.gray500, textAlign }]}>
          {productName}{availableStock !== undefined ? ` · ${isKuLanguage ? 'بڕی بەردەست' : 'Stock'}: ${availableStock} ${unit || ''}` : ''}
        </Text>
      </View>

      {/* FIFO Explanatory Banner */}
      <View
        style={[
          styles.fifoBanner,
          {
            backgroundColor: isDark ? hexToRgba(colors.primary, 0.12) : '#FEF3C7',
            borderColor: isDark ? hexToRgba(colors.primary, 0.3) : '#FDE68A',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={isDark ? colors.primary : '#B45309'}
          style={{ marginTop: 1 }}
        />
        <Text
          style={[
            styles.fifoBannerText,
            {
              color: isDark ? colors.primary : '#92400E',
              textAlign,
              flex: 1,
            },
          ]}
        >
          {isKuLanguage
            ? 'بەپێی بنەمای (FIFO)، کۆنترین وەجبە سەرەتا دیاری کراوە بۆ فرۆشتن، بەڵام دەتوانیت بە دڵی خۆت وەجبەی تر دیاری بکەیت.'
            : 'By default, the oldest batch (FIFO) is selected for sale. You can freely pick any other batch.'}
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {batches.map((batch) => {
          const isSelected = batch.batchNum === currentSelectedNum;
          return (
            <TouchableOpacity
              key={`${batch.batchNum}_${batch.purchaseId || '0'}`}
              style={[
                styles.batchCard,
                {
                  backgroundColor: isSelected
                    ? isDark ? hexToRgba(colors.primary, 0.14) : '#FFFBEB'
                    : isDark ? colors.gray100 : colors.gray50,
                  borderColor: isSelected
                    ? colors.primary
                    : isDark ? colors.gray200 : '#E2E8F0',
                },
              ]}
              onPress={() => handleSelect(batch)}
              activeOpacity={0.8}
            >
              {/* Top row: Batch # Badge, FIFO tag, Date, Radio Indicator */}
              <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  {/* Batch Number Pill */}
                  <View
                    style={[
                      styles.batchBadge,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.gray300,
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
                      {isKuLanguage ? `وەجبەی #${batch.batchNum}` : `Batch #${batch.batchNum}`}
                    </Text>
                  </View>

                  {/* Oldest FIFO tag */}
                  {batch.isOldest && (
                    <View
                      style={[
                        styles.oldestTag,
                        {
                          backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#DCFCE7',
                          borderColor: isDark ? 'rgba(16,185,129,0.4)' : '#86EFAC',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                    >
                      <Ionicons name="sparkles" size={11} color={colors.success} style={{ marginHorizontal: 2 }} />
                      <Text style={[styles.oldestTagText, { color: colors.success }]}>
                        {isKuLanguage ? 'کۆنترین (FIFO)' : 'Oldest (FIFO)'}
                      </Text>
                    </View>
                  )}

                  {/* Purchase Date */}
                  <View style={[styles.dateWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="calendar-outline" size={12} color={colors.gray400} />
                    <DateText value={batch.date} style={[styles.dateText, { color: colors.gray500 }]} />
                  </View>
                </View>

                {/* Selection Radio / Checkmark */}
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: isSelected ? colors.primary : colors.gray300,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
              </View>

              {/* Metrics Row: Buy Price, Sell Price, Intake Qty */}
              <View style={[styles.metricsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {/* Buy Price */}
                <View style={[styles.metricCell, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
                  <Text style={[styles.metricLabel, { color: colors.gray400 }]}>
                    {isKuLanguage ? 'نرخی کڕین' : 'Buy Price'}
                  </Text>
                  <AmountText
                    value={batch.buyPriceIQD}
                    currency="IQD"
                    style={[styles.metricValue, { color: colors.black }]}
                  />
                </View>

                {/* Sell Price */}
                <View style={[styles.metricCell, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
                  <Text style={[styles.metricLabel, { color: colors.gray400 }]}>
                    {isKuLanguage ? 'نرخی فرۆشتن' : 'Sell Price'}
                  </Text>
                  <AmountText
                    value={batch.sellPriceIQD}
                    currency="IQD"
                    style={[styles.metricValue, { color: colors.black }]}
                  />
                </View>

                {/* Intake Quantity */}
                <View style={[styles.metricCell, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
                  <Text style={[styles.metricLabel, { color: colors.gray400 }]}>
                    {isKuLanguage ? 'بڕی وەجبە' : 'Batch Qty'}
                  </Text>
                  <Text style={[styles.metricValue, { color: colors.primary, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {batch.quantity} {isKuLanguage ? 'دانە' : 'pcs'}
                  </Text>
                </View>
              </View>

              {/* Extra details if available: Expiry, Supplier */}
              {(batch.supplierName || batch.expiryDate) && (
                <View style={[styles.extraRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {batch.supplierName && (
                    <View style={[styles.extraItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons name="business-outline" size={12} color={colors.gray400} />
                      <Text style={[styles.extraText, { color: colors.gray500 }]} numberOfLines={1}>
                        {batch.supplierName}
                      </Text>
                    </View>
                  )}
                  {batch.expiryDate && (
                    <View style={[styles.extraItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons name="time-outline" size={12} color={colors.warning} />
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
  fifoBanner: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  fifoBannerText: {
    fontSize: 12,
    lineHeight: 18,
  },
  list: {
    maxHeight: 380,
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
  },
  batchCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  cardTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  batchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  batchBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  oldestTag: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  oldestTagText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  dateWrap: {
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  dateText: {
    fontSize: 11,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    gap: 6,
    alignItems: 'stretch',
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 2,
  },
  metricLabel: {
    fontSize: 10.5,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  extraRow: {
    gap: 12,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
    paddingTop: 6,
  },
  extraItem: {
    alignItems: 'center',
    gap: 4,
  },
  extraText: {
    fontSize: 11,
  },
});
