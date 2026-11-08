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
import { toDateOnly, fmtUSD, fmtIQD } from '@/utils/formatters';

export interface CustomInstallmentModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (months: number, startDate?: string, endDate?: string) => void;
  initialMonths?: number;
  startDate?: Date;
  remainingBalance?: number;
  isUSD?: boolean;
  exchangeRate?: number;
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

function addMonthsToDate(baseDate: Date, months: number): Date {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  d.setMonth(d.getMonth() + months);
  return d;
}

function diffInDays(fromStr: string, toStr: string): number {
  if (!fromStr || !toStr) return 0;
  const from = parseYMD(fromStr);
  const to = parseYMD(toStr);
  const diff = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function calcMonthsBetween(fromStr: string, toStr: string): number {
  if (!fromStr || !toStr) return 1;
  const from = parseYMD(fromStr);
  const to = parseYMD(toStr);
  const yearDiff = to.getFullYear() - from.getFullYear();
  const monthDiff = to.getMonth() - from.getMonth();
  const totalMonthDiff = yearDiff * 12 + monthDiff;
  const dayDiff = to.getDate() - from.getDate();
  const rawMonths = totalMonthDiff + dayDiff / 30;
  return Math.max(1, Math.round(rawMonths));
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

const QUICK_MONTH_PRESETS = [1, 2, 3, 6, 9, 12, 18, 24, 36];

export function CustomInstallmentModal({
  visible,
  onClose,
  onApply,
  initialMonths = 6,
  startDate,
  remainingBalance = 0,
  isUSD = false,
  exchangeRate = 1310,
}: CustomInstallmentModalProps) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet, isTabletLandscape } = useResponsive();

  const baseDate = useMemo(() => startDate || new Date(), [startDate]);
  const baseDateStr = useMemo(() => toYMD(baseDate), [baseDate]);

  const [fromVal, setFromVal] = useState<string>(baseDateStr);
  const [toVal, setToVal] = useState<string>(() => toYMD(addMonthsToDate(baseDate, initialMonths)));
  const [selectedMonths, setSelectedMonths] = useState<number>(initialMonths);
  const [activeTarget, setActiveTarget] = useState<'from' | 'to'>('to');

  const [viewYear, setViewYear] = useState<number>(baseDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(baseDate.getMonth());

  // Reset or sync when modal becomes visible
  useEffect(() => {
    if (visible) {
      const startStr = startDate ? toDateOnly(startDate.toISOString()) : toYMD(new Date());
      const m = Math.max(1, initialMonths || 6);
      const endD = addMonthsToDate(parseYMD(startStr), m);
      const endStr = toYMD(endD);

      setFromVal(startStr);
      setToVal(endStr);
      setSelectedMonths(m);
      setActiveTarget('to');

      setViewYear(endD.getFullYear());
      setViewMonth(endD.getMonth());
    }
  }, [visible, initialMonths, startDate]);

  // Handle Preset month selection
  const handleSelectPreset = (months: number) => {
    setSelectedMonths(months);
    const startD = parseYMD(fromVal || baseDateStr);
    const newEndD = addMonthsToDate(startD, months);
    const newEndStr = toYMD(newEndD);
    setToVal(newEndStr);
    setViewYear(newEndD.getFullYear());
    setViewMonth(newEndD.getMonth());
  };

  // Month navigation in calendar
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

  // Calendar Days calculation
  const calendarDays = useMemo(() => {
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const startOffset = (firstDow + 1) % 7;

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

    const currentDays: { day: number; isCurrentMonth: true; ymd: string }[] = [];
    for (let d = 1; d <= totalDays; d++) {
      currentDays.push({
        day: d,
        isCurrentMonth: true,
        ymd: `${viewYear}-${pad2(viewMonth + 1)}-${pad2(d)}`,
      });
    }

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

  // Handle day tap in calendar
  const handleSelectDay = (ymd: string) => {
    if (activeTarget === 'from') {
      setFromVal(ymd);
      if (toVal && ymd > toVal) {
        // Push toVal forward
        const newTo = toYMD(addMonthsToDate(parseYMD(ymd), selectedMonths));
        setToVal(newTo);
      } else {
        const m = calcMonthsBetween(ymd, toVal);
        setSelectedMonths(m);
      }
      setActiveTarget('to');
    } else {
      // Picking 'to' (End date)
      if (fromVal && ymd < fromVal) {
        setFromVal(ymd);
        setActiveTarget('to');
      } else {
        setToVal(ymd);
        const m = calcMonthsBetween(fromVal, ymd);
        setSelectedMonths(m);
      }
    }
  };

  const handleAdjustMonths = (delta: number) => {
    const next = Math.max(1, Math.min(120, selectedMonths + delta));
    setSelectedMonths(next);
    const startD = parseYMD(fromVal || baseDateStr);
    const newEndD = addMonthsToDate(startD, next);
    const newEndStr = toYMD(newEndD);
    setToVal(newEndStr);
    setViewYear(newEndD.getFullYear());
    setViewMonth(newEndD.getMonth());
  };

  const handleConfirm = () => {
    if (selectedMonths < 1) {
      Alert.alert(t('common.error'), isKurdish ? 'ماوەی قیست نابێت کەمتر بێت لە ١ مانگ' : 'Installment must be at least 1 month');
      return;
    }
    onApply(selectedMonths, fromVal, toVal);
    onClose();
  };

  const daysCount = diffInDays(fromVal, toVal);
  const monthName = isKurdish ? KURDISH_MONTHS[viewMonth] : ENGLISH_MONTHS[viewMonth];
  const weekdays = isKurdish ? KURDISH_WEEKDAYS : ENGLISH_WEEKDAYS;

  // Monthly breakdown calculation
  const monthlyIQD = selectedMonths > 0 ? Math.round(remainingBalance / selectedMonths) : 0;
  const monthlyUSD = exchangeRate ? Math.round((monthlyIQD / exchangeRate) * 100) / 100 : 0;

  const modalBoxWidth = isTabletLandscape ? 560 : isTablet ? 500 : '92%';
  const modalMaxHeight = isTablet ? 680 : 640;

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
          {/* 1. Header */}
          <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.headerIconBox, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
            </View>
            <View style={[styles.headerTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.black, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKurdish ? 'دیاریکردنی ماوەی قیست' : 'Custom Installment Duration'}
              </Text>
              <Text style={[styles.modalSub, { color: colors.gray400, textAlign }, isKurdish && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                {isKurdish ? 'دەستپێک و کۆتایی قیست دیاری بکە' : 'Select installment start and end dates'}
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
            {/* 2. Quick Presets Bar */}
            <View style={styles.presetsSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.presetsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                {QUICK_MONTH_PRESETS.map((m) => {
                  const isActive = selectedMonths === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() => handleSelectPreset(m)}
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
                          isKurdish && { fontFamily: isActive ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                        ]}
                      >
                        {m} {isKurdish ? 'مانگ' : 'mo'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 3. Range Indicator Cards (From & To) */}
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
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isKurdish ? 'لە (دەستپێک)' : 'From'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.rangeCardValue,
                    { color: colors.black },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                  numberOfLines={1}
                >
                  {fromVal || 'YYYY-MM-DD'}
                </Text>
              </TouchableOpacity>

              {/* ARROW / CONNECTOR WITH MONTHS BADGE */}
              <View style={styles.rangeArrowBox}>
                <Ionicons
                  name={isRTL ? 'arrow-back' : 'arrow-forward'}
                  size={16}
                  color={colors.primary}
                />
                <View style={[styles.monthsBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.monthsBadgeText, { color: colors.primary }, isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {selectedMonths} {isKurdish ? 'مانگ' : 'mo'}
                  </Text>
                </View>
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
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isKurdish ? 'بۆ (کۆتایی)' : 'To'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.rangeCardValue,
                    { color: colors.black },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                  numberOfLines={1}
                >
                  {toVal || 'YYYY-MM-DD'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 4. Months Stepper Controls */}
            <View style={[styles.stepperContainer, { backgroundColor: isDark ? colors.gray50 : '#F8FAFC', borderColor: isDark ? colors.gray200 : '#E2E8F0' }]}>
              <View style={[styles.stepperRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[{ fontSize: 13, color: colors.gray500 }, isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                  {isKurdish ? 'دیاریکردنی ژمارەی مانگەکان:' : 'Set number of months:'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleAdjustMonths(-1)}
                    activeOpacity={0.7}
                    style={[styles.stepBtn, { backgroundColor: isDark ? colors.gray200 : '#E2E8F0' }]}
                  >
                    <Ionicons name="remove" size={18} color={colors.black} />
                  </TouchableOpacity>

                  <View style={[styles.stepValueBox, { borderColor: colors.primary, backgroundColor: isDark ? colors.gray100 : '#FFFFFF' }]}>
                    <Text style={[styles.stepValueText, { color: colors.primary }, isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                      {selectedMonths} {isKurdish ? 'مانگ' : 'mo'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleAdjustMonths(1)}
                    activeOpacity={0.7}
                    style={[styles.stepBtn, { backgroundColor: isDark ? colors.gray200 : '#E2E8F0' }]}
                  >
                    <Ionicons name="add" size={18} color={colors.black} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 5. Calendar Navigator */}
            <View style={[styles.calMonthNav, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={isRTL ? nextMonth : prevMonth}
                style={[styles.navBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name={isRTL ? 'chevron-forward' : 'chevron-back'}
                  size={18}
                  color={colors.black}
                />
              </TouchableOpacity>

              <Text
                style={[
                  styles.navMonthTitle,
                  { color: colors.black },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {monthName} {viewYear}
              </Text>

              <TouchableOpacity
                onPress={isRTL ? prevMonth : nextMonth}
                style={[styles.navBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name={isRTL ? 'chevron-back' : 'chevron-forward'}
                  size={18}
                  color={colors.black}
                />
              </TouchableOpacity>
            </View>

            {/* 6. Calendar Weekdays Header */}
            <View style={[styles.weekdaysRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {weekdays.map((w, idx) => (
                <View key={idx} style={styles.weekdayCell}>
                  <Text
                    style={[
                      styles.weekdayText,
                      { color: colors.gray400 },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {w}
                  </Text>
                </View>
              ))}
            </View>

            {/* 7. Calendar Days Grid */}
            <View style={[styles.daysGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {calendarDays.map((item, idx) => {
                const isFrom = item.ymd === fromVal;
                const isTo = item.ymd === toVal;
                const inRange =
                  fromVal && toVal && item.ymd > fromVal && item.ymd < toVal;
                const isSelected = isFrom || isTo;

                let cellBg: string = 'transparent';
                if (isSelected) {
                  cellBg = colors.primary;
                } else if (inRange) {
                  cellBg = colors.primary + '1A';
                }

                let textColor: string = colors.black;
                if (!item.isCurrentMonth) {
                  textColor = isDark ? colors.gray400 : '#94A3B8';
                }
                if (isSelected) {
                  textColor = '#FFFFFF';
                } else if (inRange) {
                  textColor = colors.primary;
                }

                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleSelectDay(item.ymd)}
                    activeOpacity={0.7}
                    style={[
                      styles.dayCell,
                      { backgroundColor: cellBg },
                      isSelected && styles.dayCellSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: textColor },
                        (isSelected || inRange) && isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        !isSelected && !inRange && isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                      ]}
                    >
                      {item.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 8. Live Monthly Installment Summary inside Modal */}
            <View style={[styles.summaryBanner, { backgroundColor: isDark ? '#1E293B' : '#FEFCE8', borderColor: isDark ? '#334155' : '#FEF08A' }]}>
              <View style={[{ flexDirection, justifyContent: 'space-between', alignItems: 'center' }]}>
                <View>
                  <Text style={[{ fontSize: 12, color: colors.gray400 }, isKurdish && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                    {isKurdish ? 'قیستی مانگانەی مەزەندەکراو:' : 'Estimated monthly payment:'}
                  </Text>
                  <Text style={[{ fontSize: 11, color: colors.gray400, marginTop: 1 }, isKurdish && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                    ({daysCount} {isKurdish ? 'ڕۆژ' : 'days'} • {selectedMonths} {isKurdish ? 'مانگ' : 'months'})
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.summaryAmountText, { color: '#D4AF37' }]}>
                    {isUSD ? `$${fmtUSD(monthlyUSD)}` : fmtIQD(monthlyIQD)}
                  </Text>
                  {isUSD && (
                    <Text style={{ fontSize: 11, color: colors.gray400 }}>
                      ≈ {fmtIQD(monthlyIQD)}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* 9. Bottom Actions */}
          <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.85}
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginEnd: 4 }} />
              <Text
                style={[
                  styles.applyBtnText,
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKurdish ? `جێبەجێکردن (${selectedMonths} مانگ)` : `Apply (${selectedMonths} mo)`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={[
                styles.cancelBtn,
                {
                  borderColor: isDark ? colors.gray200 : '#E2E8F0',
                  backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                },
              ]}
            >
              <Text
                style={[
                  styles.cancelBtnText,
                  { color: isDark ? colors.gray400 : colors.gray600 },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {isKurdish ? 'پاشگەزبوونەوە' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F040',
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  presetsSection: {
    marginBottom: 2,
  },
  presetsRow: {
    gap: 6,
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
  rangeCardsRow: {
    alignItems: 'center',
    gap: 8,
  },
  rangeCard: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  rangeCardHeader: {
    alignItems: 'center',
    gap: 4,
  },
  rangeCardLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  rangeCardValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  rangeArrowBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  monthsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  monthsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stepperContainer: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  stepperRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValueBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  stepValueText: {
    fontSize: 14,
    fontWeight: '700',
  },
  calMonthNav: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 2,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navMonthTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  weekdaysRow: {
    justifyContent: 'space-around',
    paddingVertical: 6,
  },
  weekdayCell: {
    width: 38,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 4,
  },
  dayCell: {
    width: 38,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    borderRadius: 10,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  summaryAmountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F040',
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
  },
});

