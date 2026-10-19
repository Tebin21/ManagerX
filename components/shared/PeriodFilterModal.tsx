import React, { useState, type ComponentProps } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import { AppSheet, AppSheetHeader, AppSheetOption } from '@/components/ui/AppSheet';
import type { PeriodKey } from '@/utils/dateRanges';
import { CustomDateRangeModal } from '@/components/shared/CustomDateRangeModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (key: PeriodKey, customFrom?: string, customTo?: string) => void;
  /** Highlights the currently active period when the sheet (re)opens. */
  current?: PeriodKey;
  /** Optional label overrides, e.g. for callers that need exact wording independent of the shared common/reports keys. */
  labels?: Partial<Record<PeriodKey, string>>;
  includeAll?: boolean;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
  exportPdfLabel?: string;
}

export function PeriodFilterModal({
  visible,
  onClose,
  onSelect,
  current,
  labels,
  includeAll,
  onExportPdf,
  isExportingPdf = false,
  exportPdfLabel,
}: Props) {
  const { colors } = useAppTheme();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [customModalVisible, setCustomModalVisible] = useState(false);

  type Option = { key: PeriodKey; label: string; icon: ComponentProps<typeof Ionicons>['name'] };
  const options: Option[] = [
    { key: 'today', label: labels?.today ?? i18n.t('common.today'), icon: 'today-outline' },
    { key: 'week', label: labels?.week ?? i18n.t('common.thisWeek'), icon: 'calendar-outline' },
    { key: 'month', label: labels?.month ?? i18n.t('common.thisMonth'), icon: 'calendar-number-outline' },
    { key: 'year', label: labels?.year ?? i18n.t('reports.year'), icon: 'stats-chart-outline' },
    ...(includeAll ? [{ key: 'all' as PeriodKey, label: labels?.all ?? (isKuLanguage ? 'هەمووی' : 'All'), icon: 'infinite-outline' as const }] : []),
    { key: 'custom', label: labels?.custom ?? i18n.t('reports.custom'), icon: 'options-outline' },
  ];

  function handleClose() {
    setCustomModalVisible(false);
    onClose();
  }

  function handleSelect(key: PeriodKey) {
    if (key !== 'custom') {
      onSelect(key);
      handleClose();
      return;
    }
    onClose();
    setTimeout(() => {
      setCustomModalVisible(true);
    }, 150);
  }

  return (
    <>
      <AppSheet visible={visible} onClose={handleClose}>
        <AppSheetHeader title={i18n.t('reports.filterByPeriod')} />

        {options.map(({ key, icon, label }) => {
          const active = key === current;
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

      {onExportPdf && (
        <View style={styles.exportSection}>
          <View style={[styles.exportDivider, { backgroundColor: colors.gray200 }]} />
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.softBlue, borderColor: colors.primary + '35' }]}
            onPress={() => {
              handleClose();
              onExportPdf();
            }}
            disabled={isExportingPdf}
            activeOpacity={0.85}
          >
            {isExportingPdf ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                <Text style={[styles.exportBtnText, { color: colors.primary }]}>
                  {exportPdfLabel ?? (isKuLanguage ? 'دەرکردنی جەردی فرۆشتن بە PDF' : 'Export Sales Audit (PDF)')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
      </AppSheet>

      <CustomDateRangeModal
        visible={customModalVisible}
        onClose={() => setCustomModalVisible(false)}
        initialFrom={customFrom}
        initialTo={customTo}
        onApply={(from, to) => {
          setCustomFrom(from);
          setCustomTo(to);
          setCustomModalVisible(false);
          onSelect('custom', from, to);
          handleClose();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  exportSection: {
    marginTop: 10,
    marginBottom: 4,
  },
  exportDivider: {
    height: 1,
    marginBottom: 12,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
