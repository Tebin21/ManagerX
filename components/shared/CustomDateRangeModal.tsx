import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import { useResponsive } from '@/hooks/useResponsive';
import { useRTL } from '@/lib/rtl';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { toDateOnly } from '@/utils/formatters';

export interface CustomDateRangeModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (from: string, to: string) => void;
  initialFrom?: string | null;
  initialTo?: string | null;
  title?: string;
  subtitle?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function diffInDays(fromStr: string, toStr: string): number {
  if (!fromStr || !toStr) return 0;
  const from = parseYMD(fromStr);
  const to = parseYMD(toStr);
  const diff = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff) + 1;
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

// In Kurdish / Middle Eastern calendar, the week starts on Saturday (ش)
const KURDISH_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ه'];
const ENGLISH_WEEKDAYS = ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr'];

export function CustomDateRangeModal({
  visible,
  onClose,
  onApply,
  initialFrom,
  initialTo,
  title,
  subtitle,
}: CustomDateRangeModalProps) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const { isRTL, textAlign } = useRTL();
  const { isTablet, isTabletLandscape } = useResponsive();

  const todayDate = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toYMD(todayDate), [todayDate]);

  const [fromVal, setFromVal] = useState<string>('');
  const [toVal, setToVal] = useState<string>('');
  const [activeTarget, setActiveTarget] = useState<'from' | 'to'>('from');
  const [viewYear, setViewYear] = useState<number>(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(todayDate.getMonth()); // 0-11
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (visible) {
      const initFrom = initialFrom ? toDateOnly(initialFrom) : todayStr;
      const initTo = initialTo ? toDateOnly(initialTo) : todayStr;
      setFromVal(initFrom);
      setToVal(initTo);
      setActiveTarget('from');
      setShowManualInput(false);

      const targetD = parseYMD(initFrom || todayStr);
      setViewYear(targetD.getFullYear());
      setViewMonth(targetD.getMonth());

      // Detect if matches any quick preset
      checkPresetMatch(initFrom, initTo);
    }
  }, [visible, initialFrom, initialTo, todayStr]);

  // ── Presets ────────────────────────────────────────────────────────────────

  const presets = useMemo(() => {
    const now = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());

    // Today
    const todayYMD = toYMD(now);

    // Yesterday
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestYMD = toYMD(yest);

    // Last 7 days
    const l7 = new Date(now);
    l7.setDate(l7.getDate() - 6);
    const l7YMD = toYMD(l7);

    // This week (Saturday to Friday)
    const dow = now.getDay(); // 0 = Sun ... 6 = Sat
    const diffToSat = (dow + 1) % 7;
    const sat = new Date(now);
    sat.setDate(sat.getDate() - diffToSat);
    const fri = new Date(sat);
    fri.setDate(fri.getDate() + 6);

    // Last 30 days
    const l30 = new Date(now);
    l30.setDate(l30.getDate() - 29);
    const l30YMD = toYMD(l30);

    // This month
    const startM = new Date(now.getFullYear(), now.getMonth(), 1);
    const endM = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Last month
    const startLM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLM = new Date(now.getFullYear(), now.getMonth(), 0);

    // This year
    const startY = new Date(now.getFullYear(), 0, 1);
    const endY = new Date(now.getFullYear(), 11, 31);

    return [
      { key: 'today', label: isKurdish ? 'ئەمڕۆ' : 'Today', from: todayYMD, to: todayYMD },
      { key: 'yesterday', label: isKurdish ? 'دوێنێ' : 'Yesterday', from: yestYMD, to: yestYMD },
      { key: 'last7', label: isKurdish ? '٧ ڕۆژ' : 'Last 7 Days', from: l7YMD, to: todayYMD },
      { key: 'thisWeek', label: isKurdish ? 'ئەم هەفتەیە' : 'This Week', from: toYMD(sat), to: toYMD(fri) },
      { key: 'last30', label: isKurdish ? '٣٠ ڕۆژ' : 'Last 30 Days', from: l30YMD, to: todayYMD },
      { key: 'thisMonth', label: isKurdish ? 'ئەم مانگە' : 'This Month', from: toYMD(startM), to: toYMD(endM) },
      { key: 'lastMonth', label: isKurdish ? 'مانگی پێشوو' : 'Last Month', from: toYMD(startLM), to: toYMD(endLM) },
      { key: 'thisYear', label: isKurdish ? 'ئەمساڵ' : 'This Year', from: toYMD(startY), to: toYMD(endY) },
    ];
  }, [todayDate, isKurdish]);

  const checkPresetMatch = useCallback(
    (from: string, to: string) => {
      const match = presets.find((p) => p.from === from && p.to === to);
      setActivePreset(match ? match.key : null);
    },
    [presets]
  );

  const applyPreset = (preset: (typeof presets)[0]) => {
    setFromVal(preset.from);
    setToVal(preset.to);
    setActivePreset(preset.key);
    setActiveTarget('from');

    // Sync calendar month view
    const pDate = parseYMD(preset.from);
    setViewYear(pDate.getFullYear());
    setViewMonth(pDate.getMonth());
  };

  // ── Month Navigation ────────────────────────────────────────────────────────

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
    setViewYear(todayDate.getFullYear());
    setViewMonth(todayDate.getMonth());
  };

  // ── Calendar Grid Math ──────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    // Total days in current viewed month
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Day of week of 1st day (0 = Sun ... 6 = Sat)
    // Starting week on Saturday: (dow + 1) % 7
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const startOffset = (firstDow + 1) % 7;

    // Previous month filler days
    const prevMonthTotalDays = new Date(viewYear, viewMonth, 0).getDate();
    const prevFiller: { day: number; isCurrentMonth: false; ymd: string }[] = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      prevFiller.push({
        day: d,
        isCurrentMonth: false,
        ymd: `${prevY}-${pad2(prevM + 1)}-${pad2(d)}`,
      });
    }

    // Current month days
    const currentDays: { day: number; isCurrentMonth: true; ymd: string }[] = [];
    for (let d = 1; d <= totalDays; d++) {
      currentDays.push({
        day: d,
        isCurrentMonth: true,
        ymd: `${viewYear}-${pad2(viewMonth + 1)}-${pad2(d)}`,
      });
    }

    // Next month filler days to complete weeks
    const currentCount = prevFiller.length + currentDays.length;
    const remaining = currentCount % 7 === 0 ? 0 : 7 - (currentCount % 7);
    const nextFiller: { day: number; isCurrentMonth: false; ymd: string }[] = [];
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      nextFiller.push({
        day: d,
        isCurrentMonth: false,
        ymd: `${nextY}-${pad2(nextM + 1)}-${pad2(d)}`,
      });
    }

    return [...prevFiller, ...currentDays, ...nextFiller];
  }, [viewYear, viewMonth]);

  // ── Day Tap Logic ───────────────────────────────────────────────────────────

  const handleSelectDay = (ymd: string) => {
    setActivePreset(null);

    if (activeTarget === 'from') {
      setFromVal(ymd);
      // If new from is after current to, push toVal forward to match
      if (toVal && ymd > toVal) {
        setToVal(ymd);
      }
      // Auto-progress to selecting 'to'
      setActiveTarget('to');
    } else {
      // We are picking 'to'
      if (!fromVal || ymd < fromVal) {
        // Tapped before start date: reset start date to this day
        setFromVal(ymd);
        setActiveTarget('to');
      } else {
        setToVal(ymd);
        setActiveTarget('from');
      }
    }
  };

  // ── Confirm / Cancel ────────────────────────────────────────────────────────

  const handleConfirm = () => {
    if (!fromVal || !toVal) {
      Alert.alert(t('common.required'), t('purchases.validationDate'));
      return;
    }
    if (fromVal > toVal) {
      Alert.alert(t('common.error'), t('reports.invalidDateRange'));
      return;
    }
    onApply(fromVal, toVal);
    onClose();
  };

  const selectedDaysCount = diffInDays(fromVal, toVal);
  const monthName = isKurdish ? KURDISH_MONTHS[viewMonth] : ENGLISH_MONTHS[viewMonth];
  const weekdays = isKurdish ? KURDISH_WEEKDAYS : ENGLISH_WEEKDAYS;

  // Responsive modal dimensions
  const modalBoxWidth = isTabletLandscape ? 560 : isTablet ? 500 : '92%';
  const modalMaxHeight = isTablet ? 660 : 610;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalBox,
            {
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              borderColor: isDark ? colors.gray200 : '#E2E8F0',
              width: modalBoxWidth,
              maxHeight: modalMaxHeight,
            },
          ]}
        >
          {/* ── 1. Header ── */}
          <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.headerIconBox, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
            </View>
            <View style={[styles.headerTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.black, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {title ?? t('reports.customRange')}
              </Text>
              <Text style={[styles.modalSub, { color: colors.gray400, textAlign }]}>
                {subtitle ?? t('reports.chooseCustomRange')}
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
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {/* ── 2. Quick Presets Bar ── */}
            <View style={styles.presetsSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.presetsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                {presets.map((p) => {
                  const isActive = activePreset === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      onPress={() => applyPreset(p)}
                      activeOpacity={0.75}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isActive ? colors.primary : isDark ? colors.gray200 : colors.gray100,
                          borderColor: isActive ? colors.primary : isDark ? colors.gray300 : '#E2E8F0',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          { color: isActive ? '#FFFFFF' : isDark ? colors.gray400 : colors.gray700 },
                          isActive && isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── 3. Range Indicator Cards (From & To) ── */}
            <View style={[styles.rangeCardsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* FROM CARD */}
              <TouchableOpacity
                onPress={() => setActiveTarget('from')}
                activeOpacity={0.8}
                style={[
                  styles.rangeCard,
                  {
                    borderColor: activeTarget === 'from' ? colors.primary : isDark ? colors.gray200 : '#E2E8F0',
                    backgroundColor:
                      activeTarget === 'from' ? colors.primary + '12' : isDark ? colors.gray50 : '#F8FAFC',
                  },
                ]}
              >
                <View style={[styles.rangeCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={activeTarget === 'from' ? colors.primary : colors.gray400}
                  />
                  <Text
                    style={[
                      styles.rangeCardLabel,
                      { color: activeTarget === 'from' ? colors.primary : colors.gray500 },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                    ]}
                  >
                    {t('reports.fromDate')}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.rangeCardValue,
                    { color: colors.black },
                    activeTarget === 'from' && isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                  numberOfLines={1}
                >
                  {fromVal || 'YYYY-MM-DD'}
                </Text>
              </TouchableOpacity>

              {/* ARROW / CONNECTOR */}
              <View style={styles.rangeArrowBox}>
                <Ionicons
                  name={isRTL ? 'arrow-back' : 'arrow-forward'}
                  size={16}
                  color={colors.primary}
                />
                {selectedDaysCount > 0 && (
                  <View style={[styles.daysBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.daysBadgeText, { color: colors.primary }]}>
                      {selectedDaysCount} {isKurdish ? 'ڕۆژ' : 'd'}
                    </Text>
                  </View>
                )}
              </View>

              {/* TO CARD */}
              <TouchableOpacity
                onPress={() => setActiveTarget('to')}
                activeOpacity={0.8}
                style={[
                  styles.rangeCard,
                  {
                    borderColor: activeTarget === 'to' ? colors.primary : isDark ? colors.gray200 : '#E2E8F0',
                    backgroundColor:
                      activeTarget === 'to' ? colors.primary + '12' : isDark ? colors.gray50 : '#F8FAFC',
                  },
                ]}
              >
                <View style={[styles.rangeCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={activeTarget === 'to' ? colors.primary : colors.gray400}
                  />
                  <Text
                    style={[
                      styles.rangeCardLabel,
                      { color: activeTarget === 'to' ? colors.primary : colors.gray500 },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                    ]}
                  >
                    {t('reports.toDate')}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.rangeCardValue,
                    { color: colors.black },
                    activeTarget === 'to' && isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                  numberOfLines={1}
                >
                  {toVal || 'YYYY-MM-DD'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── 4. Interactive Calendar ── */}
            <View style={[styles.calendarContainer, { backgroundColor: isDark ? colors.gray50 : '#F8FAFC', borderColor: isDark ? colors.gray200 : '#E2E8F0' }]}>
              {/* Calendar Month Header */}
              <View style={[styles.calMonthHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  onPress={isRTL ? nextMonth : prevMonth}
                  style={[styles.calNavBtn, { backgroundColor: isDark ? colors.gray200 : '#FFFFFF' }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-back" size={17} color={colors.black} />
                </TouchableOpacity>

                <View style={[styles.calMonthTitleWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text
                    style={[
                      styles.calMonthTitle,
                      { color: colors.black },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                    ]}
                  >
                    {monthName} {viewYear}
                  </Text>
                  {(viewYear !== todayDate.getFullYear() || viewMonth !== todayDate.getMonth()) && (
                    <TouchableOpacity
                      onPress={jumpToToday}
                      style={[styles.todayJumpBtn, { backgroundColor: colors.primary + '18' }]}
                    >
                      <Text style={[styles.todayJumpText, { color: colors.primary }]}>
                        {t('reports.todayShortcut')}
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
                  const isStart = item.ymd === fromVal;
                  const isEnd = item.ymd === toVal;
                  const isBetween = fromVal && toVal && item.ymd > fromVal && item.ymd < toVal;
                  const isToday = item.ymd === todayStr;

                  return (
                    <View key={idx} style={styles.dayCellWrapper}>
                      {/* Range track background */}
                      {isBetween && (
                        <View
                          style={[
                            styles.rangeTrackBar,
                            { backgroundColor: colors.primary + '22' },
                          ]}
                        />
                      )}
                      {isStart && toVal && toVal > fromVal && (
                        <View
                          style={[
                            styles.rangeTrackBarStart,
                            isRTL ? { left: 0, width: '50%' } : { right: 0, width: '50%' },
                            { backgroundColor: colors.primary + '22' },
                          ]}
                        />
                      )}
                      {isEnd && fromVal && fromVal < toVal && (
                        <View
                          style={[
                            styles.rangeTrackBarEnd,
                            isRTL ? { right: 0, width: '50%' } : { left: 0, width: '50%' },
                            { backgroundColor: colors.primary + '22' },
                          ]}
                        />
                      )}

                      {/* Day Pill Button */}
                      <TouchableOpacity
                        onPress={() => handleSelectDay(item.ymd)}
                        activeOpacity={0.75}
                        style={[
                          styles.dayButton,
                          isToday && !isStart && !isEnd && { borderColor: colors.primary, borderWidth: 1.2 },
                          (isStart || isEnd) && {
                            backgroundColor: colors.primary,
                            shadowColor: colors.primary,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.35,
                            shadowRadius: 4,
                            elevation: 3,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            {
                              color: isStart || isEnd
                                ? '#FFFFFF'
                                : !item.isCurrentMonth
                                ? colors.gray300
                                : isToday
                                ? colors.primary
                                : colors.black,
                            },
                            (isStart || isEnd || isToday) && { fontWeight: '700' },
                          ]}
                        >
                          {item.day}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── 5. Optional Manual Input Accordion ── */}
            <TouchableOpacity
              onPress={() => setShowManualInput(!showManualInput)}
              style={[styles.manualToggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <Ionicons
                name={showManualInput ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.gray400}
              />
              <Text style={[styles.manualToggleText, { color: colors.gray500 }]}>
                {t('reports.manualEntry')}
              </Text>
            </TouchableOpacity>

            {showManualInput && (
              <View style={[styles.manualInputsBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.manualField}>
                  <Text style={[styles.manualFieldLabel, { color: colors.gray500, textAlign }]}>
                    {t('reports.fromDate')}
                  </Text>
                  <TextInput
                    style={[
                      styles.manualInput,
                      {
                        backgroundColor: isDark ? colors.gray200 : '#FFFFFF',
                        borderColor: isDark ? colors.gray300 : '#E2E8F0',
                        color: colors.black,
                      },
                    ]}
                    value={fromVal}
                    onChangeText={setFromVal}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.gray400}
                    maxLength={10}
                    textAlign="center"
                  />
                </View>

                <View style={styles.manualField}>
                  <Text style={[styles.manualFieldLabel, { color: colors.gray500, textAlign }]}>
                    {t('reports.toDate')}
                  </Text>
                  <TextInput
                    style={[
                      styles.manualInput,
                      {
                        backgroundColor: isDark ? colors.gray200 : '#FFFFFF',
                        borderColor: isDark ? colors.gray300 : '#E2E8F0',
                        color: colors.black,
                      },
                    ]}
                    value={toVal}
                    onChangeText={setToVal}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.gray400}
                    maxLength={10}
                    textAlign="center"
                  />
                </View>
              </View>
            )}
          </ScrollView>

          {/* ── 6. Modal Actions (Cancel / Apply) ── */}
          <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[
                styles.modalCancel,
                {
                  borderColor: isDark ? colors.gray200 : '#E2E8F0',
                  backgroundColor: isDark ? colors.gray200 : '#FFFFFF',
                },
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modalCancelText,
                  { color: isDark ? colors.gray400 : '#64748B' },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalConfirm,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.modalConfirmText,
                  { color: '#FFFFFF' },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('reports.apply')}
                {selectedDaysCount > 0 ? ` (${selectedDaysCount} ${isKurdish ? 'ڕۆژ' : 'days'})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },

  // Presets
  presetsSection: {
    marginBottom: 12,
  },
  presetsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Range Cards
  rangeCardsRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  rangeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  rangeCardHeader: {
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  rangeCardLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  rangeCardValue: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  rangeArrowBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  daysBadge: {
    marginTop: 3,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  daysBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Calendar
  calendarContainer: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  calMonthTitleWrap: {
    alignItems: 'center',
    gap: 8,
  },
  calMonthTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  todayJumpBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  todayJumpText: {
    fontSize: 11,
    fontWeight: '700',
  },
  weekdaysRow: {
    width: '100%',
    marginBottom: 4,
  },
  weekdayCell: {
    width: '14.285%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  daysGrid: {
    width: '100%',
    flexWrap: 'wrap',
  },
  dayCellWrapper: {
    width: '14.285%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 1,
  },
  rangeTrackBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  rangeTrackBarStart: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  rangeTrackBarEnd: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  dayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dayText: {
    fontSize: 12.5,
  },

  // Manual input
  manualToggleRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  manualToggleText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  manualInputsBox: {
    gap: 12,
    marginTop: 6,
    marginBottom: 4,
  },
  manualField: {
    flex: 1,
  },
  manualFieldLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  manualInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 13,
  },

  // Modal Actions
  modalActions: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirm: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
