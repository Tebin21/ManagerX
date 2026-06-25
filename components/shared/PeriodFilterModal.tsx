import React, { useState, type ComponentProps } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import { useRTL } from '@/lib/rtl';
import { AppSheet, AppSheetHeader, AppSheetOption } from '@/components/ui/AppSheet';
import type { PeriodKey } from '@/utils/dateRanges';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (key: PeriodKey, customFrom?: string, customTo?: string) => void;
  /** Highlights the currently active period when the sheet (re)opens. */
  current?: PeriodKey;
  /** Optional label overrides, e.g. for callers that need exact wording independent of the shared common/reports keys. */
  labels?: Partial<Record<PeriodKey, string>>;
}

export function PeriodFilterModal({ visible, onClose, onSelect, current, labels }: Props) {
  const { colors } = useAppTheme();
  const { textAlign } = useRTL();
  const scrollIntoView = useKeyboardAwareFocus();
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  type Option = { key: PeriodKey; label: string; icon: ComponentProps<typeof Ionicons>['name'] };
  const options: Option[] = [
    { key: 'today', label: labels?.today ?? i18n.t('common.today'), icon: 'today-outline' },
    { key: 'week', label: labels?.week ?? i18n.t('common.thisWeek'), icon: 'calendar-outline' },
    { key: 'month', label: labels?.month ?? i18n.t('common.thisMonth'), icon: 'calendar-number-outline' },
    { key: 'year', label: labels?.year ?? i18n.t('reports.year'), icon: 'stats-chart-outline' },
    { key: 'custom', label: labels?.custom ?? i18n.t('reports.custom'), icon: 'options-outline' },
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
    <AppSheet visible={visible} onClose={handleClose}>
      <AppSheetHeader title={i18n.t('reports.filterByPeriod')} />

      {options.map(({ key, icon, label }) => {
        const active = showCustom ? key === 'custom' : key === current;
        return (
          <AppSheetOption
            key={key}
            icon={icon}
            label={label}
            active={active}
            indicator="check"
            onPress={() => handleSelect(key)}
          />
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
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  customBox: { marginTop: 8 },
  dateLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  dateInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 4 },
  applyBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  applyText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
