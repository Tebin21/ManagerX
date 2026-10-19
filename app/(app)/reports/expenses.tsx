import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, FlatList, TouchableOpacity, Modal, TextInput,
  StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform,
  Pressable, ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { TimeText } from '@/components/ui/TimeText';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useReportStore } from '@/store/reportStore';
import { getStatusTint, getBlueTint } from '@/constants/statusTints';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme, MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
// EXPENSE_CATEGORIES no longer used in form — examples replace the picker
import type { Expense } from '@/types/reports';
import { toDateOnly } from '@/utils/formatters';
import { roundToNearest250 } from '@/utils/rounding';
import { DateTimePicker } from '@/components/shared/DateTimePicker';
import { CompactAmount } from '@/components/shared/CompactAmount';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish, SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT_REGULAR } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import { CustomDateRangeModal } from '@/components/shared/CustomDateRangeModal';
import { CapitalView } from '@/components/capital/CapitalView';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  Transport: '🚗',
  Food:      '🍽️',
  Utilities: '💡',
};

function getCategoryTint(category: string, colors: AppColors, isDark: boolean): string {
  switch (category) {
    case 'Transport': return getBlueTint(isDark).bg;
    case 'Food':       return getStatusTint('success', colors, isDark).bg;
    case 'Utilities':  return getStatusTint('warning', colors, isDark).bg;
    default:           return colors.gray100;
  }
}

// Quick-fill example reasons. Tapping one pre-fills the reason field.
const EXPENSE_EXAMPLES: { text: string; enText: string; category: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { text: 'کرێی دووکان',    enText: 'Shop Rent',        category: 'Other',     icon: 'business-outline' },
  { text: 'کرێی کارەبا',    enText: 'Electricity Bill', category: 'Utilities', icon: 'flash-outline' },
  { text: 'مووچەی کارمەند', enText: 'Employee Salary',  category: 'Other',     icon: 'people-outline' },
  { text: 'خواردن',          enText: 'Food & Meals',     category: 'Food',      icon: 'restaurant-outline' },
  { text: 'مەسروف',         enText: 'Daily Supplies',   category: 'Other',     icon: 'cart-outline' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────


// ─── Expense Date Filter ──────────────────────────────────────────────────────

type ExpenseFilterKey = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

function applyExpenseFilter(
  list: Expense[],
  filter: ExpenseFilterKey,
  range: { from: string; to: string } | null,
): Expense[] {
  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const utcToday = toDateOnly(now);
  switch (filter) {
    case 'all':
      return list;
    case 'today':
      return list.filter((e) => {
        const d = (e.date ?? '').slice(0, 10);
        return d === localToday || d === utcToday;
      });
    case 'week': {
      const d = new Date(now);
      const dow = d.getDay();
      d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
      const weekStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return list.filter((e) => {
        const dStr = (e.date ?? '').slice(0, 10);
        return dStr >= weekStart && dStr <= localToday;
      });
    }
    case 'month': {
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return list.filter((e) => (e.date ?? '').startsWith(prefix));
    }
    case 'year':
      return list.filter((e) => (e.date ?? '').startsWith(String(now.getFullYear())));
    case 'custom':
      if (!range) return list;
      return list.filter((e) => {
        const d = (e.date ?? '').slice(0, 10);
        return d >= range.from && d <= range.to;
      });
    default:
      return list;
  }
}

// ─── Expense Filter Bar ───────────────────────────────────────────────────────

function ExpenseFilterBar({
  filter,
  appliedRange,
  onChange,
  searchQuery,
  onSearchChange,
  isSearchOpen,
  onToggleSearch,
}: {
  filter: ExpenseFilterKey;
  appliedRange: { from: string; to: string } | null;
  onChange: (key: ExpenseFilterKey, range?: { from: string; to: string }) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isSearchOpen: boolean;
  onToggleSearch: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { isRTL } = useRTL();
  const { isTablet, isTabletLandscape } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const [customOpen, setCustomOpen] = useState(false);
  const [fromVal, setFromVal]       = useState('');
  const [toVal, setToVal]           = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const keys: ExpenseFilterKey[] = ['today', 'week', 'month', 'year', 'all', 'custom'];
  const labels: Record<ExpenseFilterKey, string> = {
    today:  t('common.today'),
    week:   t('common.thisWeek'),
    month:  t('common.thisMonth'),
    year:   t('reports.year'),
    all:    isKurdish ? 'هەمووی' : 'All',
    custom: t('reports.custom'),
  };

  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (isRTL && scrollRef.current) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isRTL]);

  return (
    <>
      <View style={[efbStyles.wrapper, { backgroundColor: colors.white, borderBottomColor: colors.gray100 }]}>
        <View
          style={[
            efbStyles.container,
            isTablet && {
              maxWidth: isTabletLandscape ? 1320 : 1040,
              alignSelf: 'center',
              width: '100%',
              paddingHorizontal: isTabletLandscape ? 32 : 24,
            },
          ]}
        >
          {isSearchOpen ? (
            /* Full-width Search Bar covering filters */
            <View
              style={[
                efbStyles.searchBarContainer,
                {
                  backgroundColor: colors.gray100,
                  borderColor: colors.gray200,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
                isTablet && { height: 50, paddingHorizontal: 16 },
              ]}
            >
              <Ionicons
                name="search"
                size={isTablet ? 22 : 18}
                color={colors.gray400}
                style={{ marginHorizontal: 4 }}
              />
              <TextInput
                ref={searchInputRef}
                style={[
                  efbStyles.searchInput,
                  {
                    color: colors.black,
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                    fontSize: isTablet ? 16 : 14,
                  },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                ]}
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder={t('reports.searchExpensesPlaceholder', 'گەڕان بەپێی هۆکار یان بڕی خەرجی...')}
                placeholderTextColor={colors.gray400}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => onSearchChange('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close-circle" size={isTablet ? 20 : 18} color={colors.gray400} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  onSearchChange('');
                  onToggleSearch(false);
                }}
                style={[
                  efbStyles.searchCloseBtn,
                  {
                    backgroundColor: colors.white,
                    borderColor: colors.gray200,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                  isTablet && { paddingHorizontal: 14, paddingVertical: 8 },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={isTablet ? 18 : 16} color={colors.gray600} />
                <Text
                  style={[
                    efbStyles.searchCloseText,
                    { color: colors.gray600 },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    isTablet && { fontSize: 14 },
                  ]}
                >
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Normal Filter Bar with right-to-left pills and search button */
            <View style={[efbStyles.barRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* Filter Pills ScrollView */}
              <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                onContentSizeChange={() => {
                  if (isRTL) {
                    scrollRef.current?.scrollToEnd({ animated: false });
                  }
                }}
                contentContainerStyle={[
                  efbStyles.row,
                  {
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    flexGrow: 1,
                    justifyContent: 'flex-start',
                  },
                  isTablet && { paddingVertical: 14, gap: 12 },
                ]}
                style={efbStyles.scrollView}
              >
                {keys.map((key) => {
                  const active = filter === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        efbStyles.pill,
                        {
                          backgroundColor: active ? colors.error : colors.gray100,
                          borderColor: active ? colors.error : colors.gray200,
                          paddingHorizontal: isTablet ? 20 : 14,
                          paddingVertical: isTablet ? 10 : 7,
                          borderRadius: isTablet ? 24 : 20,
                        },
                      ]}
                      onPress={() => {
                        if (key === 'custom') {
                          setFromVal(appliedRange?.from || '');
                          setToVal(appliedRange?.to || '');
                          setCustomOpen(true);
                        } else {
                          onChange(key);
                        }
                      }}
                    >
                      <Text
                        style={[
                          efbStyles.pillText,
                          {
                            color: active ? '#fff' : colors.gray600,
                            fontSize: isTabletLandscape ? 15.5 : isTablet ? 14.5 : 13,
                          },
                          isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                        ]}
                      >
                        {labels[key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Search Toggle Icon Button */}
              <TouchableOpacity
                style={[
                  efbStyles.searchToggleBtn,
                  {
                    backgroundColor: searchQuery ? colors.primary + '18' : colors.gray100,
                    borderColor: searchQuery ? colors.primary : colors.gray200,
                  },
                  isTablet && { width: 44, height: 44, borderRadius: 22 },
                ]}
                onPress={() => onToggleSearch(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Search"
              >
                <Ionicons
                  name="search"
                  size={isTablet ? 20 : 18}
                  color={searchQuery ? colors.primary : colors.gray600}
                />
                {searchQuery.length > 0 && (
                  <View style={[efbStyles.searchBadge, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            </View>
          )}

          {filter === 'custom' && appliedRange && !isSearchOpen && (
            <Text
              style={[
                efbStyles.rangeLabel,
                {
                  color: colors.gray500,
                  fontSize: isTablet ? 13 : 11,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
            >
              <DateText value={appliedRange.from} size="small" style={[efbStyles.rangeLabel, isTablet && { fontSize: 13 }]} /> {'→'} <DateText value={appliedRange.to} size="small" style={[efbStyles.rangeLabel, isTablet && { fontSize: 13 }]} />
            </Text>
          )}
        </View>
      </View>

      <CustomDateRangeModal
        visible={customOpen}
        onClose={() => setCustomOpen(false)}
        initialFrom={appliedRange?.from}
        initialTo={appliedRange?.to}
        onApply={(from, to) => {
          onChange('custom', { from, to });
          setCustomOpen(false);
        }}
      />
    </>
  );
}

const efbStyles = StyleSheet.create({
  wrapper:            { borderBottomWidth: 1 },
  container:          { width: '100%' },
  barRow:             { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 },
  scrollView:         { flex: 1 },
  row:                { paddingVertical: 4, gap: 8, alignItems: 'center' },
  pill:               { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  pillText:           { fontSize: 13, fontWeight: '600' },
  rangeLabel:         { fontSize: 11, fontWeight: '500', paddingHorizontal: 16, paddingBottom: 8 },
  searchToggleBtn:    { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  searchBadge:        { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4 },
  searchBarContainer: { height: 44, marginHorizontal: 12, marginVertical: 6, borderRadius: 12, borderWidth: 1, alignItems: 'center', paddingHorizontal: 10 },
  searchInput:        { flex: 1, height: '100%', paddingHorizontal: 8 },
  searchCloseBtn:     { alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  searchCloseText:    { fontSize: 13, fontWeight: '600' },
  overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modal:              { borderRadius: 20, padding: 24, width: '85%' },
  modalTitle:         { fontSize: 17, fontWeight: '800', marginBottom: 16 },
  dateLabel:          { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  dateInput:          { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 14 },
  modalActions:       { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:          { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  cancelText:         { fontSize: 14, fontWeight: '600' },
  applyBtn:           { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  applyText:          { fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ─── Expense Form Modal (Add + Edit) ──────────────────────────────────────────

function ExpenseFormModal({
  visible,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial?: Expense;
  onClose: () => void;
  onSave: (data: { amount: number; category: string; reason: string; note?: string; date?: string }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, flexDirection, textAlign } = useRTL();
  const { isTablet, sheetMaxWidth } = useResponsive();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  const [amount, setAmount]           = useState(() => initial ? String(initial.amount) : '');
  const [rounded, setRounded]         = useState<number | null>(() => initial ? initial.amount : null);
  // reason: primary required description (maps to expenses.reason column)
  // For old records that only have .note, fall back to that value
  const [reason, setReason]           = useState(() => initial?.reason ?? initial?.note ?? '');
  const [note, setNote]               = useState(() => initial?.reason != null ? (initial.note ?? '') : '');
  const [selectedExample, setExample] = useState<number | null>(() => {
    const text = initial?.reason ?? initial?.note ?? '';
    if (!text) return null;
    const idx = EXPENSE_EXAMPLES.findIndex(e => e.text === text);
    return idx >= 0 ? idx : null;
  });
  const [expenseDate, setDate]        = useState(() => initial ? new Date(initial.date) : new Date());
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState<{ amount?: string; reason?: string }>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Sync state when the modal is opened for a different expense
  React.useEffect(() => {
    if (visible) {
      setAmount(initial ? String(initial.amount) : '');
      setRounded(initial ? initial.amount : null);
      const reasonText = initial?.reason ?? initial?.note ?? '';
      setReason(reasonText);
      setNote(initial?.reason != null ? (initial.note ?? '') : '');
      const exIdx = reasonText ? EXPENSE_EXAMPLES.findIndex(e => e.text === reasonText) : -1;
      setExample(exIdx >= 0 ? exIdx : null);
      setDate(initial ? new Date(initial.date) : new Date());
      setErrors({});
      setDropdownOpen(false);
    }
  }, [visible, initial?.id]);

  function onAmountBlur() {
    const n = parseFloat(amount);
    if (!isNaN(n) && n > 0) {
      const r = roundToNearest250(n);
      setRounded(r);
      setAmount(String(r));
    } else {
      setRounded(null);
    }
  }

  function validate(): boolean {
    const errs: { amount?: string; reason?: string } = {};
    const n = parseFloat(amount);
    if (!amount || isNaN(n) || n <= 0) errs.amount = t('reports.amountRequired');
    if (!reason.trim()) errs.reason = t('reports.reasonRequired');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const amt = roundToNearest250(parseFloat(amount));
    const derivedCategory = selectedExample !== null
      ? EXPENSE_EXAMPLES[selectedExample].category
      : 'Other';
    setSaving(true);
    try {
      await onSave({
        amount: amt,
        category: derivedCategory,
        reason: reason.trim(),
        note: note.trim() || undefined,
        date: toDateOnly(expenseDate),
      });
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  }

  const isEdit = !!initial;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
          <View style={styles.modalBackdrop} />
        </Pressable>

        <View
          style={[
            styles.dialogCard,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.08)',
              maxWidth: isTablet ? Math.min(sheetMaxWidth, 620) : 420,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.dialogHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.dialogHeaderTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.dialogHeaderIcon, { backgroundColor: isDark ? 'rgba(212,175,55,0.18)' : 'rgba(212,175,55,0.12)' }]}>
                <Ionicons name="wallet-outline" size={17} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.dialogTitle,
                  { color: colors.black },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {isEdit ? t('reports.editExpense') : t('reports.addExpense')}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.dialogCloseBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
              onPress={onClose}
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <View style={[styles.dialogDivider, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]} />

          <ScrollView
            style={styles.dialogBody}
            contentContainerStyle={styles.dialogBodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Amount */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.gray600, textAlign }]}>
                {t('reports.amount')}
              </Text>
              <View
                style={[
                  styles.amountInputRow,
                  {
                    borderColor: errors.amount ? colors.error : colors.gray200,
                    backgroundColor: isDark ? colors.gray200 : colors.gray50,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <TextInput
                  style={[styles.amountInput, { color: colors.black, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="0"
                  placeholderTextColor={colors.gray400}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={(v) => { setAmount(v); setErrors((e) => ({ ...e, amount: undefined })); }}
                  onBlur={onAmountBlur}
                />
                <View style={[styles.amountBadge, { backgroundColor: isDark ? colors.gray300 : 'rgba(212,175,55,0.12)' }]}>
                  <Text style={[styles.amountBadgeText, { color: colors.primary }]}>IQD</Text>
                </View>
              </View>
              {errors.amount ? (
                <Text style={[styles.errorText, { color: colors.error, textAlign }]}>{errors.amount}</Text>
              ) : rounded !== null ? (
                <Text style={[styles.roundedHint, { color: colors.primary, textAlign }]}>
                  → <AmountText value={rounded} currency="IQD" variant="small" style={[styles.roundedHint, { color: colors.primary }]} />
                </Text>
              ) : null}
            </View>

            {/* Reason */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.gray600, textAlign }]}>
                {t('reports.expenseReason')}
              </Text>
              <View
                style={[
                  styles.reasonInputContainer,
                  {
                    borderColor: errors.reason
                      ? colors.error
                      : dropdownOpen
                      ? colors.primary
                      : colors.gray200,
                    backgroundColor: isDark ? colors.gray200 : colors.gray50,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.reasonTextInput,
                    {
                      color: colors.black,
                      textAlign,
                    },
                    isKuLanguage && applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: reason }), {}),
                  ]}
                  placeholder={t('reports.expenseReasonPlaceholder')}
                  placeholderTextColor={colors.gray400}
                  value={reason}
                  onChangeText={(v) => {
                    setReason(v);
                    const matchIdx = EXPENSE_EXAMPLES.findIndex(
                      (e) => (isKuLanguage ? e.text : e.enText) === v.trim()
                    );
                    setExample(matchIdx >= 0 ? matchIdx : null);
                    setErrors((e) => ({ ...e, reason: undefined }));
                  }}
                  returnKeyType="done"
                />

                <TouchableOpacity
                  style={[
                    styles.dropdownChevronBtn,
                    dropdownOpen && { backgroundColor: isDark ? colors.gray300 : 'rgba(212,175,55,0.15)' },
                  ]}
                  onPress={() => setDropdownOpen((prev) => !prev)}
                  hitSlop={8}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={dropdownOpen ? colors.primary : colors.gray400}
                  />
                </TouchableOpacity>
              </View>

              {errors.reason ? (
                <Text style={[styles.errorText, { color: colors.error, textAlign }]}>{errors.reason}</Text>
              ) : null}

              {/* Dropdown options list */}
              {dropdownOpen && (
                <View
                  style={[
                    styles.dropdownMenu,
                    {
                      backgroundColor: isDark ? colors.gray200 : colors.white,
                      borderColor: isDark ? colors.gray300 : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                >
                  {EXPENSE_EXAMPLES.map((ex, idx) => {
                    const optText = isKuLanguage ? ex.text : ex.enText;
                    const isSelected = reason.trim() === optText || selectedExample === idx;
                    const isLast = idx === EXPENSE_EXAMPLES.length - 1;

                    return (
                      <React.Fragment key={idx}>
                        <TouchableOpacity
                          style={[
                            styles.dropdownMenuItem,
                            {
                              flexDirection: isRTL ? 'row-reverse' : 'row',
                              backgroundColor: isSelected
                                ? (isDark ? 'rgba(212,175,55,0.15)' : 'rgba(212,175,55,0.08)')
                                : 'transparent',
                            },
                          ]}
                          onPress={() => {
                            setReason(optText);
                            setExample(idx);
                            setErrors((e) => ({ ...e, reason: undefined }));
                            setDropdownOpen(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.dropdownItemLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <View
                              style={[
                                styles.dropdownItemIconWrap,
                                {
                                  backgroundColor: isSelected
                                    ? colors.primary
                                    : (isDark ? colors.gray300 : colors.gray100),
                                },
                              ]}
                            >
                              <Ionicons
                                name={ex.icon}
                                size={14}
                                color={isSelected ? '#fff' : colors.gray500}
                              />
                            </View>
                            <Text
                              style={[
                                styles.dropdownItemText,
                                {
                                  color: isSelected ? colors.primary : colors.black,
                                  fontWeight: isSelected ? '700' : '500',
                                },
                                isKuLanguage && {
                                  fontFamily: isSelected ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT_REGULAR,
                                  fontWeight: 'normal',
                                },
                              ]}
                            >
                              {optText}
                            </Text>
                          </View>

                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={17} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                        {!isLast && (
                          <View
                            style={[
                              styles.dropdownItemDivider,
                              { backgroundColor: isDark ? colors.gray300 : colors.gray100 },
                            ]}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Optional note */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.gray600, textAlign }]}>
                {t('reports.note')}
              </Text>
              <TextInput
                style={[
                  styles.compactInput,
                  {
                    borderColor: colors.gray200,
                    backgroundColor: isDark ? colors.gray200 : colors.gray50,
                    color: colors.black,
                    textAlign,
                  },
                  isKuLanguage && applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: note }), {}),
                ]}
                placeholder={t('reports.notePlaceholder')}
                placeholderTextColor={colors.gray400}
                value={note}
                onChangeText={setNote}
                returnKeyType="done"
              />
            </View>

            {/* Date */}
            <View style={styles.fieldGroup}>
              <DateTimePicker
                value={expenseDate}
                onChange={setDate}
                label={t('reports.date')}
                maxDate={new Date()}
              />
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' },
                isTablet && { minHeight: 56, paddingVertical: 14, borderRadius: 14 },
              ]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name={isEdit ? "checkmark" : "add"} size={isTablet ? 22 : 18} color="#fff" style={{ marginEnd: 8 }} />
                  <Text
                    style={[
                      styles.saveButtonText,
                      isTablet && { fontSize: 16.5 },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                    ]}
                  >
                    {isEdit ? t('reports.save') : t('reports.addExpense')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Expense Card ─────────────────────────────────────────────────────────────

function ExpenseCard({
  expense,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors, isDark } = useAppTheme();
  const { isRTL } = useRTL();
  const { isTablet, isTabletLandscape } = useResponsive();

  const iconBg = useMemo(() => getCategoryTint(expense.category, colors, isDark), [expense.category, colors, isDark]);
  const editTint = useMemo(() => getBlueTint(isDark), [isDark]);
  const deleteTint = useMemo(() => getStatusTint('error', colors, isDark), [colors, isDark]);

  return (
    <MotiView
      style={isTablet ? { flex: 1 } : undefined}
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 200 }}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.white },
          isTablet && {
            padding: isTabletLandscape ? 20 : 16,
            borderRadius: 18,
            marginBottom: 14,
          },
        ]}
      >
        {/* Top row: icon + category + amount */}
        <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.cardIconCircle,
              { backgroundColor: iconBg },
              isTablet && {
                width: isTabletLandscape ? 54 : 48,
                height: isTabletLandscape ? 54 : 48,
                borderRadius: isTabletLandscape ? 27 : 24,
              },
            ]}
          >
            <Text style={{ fontSize: isTabletLandscape ? 24 : isTablet ? 21 : 18 }}>
              {CATEGORY_ICONS[expense.category] ?? '📌'}
            </Text>
          </View>
          <View
            style={[
              styles.cardMid,
              {
                marginStart: isTabletLandscape ? 16 : isTablet ? 14 : 12,
                alignItems: isRTL ? 'flex-end' : 'flex-start',
              },
            ]}
          >
            <Text
              style={[
                styles.cardCategory,
                { color: colors.black },
                isTablet && {
                  fontSize: isTabletLandscape ? 18 : 16.5,
                  marginBottom: 4,
                },
              ]}
              numberOfLines={2}
            >
              {expense.reason ?? expense.note ?? '—'}
            </Text>
            {expense.reason != null && expense.note ? (
              <Text
                style={[
                  styles.cardReason,
                  { color: colors.gray500 },
                  isTablet && { fontSize: isTabletLandscape ? 15 : 14 },
                ]}
                numberOfLines={1}
              >
                {expense.note}
              </Text>
            ) : null}
          </View>
          <AmountText
            value={expense.amount}
            currency="IQD"
            style={[
              styles.cardAmount,
              { color: colors.error },
              isTablet && { fontSize: isTabletLandscape ? 21 : 19 },
            ]}
          />
        </View>

        {/* Bottom row: date/time + action buttons */}
        <View style={[styles.cardBottomRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text
            style={[
              styles.cardDate,
              { color: colors.gray400 },
              isTablet && { fontSize: isTabletLandscape ? 14 : 13 },
            ]}
          >
            <DateText value={expense.date} size="small" style={[styles.cardDate, isTablet && { fontSize: isTabletLandscape ? 14 : 13 }]} />
            {expense.createdAt ? <> · <TimeText value={expense.createdAt} style={[styles.cardDate, isTablet && { fontSize: isTabletLandscape ? 14 : 13 }]} /></> : null}
          </Text>
          <View style={[styles.cardActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: editTint.bg },
                isTablet && {
                  width: isTabletLandscape ? 40 : 36,
                  height: isTabletLandscape ? 40 : 36,
                  borderRadius: 10,
                },
              ]}
              onPress={onEdit}
              hitSlop={8}
            >
              <Ionicons
                name="create-outline"
                size={isTabletLandscape ? 20 : isTablet ? 18 : 15}
                color={colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: deleteTint.bg, marginStart: isTablet ? 10 : 8 },
                isTablet && {
                  width: isTabletLandscape ? 40 : 36,
                  height: isTabletLandscape ? 40 : 36,
                  borderRadius: 10,
                },
              ]}
              onPress={onDelete}
              hitSlop={8}
            >
              <Ionicons
                name="trash-outline"
                size={isTabletLandscape ? 20 : isTablet ? 18 : 15}
                color={colors.error}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </MotiView>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ExpensesScreen() {
  const { t } = useTranslation();
  const { expenses, reloadAfterMutation, loadExpenses } = useReportStore();
  const { colors } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet, isTabletLandscape, horizontalPadding } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const params = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab]       = useState<'expenses' | 'capital'>('expenses');
  const [formOpen, setFormOpen]         = useState(false);
  const [editTarget, setEditTarget]     = useState<Expense | undefined>(undefined);
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilterKey>('today');
  const [appliedRange, setAppliedRange]   = useState<{ from: string; to: string } | null>(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [isSearchOpen, setIsSearchOpen]   = useState(false);

  React.useEffect(() => { loadExpenses(); }, []);

  // When navigated into the screen, default to expenses unless explicitly ?tab=capital
  useFocusEffect(
    useCallback(() => {
      loadExpenses();
      if (params.tab === 'capital') {
        setActiveTab('capital');
      } else {
        setActiveTab('expenses');
      }
    }, [params.tab, loadExpenses])
  );

  const filteredExpenses = useMemo(() => {
    const periodFiltered = applyExpenseFilter(expenses, expenseFilter, appliedRange);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return periodFiltered;
    return periodFiltered.filter((e) => {
      const reason = (e.reason || '').toLowerCase();
      const note = (e.note || '').toLowerCase();
      const category = (e.category || '').toLowerCase();
      const amountStr = String(e.amount);
      return (
        reason.includes(q) ||
        note.includes(q) ||
        category.includes(q) ||
        amountStr.includes(q)
      );
    });
  }, [expenses, expenseFilter, appliedRange, searchQuery]);

  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  function handleFilterChange(key: ExpenseFilterKey, range?: { from: string; to: string }) {
    setExpenseFilter(key);
    if (key === 'custom' && range) { setAppliedRange(range); }
    else if (key !== 'custom') { setAppliedRange(null); }
  }

  function openAdd() {
    setEditTarget(undefined);
    setFormOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditTarget(expense);
    setFormOpen(true);
  }

  const handleSave = useCallback(async (data: { amount: number; category: string; reason: string; note?: string; date?: string }) => {
    if (editTarget) {
      const { updateExpense } = await import('@/lib/sqlite');
      await updateExpense(editTarget.id, data);
    } else {
      const { createExpense } = await import('@/lib/sqlite');
      await createExpense(data);
    }
    await reloadAfterMutation();
    setFormOpen(false);
  }, [editTarget, reloadAfterMutation]);

  function handleDelete(id: number) {
    Alert.alert(t('reports.deleteExpense'), t('reports.deleteExpenseConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const { deleteExpense } = await import('@/lib/sqlite');
          await deleteExpense(id);
          await reloadAfterMutation();
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={activeTab === 'capital' ? t('capital.capitalTab') : t('reports.expensesTitle')}
        showBack
        rightAction={activeTab === 'expenses' ? <HeaderActionButton icon="add-circle-outline" onPress={openAdd} /> : undefined}
      />

      {/* Segmented Tab Switcher */}
      <View
        style={[
          styles.segmentWrapper,
          { backgroundColor: colors.white, borderBottomColor: colors.gray200 },
          isTablet && { alignItems: 'center', paddingVertical: isTabletLandscape ? 16 : 14 },
        ]}
      >
        <View
          style={[
            styles.segmentTrack,
            { backgroundColor: colors.gray100, flexDirection: isRTL ? 'row-reverse' : 'row' },
            isTablet && {
              maxWidth: isTabletLandscape ? 1320 : 1040,
              width: '100%',
              padding: isTabletLandscape ? 6 : 5,
              borderRadius: 18,
            },
          ]}
        >
          {/* Expenses Tab */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('expenses')}
            style={[
              styles.segmentBtn,
              activeTab === 'expenses' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                minHeight: isTabletLandscape ? 56 : isTablet ? 50 : 42,
                paddingVertical: isTabletLandscape ? 14 : isTablet ? 12 : 10,
                borderRadius: isTablet ? 14 : 11,
              },
            ]}
          >
            <Ionicons
              name="receipt-outline"
              size={isTabletLandscape ? 24 : isTablet ? 22 : 16}
              color={activeTab === 'expenses' ? '#FFFFFF' : colors.gray500}
            />
            <Text
              style={[
                styles.segmentBtnText,
                {
                  color: activeTab === 'expenses' ? '#FFFFFF' : colors.gray600,
                  fontSize: isTabletLandscape ? 17.5 : isTablet ? 16.5 : 14,
                },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {t('capital.expensesTab')}
            </Text>
          </TouchableOpacity>

          {/* Capital Tab */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('capital')}
            style={[
              styles.segmentBtn,
              activeTab === 'capital' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                minHeight: isTabletLandscape ? 56 : isTablet ? 50 : 42,
                paddingVertical: isTabletLandscape ? 14 : isTablet ? 12 : 10,
                borderRadius: isTablet ? 14 : 11,
              },
            ]}
          >
            <Ionicons
              name="cash-outline"
              size={isTabletLandscape ? 24 : isTablet ? 22 : 16}
              color={activeTab === 'capital' ? '#FFFFFF' : colors.gray500}
            />
            <Text
              style={[
                styles.segmentBtnText,
                {
                  color: activeTab === 'capital' ? '#FFFFFF' : colors.gray600,
                  fontSize: isTabletLandscape ? 17.5 : isTablet ? 16.5 : 14,
                },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {t('capital.capitalTab')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'expenses' ? (
        <>
          <ExpenseFilterBar
            filter={expenseFilter}
            appliedRange={appliedRange}
            onChange={handleFilterChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isSearchOpen={isSearchOpen}
            onToggleSearch={setIsSearchOpen}
          />

          <FlatList
            key={isTablet ? 'expenses-grid-2' : 'expenses-list-1'}
            data={filteredExpenses}
            keyExtractor={(item) => String(item.id)}
            numColumns={isTablet ? 2 : 1}
            columnWrapperStyle={isTablet ? { gap: 14 } : undefined}
            renderItem={({ item }) => (
              <ExpenseCard
                expense={item}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item.id)}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              isTablet
                ? {
                    maxWidth: isTabletLandscape ? 1320 : 1040,
                    alignSelf: 'center',
                    width: '100%',
                    paddingHorizontal: isTabletLandscape ? 32 : 24,
                    paddingBottom: 60,
                  }
                : { paddingHorizontal: horizontalPadding },
            ]}
            ListHeaderComponent={
              <>
                {/* Summary card */}
                {filteredExpenses.length > 0 && (
                  <MotiView
                    from={{ opacity: 0, translateY: 8 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 300 }}
                  >
                    <PremiumCard
                      style={[
                        styles.summaryCard,
                        isTablet && {
                          padding: isTabletLandscape ? 24 : 20,
                          borderRadius: 20,
                          marginBottom: 18,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.summaryLabel,
                          { color: colors.gray400, textAlign },
                          isTablet && { fontSize: isTabletLandscape ? 16 : 14.5, marginBottom: 6 },
                        ]}
                      >
                        {t('reports.totalExpenses')}
                      </Text>
                      <CompactAmount
                        value={totalExpenses}
                        style={[
                          styles.summaryTotal,
                          { color: colors.error, textAlign },
                          isTablet && { fontSize: isTabletLandscape ? 36 : 32, marginBottom: 14 },
                        ]}
                      />

                      <View style={[styles.divider, { backgroundColor: colors.gray100 }]} />
                      <View style={[styles.summaryCountRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text
                          style={[
                            styles.summaryCountLabel,
                            { color: colors.gray500 },
                            isTablet && { fontSize: isTabletLandscape ? 16 : 14.5 },
                          ]}
                        >
                          {t('reports.expenses')}
                        </Text>
                        <Text
                          style={[
                            styles.summaryCountValue,
                            { color: colors.gray700 },
                            isTablet && { fontSize: isTabletLandscape ? 17 : 15.5 },
                          ]}
                        >
                          {filteredExpenses.length}
                        </Text>
                      </View>
                    </PremiumCard>
                  </MotiView>
                )}

                {filteredExpenses.length > 0 && (
                  <View style={[styles.listHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text
                      style={[
                        styles.listTitle,
                        { color: colors.black },
                        isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                        isTablet && { fontSize: isTabletLandscape ? 18 : 16.5 },
                      ]}
                    >
                      {`${t('reports.expenses')} (${filteredExpenses.length})`}
                    </Text>
                    <Text
                      style={[
                        styles.listHint,
                        { color: colors.gray400 },
                        isTablet && { fontSize: isTabletLandscape ? 14 : 12.5 },
                      ]}
                    >
                      {t('reports.tapToDelete')}
                    </Text>
                  </View>
                )}
              </>
            }
            ListEmptyComponent={
              searchQuery.trim().length > 0 ? (
                <View style={[styles.empty, isTablet && { paddingTop: 100, gap: 12 }]}>
                  <View
                    style={[
                      styles.emptyIconWrap,
                      { backgroundColor: colors.gray100 },
                      isTablet && { width: 90, height: 90, borderRadius: 45, marginBottom: 8 },
                    ]}
                  >
                    <Ionicons name="search-outline" size={isTablet ? 48 : 40} color={colors.gray400} />
                  </View>
                  <Text
                    style={[
                      styles.emptyTitle,
                      { color: colors.gray600 },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      isTablet && { fontSize: 20 },
                    ]}
                  >
                    {t('reports.noExpensesFound', 'هیچ خەرجییەک نەدۆزرایەوە')}
                  </Text>
                  <Text
                    style={[
                      styles.emptySub,
                      { color: colors.gray400 },
                      isTablet && { fontSize: 15, marginBottom: 12 },
                    ]}
                  >
                    {searchQuery}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.emptyAddBtn,
                      { backgroundColor: colors.gray200, flexDirection: isRTL ? 'row-reverse' : 'row' },
                      isTablet && { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 },
                    ]}
                    onPress={() => setSearchQuery('')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close" size={isTablet ? 22 : 18} color={colors.gray700} style={{ marginEnd: 8 }} />
                    <Text
                      style={[
                        styles.emptyAddBtnLabel,
                        { color: colors.gray700 },
                        isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                        isTablet && { fontSize: 16.5 },
                      ]}
                    >
                      {t('reports.clearSearch', 'پاککردنەوەی گەڕان')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.empty, isTablet && { paddingTop: 100, gap: 12 }]}>
                  <View
                    style={[
                      styles.emptyIconWrap,
                      { backgroundColor: colors.gray100 },
                      isTablet && { width: 90, height: 90, borderRadius: 45, marginBottom: 8 },
                    ]}
                  >
                    <Ionicons name="wallet-outline" size={isTablet ? 48 : 40} color={colors.gray400} />
                  </View>
                  <Text
                    style={[
                      styles.emptyTitle,
                      { color: colors.gray600 },
                      isTablet && { fontSize: 20 },
                    ]}
                  >
                    {t('reports.noExpenses')}
                  </Text>
                  <Text
                    style={[
                      styles.emptySub,
                      { color: colors.gray400 },
                      isTablet && { fontSize: 15, marginBottom: 12 },
                    ]}
                  >
                    {t('reports.tapToAddExpense')}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.emptyAddBtn,
                      { backgroundColor: colors.primary, flexDirection },
                      isTablet && { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 },
                    ]}
                    onPress={openAdd}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add" size={isTablet ? 22 : 18} color="#fff" style={{ marginEnd: 8 }} />
                    <Text
                      style={[
                        styles.emptyAddBtnLabel,
                        isTablet && { fontSize: 16.5 },
                        isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                      ]}
                    >
                      {t('reports.addExpense')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            }
          />

          <ExpenseFormModal
            visible={formOpen}
            initial={editTarget}
            onClose={() => setFormOpen(false)}
            onSave={handleSave}
          />
        </>
      ) : (
        <CapitalView />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  segmentWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 8,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  listContent: { padding: 16, paddingBottom: 40 },

  // Summary card
  summaryCard: { marginBottom: 16 },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryTotal: { fontSize: 26, fontWeight: '800', marginBottom: 12 },
  divider: { height: 1, marginBottom: 12 },
  summaryCountRow: { alignItems: 'center', justifyContent: 'space-between' },
  summaryCountLabel: { fontSize: 13 },
  summaryCountValue: { fontSize: 13, fontWeight: '700' },

  listHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listTitle: { fontSize: 14, fontWeight: '700' },
  listHint: { fontSize: 11 },

  // Expense card
  card: {
    borderRadius: Theme.radius.lg,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTopRow: { alignItems: 'flex-start', marginBottom: 10 },
  cardIconCircle: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardMid: { flex: 1 },
  cardCategory: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardReason: { fontSize: 13 },
  cardAmount: { fontSize: 15, fontWeight: '800', flexShrink: 0, marginStart: 8 },
  cardBottomRow: { alignItems: 'center', justifyContent: 'space-between' },
  cardDate: { fontSize: 11 },
  cardActions: { alignItems: 'center' },
  actionBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },

  // Empty state
  empty: { paddingTop: 60, alignItems: 'center', gap: 8 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  emptySub: { fontSize: 13, marginBottom: 8 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 12, marginTop: 8,
  },
  emptyAddBtnLabel: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Centered Dialog Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  dialogHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  dialogHeaderTitleGroup: {
    alignItems: 'center',
    gap: 10,
  },
  dialogHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  dialogCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogDivider: {
    height: 1,
  },
  dialogBody: {
    flexGrow: 0,
  },
  dialogBodyContent: {
    padding: 16,
    gap: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  amountInputRow: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
    height: 48,
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 17,
    fontWeight: '700',
    height: '100%',
  },
  amountBadge: {
    paddingHorizontal: 12,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  compactInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  roundedHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  errorText: {
    fontSize: 11,
    marginTop: 2,
  },
  reasonInputContainer: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 4,
  },
  reasonTextInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
  },
  dropdownChevronBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  dropdownMenu: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  dropdownMenuItem: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownItemLeft: {
    alignItems: 'center',
    gap: 10,
  },
  dropdownItemIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemText: {
    fontSize: 13,
  },
  dropdownItemDivider: {
    height: StyleSheet.hairlineWidth,
  },
  saveButton: {
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
