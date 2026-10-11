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
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: isDark ? colors.gray100 : colors.white }]}>
          {/* Header */}
          <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.headerTitleGroup}>
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
                <View style={[styles.activeBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.activeBadgeText, { color: colors.primary }]}>
                    {activeFiltersCount}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
            >
              <Ionicons name="close" size={20} color={colors.darkBlue} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* 1. Stock Status Section */}
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.gray500, textAlign },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('inventory.stockStatus')}
              </Text>
              <View style={[styles.chipsWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {stockOptions.map((opt) => {
                  const isSelected = stockStatus === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => onSelectStockStatus(opt.key)}
                      style={[
                        styles.chip,
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
                        style={[
                          styles.chipText,
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
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.gray500, textAlign },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {t('inventory.category')}
                </Text>
                <View style={[styles.chipsWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    onPress={() => onSelectCategory('all')}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          selectedCategory === 'all'
                            ? colors.primary
                            : isDark
                            ? colors.gray200
                            : colors.gray100,
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
                      style={[
                        styles.chipText,
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
                          styles.chip,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : isDark
                              ? colors.gray200
                              : colors.gray100,
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.chipText,
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
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.gray500, textAlign },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('inventory.sortBy')}
              </Text>
              <View style={[styles.chipsWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {sortOptions.map((opt) => {
                  const isSelected = sortBy === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => onSelectSortBy(opt.key)}
                      style={[
                        styles.chip,
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
                        style={[
                          styles.chipText,
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
                  borderColor: colors.gray200,
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.darkBlue} />
              <Text
                style={[
                  styles.resetBtnText,
                  { color: colors.darkBlue },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {isKuLanguage ? 'سڕینەوە' : 'Reset'}
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
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {isKuLanguage ? 'جێبەجێکردن' : 'Apply'}
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
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    maxHeight: '82%',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadgeText: {
    fontSize: 12,
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
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  chipsWrap: {
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  bottomActions: {
    marginTop: 10,
    gap: 10,
  },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
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
