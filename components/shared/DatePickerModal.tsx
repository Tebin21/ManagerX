import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Dimensions,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import { useResponsive } from '@/hooks/useResponsive';
import { useRTL } from '@/lib/rtl';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { toDateOnly, toEnglishDigits } from '@/utils/formatters';

export interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  onClear?: () => void;
  currentDate?: Date | null;
  title?: string;
  allowClear?: boolean;
  mode?: 'expiry' | 'production' | 'general';
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYMD(s: string): Date {
  const parts = s.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
}

const KURDISH_MONTHS = [
  'کانوونی دووەم',
  'شوبات',
  'ئازار',
  'نیسان',
  'ئایار',
  'حوزەیران',
  'تەممووز',
  'ئاب',
  'ئەیلوول',
  'تشرینی یەکەم',
  'تشرینی دووەم',
  'کانوونی یەکەم',
];

const ENGLISH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const KURDISH_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ه'];
const ENGLISH_WEEKDAYS = ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr'];

export function DatePickerModal({
  visible,
  onClose,
  onSelect,
  onClear,
  currentDate,
  title,
  allowClear = true,
  mode = 'expiry',
}: DatePickerModalProps) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet } = useResponsive();

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toYMD(today), [today]);

  const [selectedYMD, setSelectedYMD] = useState<string>(todayStr);
  const [manualInput, setManualInput] = useState<string>(todayStr);
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth());
  const [showYearPicker, setShowYearPicker] = useState<boolean>(false);

  // Sync state whenever modal becomes visible or currentDate changes
  useEffect(() => {
    if (visible) {
      const initial = currentDate ? new Date(currentDate) : new Date();
      const ymd = toYMD(initial);
      setSelectedYMD(ymd);
      setManualInput(ymd);
      setViewYear(initial.getFullYear());
      setViewMonth(initial.getMonth());
      setShowYearPicker(false);
    }
  }, [visible, currentDate]);

  const monthName = isKurdish ? KURDISH_MONTHS[viewMonth] : ENGLISH_MONTHS[viewMonth];
  const weekdays = isKurdish ? KURDISH_WEEKDAYS : ENGLISH_WEEKDAYS;

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const jumpToToday = () => {
    const now = new Date();
    const ymd = toYMD(now);
    setSelectedYMD(ymd);
    setManualInput(ymd);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  // Calendar Day Grid
  const calendarDays = useMemo(() => {
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const startOffset = (firstDow + 1) % 7; // Middle-eastern Saturday start

    const prevMonthDaysCount = new Date(viewYear, viewMonth, 0).getDate();
    const items: Array<{
      day: number;
      ymd: string;
      isCurrentMonth: boolean;
    }> = [];

    // Leading days from previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDaysCount - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      items.push({
        day: d,
        ymd: `${prevY}-${pad2(prevM + 1)}-${pad2(d)}`,
        isCurrentMonth: false,
      });
    }

    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      items.push({
        day: d,
        ymd: `${viewYear}-${pad2(viewMonth + 1)}-${pad2(d)}`,
        isCurrentMonth: true,
      });
    }

    // Trailing days for grid completion
    const remainder = (7 - (items.length % 7)) % 7;
    for (let d = 1; d <= remainder; d++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      items.push({
        day: d,
        ymd: `${nextY}-${pad2(nextM + 1)}-${pad2(d)}`,
        isCurrentMonth: false,
      });
    }

    return items;
  }, [viewYear, viewMonth]);

  const handleSelectDay = (ymd: string) => {
    setSelectedYMD(ymd);
    setManualInput(ymd);
    const parsed = parseYMD(ymd);
    if (parsed.getFullYear() !== viewYear || parsed.getMonth() !== viewMonth) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  };

  const handleManualInputChange = (text: string) => {
    const clean = toEnglishDigits(text);
    setManualInput(clean);
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const d = parseYMD(clean);
      if (!isNaN(d.getTime())) {
        setSelectedYMD(clean);
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  };

  const applyOffset = (months: number, years: number = 0) => {
    const base = parseYMD(selectedYMD || todayStr);
    const next = new Date(base.getFullYear() + years, base.getMonth() + months, base.getDate());
    const ymd = toYMD(next);
    setSelectedYMD(ymd);
    setManualInput(ymd);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleConfirm = () => {
    const finalDate = parseYMD(selectedYMD || todayStr);
    onSelect(finalDate);
    onClose();
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
    onClose();
  };

  // Quick chips
  const quickShortcuts = useMemo(() => {
    if (mode === 'expiry') {
      return [
        { label: isKurdish ? 'ئەمڕۆ' : 'Today', fn: jumpToToday },
        { label: isKurdish ? '+١ مانگ' : '+1M', fn: () => applyOffset(1) },
        { label: isKurdish ? '+٣ مانگ' : '+3M', fn: () => applyOffset(3) },
        { label: isKurdish ? '+٦ مانگ' : '+6M', fn: () => applyOffset(6) },
        { label: isKurdish ? '+١ ساڵ' : '+1Y', fn: () => applyOffset(0, 1) },
        { label: isKurdish ? '+٢ ساڵ' : '+2Y', fn: () => applyOffset(0, 2) },
      ];
    }
    return [
      { label: isKurdish ? 'ئەمڕۆ' : 'Today', fn: jumpToToday },
      { label: isKurdish ? 'دوێنێ' : 'Yesterday', fn: () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        handleSelectDay(toYMD(d));
      }},
      { label: isKurdish ? '-١ هەفتە' : '-1W', fn: () => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        handleSelectDay(toYMD(d));
      }},
      { label: isKurdish ? '-١ مانگ' : '-1M', fn: () => applyOffset(-1) },
      { label: isKurdish ? '-٦ مانگ' : '-6M', fn: () => applyOffset(-6) },
      { label: isKurdish ? '-١ ساڵ' : '-1Y', fn: () => applyOffset(0, -1) },
    ];
  }, [mode, isKurdish, selectedYMD]);

  // Year quick list for fast year selection
  const yearOptions = useMemo(() => {
    const currentY = today.getFullYear();
    const list = [];
    const minYear = currentY - 5;
    const maxYear = currentY + 10;
    for (let y = minYear; y <= maxYear; y++) {
      list.push(y);
    }
    return list;
  }, [today]);

  const defaultTitle = mode === 'expiry'
    ? (isKurdish ? 'دیاریکردنی بەرواری بەسەرچوون' : 'Select Expiry Date')
    : (isKurdish ? 'دیاریکردنی بەرواری دەرچوون' : 'Select Production Date');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: isDark ? colors.gray200 : '#E2E8F0',
              maxWidth: isTablet ? 460 : Math.min(Dimensions.get('window').width - 32, 400),
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: isDark ? colors.gray200 : '#F1F5F9' }]}>
            <View style={[styles.headerIconWrap, { backgroundColor: isDark ? 'rgba(212,175,55,0.18)' : '#FEF3C7' }]}>
              <Ionicons
                name={mode === 'expiry' ? 'calendar' : 'construct-outline'}
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text
                style={[
                  styles.headerTitle,
                  { color: colors.black, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
                numberOfLines={1}
              >
                {title || defaultTitle}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.gray400, textAlign }]}>
                {selectedYMD}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollBody}
          >
            {/* Quick shortcuts row */}
            <View style={[styles.quickRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {quickShortcuts.map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={chip.fn}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: isDark ? 'rgba(212,175,55,0.12)' : '#FEF3C7',
                      borderColor: isDark ? 'rgba(212,175,55,0.25)' : '#FDE68A',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      { color: isDark ? '#FBBF24' : '#B45309' },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Calendar Container */}
            <View
              style={[
                styles.calendarCard,
                {
                  backgroundColor: isDark ? colors.gray50 : '#F8FAFC',
                  borderColor: isDark ? colors.gray200 : '#E2E8F0',
                },
              ]}
            >
              {/* Month & Year Navigation Header */}
              <View style={[styles.calMonthHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  onPress={isRTL ? nextMonth : prevMonth}
                  style={[styles.calNavBtn, { backgroundColor: isDark ? colors.gray200 : '#FFFFFF' }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-back" size={17} color={colors.black} />
                </TouchableOpacity>

                <View style={[styles.calTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    onPress={() => setShowYearPicker((p) => !p)}
                    style={[
                      styles.yearPill,
                      {
                        backgroundColor: showYearPicker ? colors.primary : isDark ? colors.gray200 : '#FFFFFF',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.yearPillText,
                        { color: showYearPicker ? '#FFFFFF' : colors.black },
                        isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {monthName} {viewYear}
                    </Text>
                    <Ionicons
                      name={showYearPicker ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={showYearPicker ? '#FFFFFF' : colors.gray500}
                    />
                  </TouchableOpacity>

                  {(viewYear !== today.getFullYear() || viewMonth !== today.getMonth()) && (
                    <TouchableOpacity
                      onPress={jumpToToday}
                      style={[styles.todayBadge, { backgroundColor: colors.primary + '18' }]}
                    >
                      <Text style={[styles.todayBadgeText, { color: colors.primary }]}>
                        {isKurdish ? 'ئەمڕۆ' : 'Today'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  onPress={isRTL ? prevMonth : nextMonth}
                  style={[styles.calNavBtn, { backgroundColor: isDark ? colors.gray200 : '#FFFFFF' }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-forward" size={17} color={colors.black} />
                </TouchableOpacity>
              </View>

              {/* Year Dropdown Grid (if toggled) */}
              {showYearPicker ? (
                <View style={styles.yearGridWrap}>
                  <Text style={[styles.yearGridHeader, { color: colors.gray400, textAlign }]}>
                    {isKurdish ? 'ساڵ هەڵبژێرە:' : 'Select Year:'}
                  </Text>
                  <View style={[styles.yearGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {yearOptions.map((y) => {
                      const isCurYear = y === viewYear;
                      return (
                        <TouchableOpacity
                          key={y}
                          onPress={() => {
                            setViewYear(y);
                            setShowYearPicker(false);
                          }}
                          style={[
                            styles.yearGridItem,
                            isCurYear && { backgroundColor: colors.primary },
                          ]}
                        >
                          <Text
                            style={[
                              styles.yearGridText,
                              { color: isCurYear ? '#FFFFFF' : colors.black },
                              isCurYear && isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                            ]}
                          >
                            {y}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <>
                  {/* Weekdays Row */}
                  <View style={[styles.weekdaysRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {weekdays.map((wd, idx) => (
                      <View key={idx} style={styles.weekdayCell}>
                        <Text style={[styles.weekdayText, { color: colors.gray400 }]}>{wd}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Days Grid */}
                  <View style={[styles.daysGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {calendarDays.map((item, idx) => {
                      const isSelected = item.ymd === selectedYMD;
                      const isToday = item.ymd === todayStr;

                      return (
                        <View key={idx} style={styles.dayCellWrapper}>
                          <TouchableOpacity
                            onPress={() => handleSelectDay(item.ymd)}
                            activeOpacity={0.7}
                            style={[
                              styles.dayCircle,
                              isSelected && { backgroundColor: colors.primary },
                              !isSelected && isToday && {
                                borderWidth: 1.5,
                                borderColor: colors.primary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayNumber,
                                {
                                  color: isSelected
                                    ? '#FFFFFF'
                                    : !item.isCurrentMonth
                                    ? colors.gray300
                                    : colors.black,
                                },
                                isSelected && { fontWeight: '700' },
                              ]}
                            >
                              {item.day}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </View>

            {/* Direct Input & Live Display */}
            <View style={[styles.manualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.manualInputBox, { backgroundColor: isDark ? colors.gray50 : '#F8FAFC', borderColor: isDark ? colors.gray200 : '#E2E8F0', flexDirection }]}>
                <Ionicons name="create-outline" size={15} color={colors.primary} />
                <TextInput
                  style={[
                    styles.manualInput,
                    { color: colors.black, textAlign: 'center' },
                  ]}
                  value={manualInput}
                  onChangeText={handleManualInputChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.gray400}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Footer */}
          <View
            style={[
              styles.footerRow,
              {
                borderTopColor: isDark ? colors.gray200 : '#F1F5F9',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            {allowClear && (
              <TouchableOpacity
                onPress={handleClear}
                style={[
                  styles.clearActionBtn,
                  { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text
                  style={[
                    styles.clearActionText,
                    { color: '#EF4444' },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKurdish ? 'سڕینەوە' : 'Clear'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.cancelActionBtn,
                { borderColor: isDark ? colors.gray200 : '#CBD5E1' },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.cancelActionText,
                  { color: colors.gray600 },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {t('common.cancel', 'پاشگەزبوونەوە')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.confirmActionBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text
                style={[
                  styles.confirmActionText,
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKurdish ? 'پەسەندکردن' : 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    maxHeight: '90%',
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    padding: 14,
  },
  quickRow: {
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
    justifyContent: 'center',
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  calMonthHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  calTitleRow: {
    alignItems: 'center',
    gap: 6,
  },
  yearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  yearPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  todayBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  weekdaysRow: {
    marginBottom: 6,
  },
  weekdayCell: {
    width: '14.285%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexWrap: 'wrap',
  },
  dayCellWrapper: {
    width: '14.285%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: 13,
  },
  yearGridWrap: {
    paddingVertical: 8,
  },
  yearGridHeader: {
    fontSize: 12,
    marginBottom: 8,
  },
  yearGrid: {
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  yearGridItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  yearGridText: {
    fontSize: 13,
    fontWeight: '600',
  },
  manualRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  manualInputBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 8,
    width: '70%',
  },
  manualInput: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    padding: 0,
    letterSpacing: 0.5,
  },
  footerRow: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 8,
  },
  clearActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    gap: 4,
  },
  clearActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelActionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  confirmActionBtn: {
    flex: 1.5,
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
