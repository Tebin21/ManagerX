import React, { useState, type ComponentProps } from 'react';
import { View, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, StyleSheet, Alert } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';
import { Colors } from '@/constants/colors';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import { useRTL } from '@/lib/rtl';
import type { PeriodKey } from '@/utils/dateRanges';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (key: PeriodKey, customFrom?: string, customTo?: string) => void;
}

export function PeriodFilterModal({ visible, onClose, onSelect }: Props) {
  const { colors } = useAppTheme();
  const { flexDirection, textAlign } = useRTL();
  const scrollIntoView = useKeyboardAwareFocus();
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  type Option = { key: PeriodKey; label: string; icon: ComponentProps<typeof Ionicons>['name'] };
  const options: Option[] = [
    { key: 'today', label: i18n.t('common.today'), icon: 'today-outline' },
    { key: 'week', label: i18n.t('common.thisWeek'), icon: 'calendar-outline' },
    { key: 'month', label: i18n.t('common.thisMonth'), icon: 'calendar-number-outline' },
    { key: 'year', label: i18n.t('reports.year'), icon: 'stats-chart-outline' },
    { key: 'custom', label: i18n.t('reports.custom'), icon: 'options-outline' },
  ];

  function handleClose() {
    setShowCustom(false);
    setCustomFrom('');
    setCustomTo('');
    onClose();
  }

  function handleSelect(key: PeriodKey) {
    if (key !== 'custom') {
      onSelect(key);
      handleClose();
      return;
    }
    setShowCustom(true);
  }

  function handleApplyCustom() {
    if (!customFrom || !customTo) {
      Alert.alert(i18n.t('common.required'), i18n.t('purchases.validationDate'));
      return;
    }
    if (customFrom > customTo) {
      Alert.alert(i18n.t('common.error'), i18n.t('reports.invalidDateRange'));
      return;
    }
    onSelect('custom', customFrom, customTo);
    handleClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.sheet, { backgroundColor: colors.white }]}>
        <View style={[styles.handle, { backgroundColor: colors.gray200 }]} />
        <Text style={[styles.title, { color: colors.black, textAlign }]}>
          {i18n.t('reports.filterByPeriod')}
        </Text>

        {options.map(({ key, icon, label }) => {
          const active = showCustom ? key === 'custom' : false;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.option, { flexDirection }, active && { backgroundColor: `${colors.primary}12` }]}
              onPress={() => handleSelect(key)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: active ? `${colors.primary}20` : colors.gray100 }]}>
                <Ionicons name={icon} size={16} color={active ? colors.primary : colors.gray500} />
              </View>
              <Text style={[styles.optionLabel, { color: active ? colors.primary : colors.black, textAlign }, active && { fontWeight: '700' }]}>
                {label}
              </Text>
              {active && <Ionicons name="checkmark" size={16} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}

        {showCustom && (
          <View style={styles.customBox}>
            <Text style={[styles.dateLabel, { color: colors.gray600, textAlign }]}>
              {i18n.t('reports.fromDate')} (YYYY-MM-DD)
            </Text>
            <TextInput
              style={[styles.dateInput, { color: colors.black, borderColor: colors.gray200, textAlign }]}
              placeholder="2026-01-01"
              placeholderTextColor={colors.gray400}
              value={customFrom}
              onChangeText={setCustomFrom}
              onFocus={scrollIntoView}
            />
            <Text style={[styles.dateLabel, { color: colors.gray600, textAlign }]}>
              {i18n.t('reports.toDate')} (YYYY-MM-DD)
            </Text>
            <TextInput
              style={[styles.dateInput, { color: colors.black, borderColor: colors.gray200, textAlign }]}
              placeholder="2026-12-31"
              placeholderTextColor={colors.gray400}
              value={customTo}
              onChangeText={setCustomTo}
              onFocus={scrollIntoView}
            />
            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={handleApplyCustom}>
              <Text style={styles.applyText}>{i18n.t('reports.apply')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPad} />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '800', paddingHorizontal: 20, marginBottom: 8 },
  option: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13, gap: 12, borderRadius: 12, marginHorizontal: 8, marginBottom: 2 },
  iconCircle: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  customBox: { marginHorizontal: 20, marginTop: 8 },
  dateLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  dateInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 4 },
  applyBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  applyText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  bottomPad: { height: 32 },
});
