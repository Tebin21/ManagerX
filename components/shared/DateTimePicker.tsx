import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';
import { formatDateTime, toDateOnly } from '@/utils/formatters';
import { useTranslation } from 'react-i18next';

export interface Props {
  value: Date;
  onChange: (d: Date) => void;
  label?: string;
  maxDate?: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function dateToInputs(d: Date) {
  return {
    dateStr: toDateOnly(d),
    timeStr: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function parseInputs(dateStr: string, timeStr: string, fallback: Date): Date {
  const dp = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tp = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!dp || !tp) return fallback;
  const [, y, mo, d] = dp.map(Number);
  const [, h, mi]    = tp.map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return fallback;
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return fallback;
  const r = new Date(y, mo - 1, d, h, mi, 0, 0);
  return isNaN(r.getTime()) ? fallback : r;
}

const CARD_WIDTH = Math.min(Dimensions.get('window').width - 48, 360);

// ─── Component ────────────────────────────────────────────────────────────────

export function DateTimePicker({ value, onChange, label, maxDate }: Props) {
  const [open, setOpen]       = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale       = useRef(new Animated.Value(0.86)).current;
  const cardOpacity     = useRef(new Animated.Value(0)).current;

  const { colors } = useAppTheme();
  const { textAlign } = useRTL();
  const { t } = useTranslation();

  // ── Animations ──────────────────────────────────────────────────────────────

  const openModal = useCallback(() => {
    const inputs = dateToInputs(value);
    setDateStr(inputs.dateStr);
    setTimeStr(inputs.timeStr);
    cardScale.setValue(0.86);
    cardOpacity.setValue(0);
    backdropOpacity.setValue(0);
    setOpen(true);
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(cardScale,       { toValue: 1, tension: 90, friction: 10, useNativeDriver: true }),
      Animated.timing(cardOpacity,     { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [value]);

  const closeModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(cardScale,       { toValue: 0.92, duration: 180, useNativeDriver: true }),
      Animated.timing(cardOpacity,     { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setOpen(false));
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  function handleNow() {
    const inputs = dateToInputs(new Date());
    setDateStr(inputs.dateStr);
    setTimeStr(inputs.timeStr);
  }

  function handleConfirm() {
    const parsed  = parseInputs(dateStr, timeStr, value);
    const clamped = maxDate && parsed > maxDate ? maxDate : parsed;
    onChange(clamped);
    closeModal();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* Field label */}
      {label && (
        <Text style={[styles.fieldLabel, { color: colors.gray600, textAlign }]}>{label}</Text>
      )}

      {/* Trigger — styled like AppTextInput */}
      <MotiView
        animate={{ borderColor: colors.gray200 }}
        transition={{ type: 'timing', duration: 150 }}
        style={[styles.trigger, { borderColor: colors.gray200, backgroundColor: colors.gray50, shadowColor: colors.primary }]}
      >
        <Pressable
          style={styles.triggerRow}
          onPress={openModal}
          android_ripple={{ color: colors.gray100 }}
        >
          <Ionicons name="calendar-outline" size={17} color={colors.primary} style={styles.triggerIcon} />
          <Text style={[styles.triggerText, { flex: 1, color: colors.black, textAlign }]} numberOfLines={1}>
            {formatDateTime(value)}
          </Text>
          <Ionicons name="chevron-down" size={15} color={colors.gray400} />
        </Pressable>
      </MotiView>

      {/* ── Modal ── */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Dark backdrop — absolutely fills entire screen */}
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
            pointerEvents="none"
          />

          {/* Tap-to-dismiss area (whole screen) */}
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />

          {/* Centered card */}
          <View style={styles.cardWrapper} pointerEvents="box-none">
            <Animated.View
              style={[
                styles.card,
                {
                  backgroundColor: colors.white,
                  shadowColor:     '#000',
                  transform:       [{ scale: cardScale }],
                  opacity:         cardOpacity,
                  width:           CARD_WIDTH,
                },
              ]}
            >
              {/* ── Header ── */}
              <View style={[styles.cardHeader, { borderBottomColor: colors.gray100 }]}>
                <View style={[styles.cardHeaderIcon, { backgroundColor: colors.softBlue }]}>
                  <Ionicons name="calendar" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.black }]}>
                  {label ?? t('common.confirm')}
                </Text>
              </View>

              {/* ── Inputs ── */}
              <View style={styles.inputsSection}>

                {/* Date */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.gray500 }]}>
                    {t('purchases.date')}
                  </Text>
                  <View style={[styles.inputBox, { borderColor: colors.gray200, backgroundColor: colors.gray50 }]}>
                    <Ionicons name="calendar-outline" size={15} color={colors.gray400} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.inputField, { color: colors.black }]}
                      value={dateStr}
                      onChangeText={setDateStr}
                      placeholder="2026-06-03"
                      placeholderTextColor={colors.gray400}
                      keyboardType="numbers-and-punctuation"
                      maxLength={10}
                      returnKeyType="next"
                      autoCorrect={false}
                      textAlign="left"
                    />
                  </View>
                </View>

                {/* Time */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.gray500 }]}>
                    {t('common.time')}
                  </Text>
                  <View style={[styles.inputBox, { borderColor: colors.gray200, backgroundColor: colors.gray50 }]}>
                    <Ionicons name="time-outline" size={15} color={colors.gray400} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.inputField, { color: colors.black }]}
                      value={timeStr}
                      onChangeText={setTimeStr}
                      placeholder="14:30"
                      placeholderTextColor={colors.gray400}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      returnKeyType="done"
                      onSubmitEditing={handleConfirm}
                      autoCorrect={false}
                      textAlign="left"
                    />
                  </View>
                </View>

                {/* Format hint + Now shortcut */}
                <View style={styles.hintRow}>
                  <Text style={[styles.hint, { color: colors.gray400 }]}>
                    YYYY-MM-DD · HH:MM
                  </Text>
                  <TouchableOpacity
                    onPress={handleNow}
                    activeOpacity={0.7}
                    style={[styles.nowChip, { backgroundColor: colors.softBlue }]}
                  >
                    <Ionicons name="flash" size={12} color={colors.primary} />
                    <Text style={[styles.nowChipText, { color: colors.primary }]}>
                      {t('common.today')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── Footer buttons ── */}
              <View style={[styles.cardFooter, { borderTopColor: colors.gray100 }]}>
                <TouchableOpacity
                  style={[styles.btnCancel, { borderColor: colors.gray200 }]}
                  onPress={closeModal}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.btnCancelText, { color: colors.gray600 }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnConfirm, { backgroundColor: colors.primary }]}
                  onPress={handleConfirm}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnConfirmText}>{t('common.confirm')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>

        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Trigger
  container:   { marginBottom: 16 },
  fieldLabel: {
    fontSize:      13,
    fontWeight:    '500',
    marginBottom:  6,
    letterSpacing: 0.2,
  },
  trigger: {
    borderWidth:   1.5,
    borderRadius:  Theme.input.borderRadius,
    shadowOffset:  { width: 0, height: 0 },
    shadowRadius:  6,
    shadowOpacity: 0,
    elevation:     0,
  },
  triggerRow: {
    flexDirection:     'row',
    alignItems:        'center',
    height:            Theme.input.height,
    paddingHorizontal: 14,
    gap:               8,
  },
  triggerIcon: {},
  triggerText: { fontSize: 15 },

  // ── Modal ────────────────────────────────────────────────────────────────────
  modalRoot: {
    flex: 1,
  },

  // Fullscreen dark overlay
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },

  // Centers the card in the middle of the screen
  cardWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems:     'center',
  },

  // The card itself
  card: {
    borderRadius: 20,
    shadowOffset:  { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius:  24,
    elevation:     20,
    overflow:      'hidden',
  },

  // ── Card sections ────────────────────────────────────────────────────────────
  cardHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               12,
    paddingHorizontal: 20,
    paddingVertical:   16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardHeaderIcon: {
    width:         36,
    height:        36,
    borderRadius:  10,
    alignItems:    'center',
    justifyContent:'center',
  },
  cardTitle: {
    fontSize:   17,
    fontWeight: '700',
    letterSpacing: -0.3,
    flex: 1,
  },

  inputsSection: {
    paddingHorizontal: 20,
    paddingTop:        18,
    paddingBottom:     12,
    gap:               14,
  },

  inputGroup: { gap: 6 },
  inputLabel: {
    fontSize:      11,
    fontWeight:    '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputBox: {
    flexDirection:     'row',
    alignItems:        'center',
    height:            Theme.input.height,
    borderWidth:       1.5,
    borderRadius:      Theme.input.borderRadius,
    paddingHorizontal: 12,
    gap:               8,
  },
  inputIcon: {},
  inputField: {
    flex:       1,
    fontSize:   16,
    fontWeight: '500',
    // textAlign always LTR for date/time numbers
  },

  hintRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      2,
  },
  hint: {
    fontSize: 11,
  },
  nowChip: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    paddingHorizontal: 10,
    paddingVertical:    5,
    borderRadius:   20,
  },
  nowChipText: {
    fontSize:   12,
    fontWeight: '600',
  },

  cardFooter: {
    flexDirection:     'row',
    borderTopWidth:    StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical:   16,
    gap:               10,
  },
  btnCancel: {
    flex:           1,
    height:         44,
    borderWidth:    1.5,
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontSize:   15,
    fontWeight: '600',
  },
  btnConfirm: {
    flex:           2,
    height:         44,
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
  },
  btnConfirmText: {
    fontSize:   15,
    fontWeight: '700',
    color:      '#fff',
  },
});
