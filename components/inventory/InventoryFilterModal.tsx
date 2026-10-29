import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/AppText';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { Theme, MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';

export type StockStatusFilter = 'all' | 'inStock' | 'lowStock' | 'outOfStock' | 'paid' | 'debt';
export type InventorySortBy =
  | 'newest'
  | 'oldest'
  | 'price_high'
  | 'price_low'
  | 'qty_high'
  | 'qty_low'
  | 'name_asc';

interface Props {
  visible: boolean;
  onClose: () => void;
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  stockStatus: StockStatusFilter;
  onSelectStockStatus: (status: StockStatusFilter) => void;
  sortBy: InventorySortBy;
  onSelectSortBy: (sort: InventorySortBy) => void;
  onReset: () => void;
}

export function InventoryFilterModal({
  visible,
  onClose,
  categories,
  selectedCategory,
  onSelectCategory,
  stockStatus,
  onSelectStockStatus,
  sortBy,
  onSelectSortBy,
  onReset,
}: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const currentLang = useLanguageStore((s) => s.language);
  const isKuLanguage = currentLang === 'ku';
  const isAr = currentLang === 'ar';
  const isKuOrAr = isKuLanguage || isAr;
  const { isTablet, isTabletLandscape, sheetMaxWidth, width: screenWidth } = useResponsive();

  const stockOptions: { key: StockStatusFilter; label: string; icon: any }[] = [
    { key: 'all',        label: t('inventory.filterAll'),        icon: 'apps-outline' },
    { key: 'inStock',    label: t('inventory.inStockFilter'),    icon: 'checkmark-circle-outline' },
    { key: 'lowStock',   label: t('inventory.filterLow'),        icon: 'warning-outline' },
    { key: 'outOfStock', label: t('inventory.outOfStockFilter'), icon: 'close-circle-outline' },
    { key: 'paid',       label: t('inventory.filterPaid'),       icon: 'cash-outline' },
    { key: 'debt',       label: t('inventory.filterDebt'),       icon: 'time-outline' },
  ];

  const sortOptions: { key: InventorySortBy; label: string; icon: any }[] = [
    { key: 'newest',     label: t('inventory.sortNewest'),    icon: 'sparkles-outline' },
    { key: 'oldest',     label: t('inventory.sortOldest'),    icon: 'calendar-outline' },
    { key: 'price_high', label: t('inventory.sortPriceHigh'), icon: 'trending-up-outline' },
    { key: 'price_low',  label: t('inventory.sortPriceLow'),  icon: 'trending-down-outline' },
    { key: 'qty_high',   label: t('inventory.sortQtyHigh'),   icon: 'layers-outline' },
    { key: 'qty_low',    label: t('inventory.sortQtyLow'),    icon: 'cube-outline' },
    { key: 'name_asc',   label: t('inventory.sortNameAsc'),   icon: 'text-outline' },
  ];

  const activeFiltersCount =
    (stockStatus !== 'all' ? 1 : 0) +
    (selectedCategory !== 'all' ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0);

  return (
    <Modal
      visible={visible}
      animationType={isTablet ? 'fade' : 'slide'}
      transparent
      onRequestClose={onClose}
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
    >
      <View
        style={[
          styles.overlay,
          {
            justifyContent: isTablet ? 'center' : 'flex-end',
            alignItems: isTablet ? 'center' : undefined,
            padding: isTablet ? 24 : 0,
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              width: isTablet ? Math.min(sheetMaxWidth || 580, screenWidth - 48) : '100%',
              maxWidth: isTablet ? 600 : '100%',
              borderRadius: isTablet ? 24 : 0,
              borderTopLeftRadius: isTablet ? 24 : 26,
              borderTopRightRadius: isTablet ? 24 : 26,
              borderBottomLeftRadius: isTablet ? 24 : 0,
              borderBottomRightRadius: isTablet ? 24 : 0,
              padding: isTablet ? 24 : 20,
              maxHeight: isTablet ? '86%' : '84%',
            },
          ]}
        >
          {/* Top drag handle for mobile */}
          {!isTablet && (
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: isDark ? colors.gray300 : colors.gray200 }]} />
            </View>
          )}

          {/* Header */}
          <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.headerTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.headerIconBox, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="options-outline" size={18} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.title,
                  { color: colors.darkBlue, textAlign },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('inventory.filterSort')}
              </Text>
              {activeFiltersCount > 0 && (
                <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.activeBadgeText, { color: colors.white }]}>
                    {activeFiltersCount}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={colors.darkBlue} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* 1. Stock Status Section */}
            <View style={styles.section}>
              <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="cube-outline" size={15} color={colors.primary} />
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.darkBlue, textAlign },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {t('inventory.stockStatus')}
                </Text>
              </View>
              <View style={[styles.gridRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {stockOptions.map((opt) => {
                  const isSelected = stockStatus === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => onSelectStockStatus(opt.key)}
                      style={[
                        styles.gridCard3,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isDark
                            ? colors.gray200
                            : colors.gray100,
                          borderColor: isSelected ? colors.primary : 'transparent',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={14}
                        color={isSelected ? colors.white : colors.gray500}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.cardText,
                          { color: isSelected ? colors.white : colors.darkBlue },
                          isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. Categories Section */}
            {categories.length > 0 && (
              <View style={styles.section}>
                <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="pricetag-outline" size={15} color={colors.primary} />
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.darkBlue, textAlign },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                    ]}
                  >
                    {t('inventory.category')}
                  </Text>
                </View>
                <View style={[styles.gridRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    onPress={() => onSelectCategory('all')}
                    style={[
                      isTablet ? styles.gridCard3 : styles.gridCard2,
                      {
                        backgroundColor:
                          selectedCategory === 'all'
                            ? colors.primary
                            : isDark
                            ? colors.gray200
                            : colors.gray100,
                        borderColor: selectedCategory === 'all' ? colors.primary : 'transparent',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="layers-outline"
                      size={14}
                      color={selectedCategory === 'all' ? colors.white : colors.gray500}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.cardText,
                        { color: selectedCategory === 'all' ? colors.white : colors.darkBlue },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                      ]}
                    >
                      {t('inventory.allCategories')}
                    </Text>
                  </TouchableOpacity>

                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => onSelectCategory(cat)}
                        style={[
                          isTablet ? styles.gridCard3 : styles.gridCard2,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : isDark
                              ? colors.gray200
                              : colors.gray100,
                            borderColor: isSelected ? colors.primary : 'transparent',
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.cardText,
                            { color: isSelected ? colors.white : colors.darkBlue },
                            isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 3. Sorting Section */}
            <View style={styles.section}>
              <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="swap-vertical-outline" size={15} color={colors.primary} />
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.darkBlue, textAlign },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {t('inventory.sortBy')}
                </Text>
              </View>
              <View style={[styles.gridRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {sortOptions.map((opt, idx) => {
                  const isSelected = sortBy === opt.key;
                  const isLast = idx === sortOptions.length - 1;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => onSelectSortBy(opt.key)}
                      style={[
                        isLast ? styles.gridCardFull : styles.gridCard2,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isDark
                            ? colors.gray200
                            : colors.gray100,
                          borderColor: isSelected ? colors.primary : 'transparent',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={14}
                        color={isSelected ? colors.white : colors.gray500}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.cardText,
                          { color: isSelected ? colors.white : colors.darkBlue },
                          isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Buttons */}
          <View style={[styles.bottomActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              onPress={onReset}
              style={[
                styles.resetBtn,
                {
                  backgroundColor: isDark ? colors.gray200 : colors.gray100,
                  borderColor: isDark ? colors.gray300 : colors.gray200,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.darkBlue} />
              <Text
                style={[
                  styles.resetBtnText,
                  { color: colors.darkBlue },
                  isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {isAr ? 'إعادة ضبط' : isKuLanguage ? 'سڕینەوە' : 'Reset'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.applyBtnText,
                  isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {isAr ? 'تطبيق' : isKuLanguage ? 'جێبەجێکردن' : 'Apply'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    ...Theme.shadow.card,
  },
  handleWrap: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleGroup: {
    alignItems: 'center',
    gap: 8,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  activeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingBottom: 16,
    gap: 18,
  },
  section: {
    gap: 10,
  },
  sectionTitleRow: {
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  gridRow: {
    flexWrap: 'wrap',
    gap: 8,
  },
  gridCard3: {
    width: '31.5%',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  gridCard2: {
    width: '48.6%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  gridCardFull: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  bottomActions: {
    marginTop: 12,
    gap: 10,
  },
  resetBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  applyBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
