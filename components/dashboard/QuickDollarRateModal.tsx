import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useSettingsStore } from '@/store/settingsStore';
import { useManagementStore } from '@/store/managementStore';
import { useLanguageStore } from '@/store/languageStore';
import { toEnglishDigits } from '@/utils/formatters';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

interface QuickDollarRateModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Pure number formatter that strictly uses commas, immune to Arabic dot-grouping bugs */
const formatComma = (val: number | string): string => {
  const str = String(val).replace(/[^0-9]/g, '');
  if (!str) return '';
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export function QuickDollarRateModal({ visible, onClose }: QuickDollarRateModalProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  const currentLang = useLanguageStore((s) => s.language);
  const isKu = currentLang === 'ku';
  const isAr = currentLang === 'ar';
  const isKuOrAr = isKu || isAr;

  const exchangeRate = useSettingsStore((s) => s.exchangeRate);
  const setExchangeRate = useSettingsStore((s) => s.setExchangeRate);

  const isEmployee = useManagementStore((s) => s.isEmployee);
  const currentPermissions = useManagementStore((s) => s.currentPermissions);
  const canChangeExchangeRate = isEmployee
    ? (currentPermissions?.subPermissions?.canChangeExchangeRate ?? true)
    : true;

  const [input, setInput] = useState<string>('');

  // Sync initial value when modal opens
  useEffect(() => {
    if (visible) {
      setInput(String(Math.round((exchangeRate || 1500) * 100)));
    }
  }, [visible, exchangeRate]);

  // Calculate parsed rate & preview
  const { cleanNumber, calculatedRate, isValid, diff } = useMemo(() => {
    const rawDigits = toEnglishDigits(input).replace(/[^0-9]/g, '');
    const num = parseInt(rawDigits, 10) || 0;
    const calc = num >= 10000 ? num / 100 : (num >= 500 ? num : 0);
    const valid = calc >= 500 && calc <= 50000;
    const rateDiff = valid ? Math.round((calc - exchangeRate) * 100) : 0;
    return {
      cleanNumber: num,
      calculatedRate: calc,
      isValid: valid,
      diff: rateDiff,
    };
  }, [input, exchangeRate]);

  // Instant save & close without blocking
  const handleSave = () => {
    if (!canChangeExchangeRate) {
      Alert.alert(t('common.error'), t('dashboard.quickMenu.noPermission'));
      return;
    }

    if (!isValid) {
      Alert.alert(t('common.error'), t('dashboard.quickMenu.invalidRate'));
      return;
    }

    // Immediately close modal and trigger haptic feedback ("لەگەڵ دەستنان بە دوگمەی تۆماردکردن یەکسەر پەیجەکە داخرێتەوە")
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();

    // Persist new rate in background
    if (calculatedRate !== exchangeRate) {
      setExchangeRate(calculatedRate).catch(() => {});
    }
  };

  if (!visible) return null;

  const modalWidth = isTablet ? 480 : Math.min(windowWidth - 36, 400);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.modalCard,
            {
              width: modalWidth,
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? 'rgba(212, 175, 55, 0.3)' : '#E2E8F0',
            },
          ]}
        >
          {/* 1. Header with Dollar Icon & Close */}
          <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View
                style={[
                  styles.headerIconWrap,
                  {
                    backgroundColor: isDark ? 'rgba(212, 175, 55, 0.2)' : '#FEF9C3',
                    borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : '#FDE047',
                  },
                ]}
              >
                <Ionicons name="logo-usd" size={20} color={colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: colors.black, textAlign },
                    isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {t('dashboard.quickMenu.modalTitle')}
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: colors.gray500, textAlign },
                    isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                  numberOfLines={1}
                >
                  {t('dashboard.quickMenu.modalSub')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? colors.gray200 : '#F1F5F9' }]}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          {/* 2. Beautiful Simple Table Card ("تەبلێ سادە لە ناوەراست") */}
          <View
            style={[
              styles.tableCard,
              {
                backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                borderColor: isDark ? colors.gray300 : '#E2E8F0',
              },
            ]}
          >
            {/* Table Two Columns: Old Rate vs New Rate */}
            <View style={[styles.tableColumnsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* Old Rate Column */}
              <View style={[styles.tableCol, { alignItems: 'center' }]}>
                <View style={[styles.colBadge, { backgroundColor: isDark ? 'rgba(100, 116, 139, 0.2)' : '#E2E8F0' }]}>
                  <Text
                    style={[
                      styles.colBadgeText,
                      { color: colors.gray600 },
                      isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {t('dashboard.quickMenu.oldRate')}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={[styles.colRateText, { color: colors.gray600, writingDirection: 'ltr' }]}>
                    {formatComma(Math.round(exchangeRate * 100))}
                  </Text>
                  <Text style={[styles.colCurrencyText, { color: colors.gray500 }]}>IQD</Text>
                </View>

                <Text style={[styles.colSubRateText, { color: colors.gray400, writingDirection: 'ltr' }]}>
                  100$ = {formatComma(Math.round(exchangeRate * 100))}
                </Text>
              </View>

              {/* Vertical Center Divider */}
              <View style={[styles.colDivider, { backgroundColor: isDark ? colors.gray300 : '#CBD5E1' }]} />

              {/* New Rate Column */}
              <View style={[styles.tableCol, { alignItems: 'center' }]}>
                <View
                  style={[
                    styles.colBadge,
                    {
                      backgroundColor: isDark ? 'rgba(212, 175, 55, 0.2)' : '#FEF3C7',
                      borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : '#FDE68A',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.colBadgeText,
                      { color: isDark ? '#FDE047' : '#B45309' },
                      isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {t('dashboard.quickMenu.newRate')}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text
                    style={[
                      styles.colRateText,
                      {
                        color: isValid ? (isDark ? '#FDE047' : colors.primary) : colors.gray400,
                        fontWeight: '800',
                        writingDirection: 'ltr',
                      },
                    ]}
                  >
                    {isValid ? formatComma(Math.round(calculatedRate * 100)) : '---'}
                  </Text>
                  <Text style={[styles.colCurrencyText, { color: isValid ? (isDark ? '#FDE047' : colors.primary) : colors.gray400 }]}>IQD</Text>
                </View>

                <Text style={[styles.colSubRateText, { color: colors.gray400, writingDirection: 'ltr' }]}>
                  {isValid ? `100$ = ${formatComma(Math.round(calculatedRate * 100))}` : '---'}
                </Text>
              </View>
            </View>

            {/* Table Bottom Row: Rate Difference Pill */}
            <View
              style={[
                styles.diffRow,
                {
                  borderTopColor: isDark ? colors.gray300 : '#E2E8F0',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Text
                style={[
                  styles.diffLabel,
                  { color: colors.gray500 },
                  isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {t('dashboard.quickMenu.diff')}:
              </Text>

              <View
                style={[
                  styles.diffPill,
                  diff > 0
                    ? { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5', borderColor: '#10B981' }
                    : diff < 0
                    ? { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FEF2F2', borderColor: '#EF4444' }
                    : { backgroundColor: isDark ? colors.gray300 : '#F1F5F9', borderColor: colors.gray300 },
                ]}
              >
                <Ionicons
                  name={diff > 0 ? 'trending-up' : diff < 0 ? 'trending-down' : 'remove-outline'}
                  size={14}
                  color={diff > 0 ? '#10B981' : diff < 0 ? '#EF4444' : colors.gray500}
                />
                <Text
                  style={[
                    styles.diffValueText,
                    {
                      color: diff > 0 ? '#10B981' : diff < 0 ? '#EF4444' : colors.gray500,
                      writingDirection: 'ltr',
                    },
                  ]}
                >
                  {diff > 0 ? `+${formatComma(diff)}` : `${formatComma(diff)}`} IQD
                </Text>
              </View>
            </View>
          </View>

          {/* 3. Responsive Clean Input Section */}
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: colors.black, marginBottom: 0 },
                  isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isAr ? 'سعر الـ 100$ الجديد' : isKu ? 'نرخی نوێی 100$' : 'New 100$ Rate'}
              </Text>
              <Text
                style={[
                  styles.inputSubLabel,
                  { color: colors.gray400 },
                  isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                ({isAr ? 'بالدينار' : isKu ? 'بە دینار' : 'IQD'}):
              </Text>
            </View>

            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                  borderColor: isDark ? colors.gray300 : '#CBD5E1',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                },
              ]}
            >
              {/* 100$ Badge */}
              <View
                style={[
                  styles.inputBadge,
                  {
                    backgroundColor: isDark ? 'rgba(212, 175, 55, 0.18)' : '#FEF3C7',
                    borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : '#FDE68A',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.inputBadgeText,
                    {
                      color: isDark ? '#FDE047' : '#B45309',
                      writingDirection: 'ltr',
                    },
                  ]}
                >
                  100$ =
                </Text>
              </View>

              <TextInput
                style={[
                  styles.inputField,
                  {
                    color: colors.black,
                    textAlign: 'center',
                  },
                ]}
                keyboardType="numeric"
                value={cleanNumber ? formatComma(cleanNumber) : ''}
                onChangeText={(val) => setInput(val.replace(/[^0-9]/g, ''))}
                placeholder="150,000"
                placeholderTextColor={colors.gray400}
                selectTextOnFocus
              />

              {/* IQD Badge */}
              <View
                style={[
                  styles.inputBadge,
                  {
                    backgroundColor: isDark ? colors.gray300 : '#E2E8F0',
                    borderColor: isDark ? colors.gray300 : '#CBD5E1',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.inputBadgeText,
                    {
                      color: colors.gray600,
                      writingDirection: 'ltr',
                    },
                  ]}
                >
                  IQD
                </Text>
              </View>
            </View>
          </View>

          {/* 4. Action Buttons (Save & Cancel) */}
          <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: isDark ? colors.gray200 : '#F1F5F9',
                  borderColor: isDark ? colors.gray300 : '#CBD5E1',
                },
              ]}
              onPress={onClose}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.cancelBtnText,
                  { color: colors.gray600 },
                  isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {t('dashboard.quickMenu.cancelBtn')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: !isValid ? 0.6 : 1,
                },
              ]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={!isValid}
            >
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text
                  style={[
                    styles.saveBtnText,
                    { color: '#FFFFFF' },
                    isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {t('dashboard.quickMenu.saveBtn')}
                </Text>
              </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableColumnsRow: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableCol: {
    flex: 1,
  },
  colBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 6,
  },
  colBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  colRateText: {
    fontSize: 16,
    fontWeight: '700',
  },
  colCurrencyText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  colSubRateText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  colDivider: {
    width: 1,
    height: 48,
  },
  diffRow: {
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  diffLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  diffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  diffValueText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputSubLabel: {
    fontSize: 11.5,
  },
  inputWrapper: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    paddingHorizontal: 6,
  },
  inputBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputField: {
    flex: 1,
    fontSize: 21,
    fontWeight: '800',
    paddingHorizontal: 8,
    height: '100%',
  },
  actionsRow: {
    marginTop: 18,
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
