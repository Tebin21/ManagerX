import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { toEnglishDigits } from '@/utils/formatters';

export interface CustomAlertDaysModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (days: number) => void;
  initialDays?: number;
}

const QUICK_SUGGESTIONS = [1, 3, 5, 10, 20, 45, 120, 180, 365];

export function CustomAlertDaysModal({
  visible,
  onClose,
  onApply,
  initialDays = 30,
}: CustomAlertDaysModalProps) {
  const { colors, isDark } = useAppTheme();
  const lang = useLanguageStore((s) => s.language);
  const isKu = lang === 'ku';
  const isAr = lang === 'ar';
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet } = useResponsive();

  const [daysText, setDaysText] = useState(String(initialDays));

  useEffect(() => {
    if (visible) {
      setDaysText(String(initialDays > 0 ? initialDays : 30));
    }
  }, [visible, initialDays]);

  const currentVal = parseInt(daysText, 10);
  const isValid = !isNaN(currentVal) && currentVal >= 1 && currentVal <= 9999;

  const handleStep = (delta: number) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    const base = isNaN(currentVal) ? 30 : currentVal;
    const nextVal = Math.max(1, Math.min(9999, base + delta));
    setDaysText(String(nextVal));
  };

  const handleSelectSuggestion = (val: number) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    setDaysText(String(val));
  };

  const handleConfirm = () => {
    if (!isValid) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
    onApply(currentVal);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardWrap}
          >
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : colors.gray200,
                  maxWidth: isTablet ? 460 : '92%',
                },
              ]}
            >
              {/* ── Header ── */}
              <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.headerTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.iconBadge, { backgroundColor: colors.primary + '22' }]}>
                    <Ionicons name="notifications" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text
                      style={[
                        styles.modalTitle,
                        { color: colors.black, textAlign },
                        isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {isAr ? 'تحديد فترة التنبيه المخصصة' : isKu ? 'ماوەی هۆشداری بە کەستەم' : 'Custom Alert Window'}
                    </Text>
                    <Text
                      style={[
                        styles.modalSubtitle,
                        { color: colors.gray400, textAlign },
                        isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                      ]}
                    >
                      {isKu
                        ? 'ژمارەی ئەو ڕۆژانە بنووسە کە دەتەوێت پێش بەسەرچوون ئاگاداربکرێیتەوە:'
                        : 'Enter number of days before expiry to trigger warning alerts:'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray100 }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color={colors.gray600} />
                </TouchableOpacity>
              </View>

              {/* ── Stepper + Number Input Box ── */}
              <View
                style={[
                  styles.inputCard,
                  {
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.60)' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
                  },
                ]}
              >
                <View style={[styles.stepperRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {/* Minus 1 */}
                  <TouchableOpacity
                    onPress={() => handleStep(-1)}
                    style={[
                      styles.stepBtn,
                      {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : colors.gray200,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={20} color={colors.black} />
                  </TouchableOpacity>

                  {/* Main Input Display */}
                  <View style={styles.numberInputBox}>
                    <TextInput
                      value={toEnglishDigits(daysText)}
                      onChangeText={(t) => setDaysText(toEnglishDigits(t).replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      maxLength={4}
                      selectTextOnFocus
                      style={[
                        styles.numberInput,
                        { color: colors.primary },
                        isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    />
                    <Text
                      style={[
                        styles.unitLabel,
                        { color: colors.gray400 },
                        isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                      ]}
                    >
                      {isAr ? 'يوماً قبل انتهاء الصلاحية' : isKu ? 'ڕۆژ پێش بەسەرچوون' : 'days before expiry'}
                    </Text>
                  </View>

                  {/* Plus 1 */}
                  <TouchableOpacity
                    onPress={() => handleStep(1)}
                    style={[
                      styles.stepBtn,
                      {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : colors.gray200,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={20} color={colors.black} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── Quick Suggestions ── */}
              <View style={styles.suggestionsSection}>
                <Text
                  style={[
                    styles.suggestionsLabel,
                    { color: colors.gray400, textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isAr ? 'خيارات سريعة:' : isKu ? 'هەڵبژاردنی خێرا:' : 'Quick Suggestions:'}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.suggestionsRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  {QUICK_SUGGESTIONS.map((val) => {
                    const isSelected = currentVal === val;
                    return (
                      <TouchableOpacity
                        key={val}
                        onPress={() => handleSelectSuggestion(val)}
                        style={[
                          styles.suggestionChip,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : isDark
                              ? 'rgba(15, 23, 42, 0.60)'
                              : '#FFFFFF',
                            borderColor: isSelected
                              ? colors.primary
                              : isDark
                              ? 'rgba(255, 255, 255, 0.08)'
                              : colors.gray200,
                          },
                        ]}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.suggestionChipText,
                            {
                              color: isSelected ? '#0F172A' : colors.black,
                              writingDirection: isRTL ? 'rtl' : 'ltr',
                              textAlign: 'center',
                            },
                            isKu && { fontFamily: isSelected ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                          ]}
                        >
                          {isAr ? `\u200F${val} يوم` : isKu ? `\u200F${val} ڕۆژ` : `${val}d`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* ── Action Buttons ── */}
              <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.cancelBtn,
                    {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : colors.gray200,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : colors.gray100,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.cancelBtnText,
                      { color: colors.gray600 },
                      isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {isAr ? 'إلغاء' : isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleConfirm}
                  disabled={!isValid}
                  style={[
                    styles.applyBtn,
                    {
                      backgroundColor: isValid ? colors.primary : isDark ? colors.gray300 : colors.gray200,
                      opacity: isValid ? 1 : 0.6,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-sharp" size={18} color="#0F172A" />
                  <Text
                    style={[
                      styles.applyBtnText,
                      { color: '#0F172A' },
                      isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isAr ? 'تطبيق' : isKu ? 'جێبەجێکردن' : 'Apply'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
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
  keyboardWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1.2,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  headerRow: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitleGroup: {
    flex: 1,
    gap: 12,
    alignItems: 'flex-start',
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  modalSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  stepperRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberInputBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberInput: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 2,
    minWidth: 80,
  },
  unitLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  suggestionsSection: {
    gap: 8,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 2,
  },
  suggestionsRow: {
    gap: 6,
    paddingVertical: 2,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 1.3,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
