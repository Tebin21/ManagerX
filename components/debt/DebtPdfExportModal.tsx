import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import type { DebtReportSections } from '@/lib/debtReportTemplate';

interface DebtPdfExportModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (sections: DebtReportSections) => void;
  isGenerating?: boolean;
  salesCount?: number;
  purchasesCount?: number;
  periodLabel?: string;
}

export function DebtPdfExportModal({
  visible,
  onClose,
  onGenerate,
  isGenerating = false,
}: DebtPdfExportModalProps) {
  const { colors, isDark } = useAppTheme();
  const { isRTL } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  // Internal state for selected sections (now with includeStats for pure numbers summary)
  const [sections, setSections] = useState<DebtReportSections>({
    includeOverview: true,
    includeStats: true,
    includeSales: true,
    includePurchases: true,
  });

  // Reset to all sections whenever modal becomes visible
  useEffect(() => {
    if (visible) {
      setSections({
        includeOverview: true,
        includeStats: true,
        includeSales: true,
        includePurchases: true,
      });
    }
  }, [visible]);

  const toggleSection = (key: keyof DebtReportSections) => {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const hasSelection =
    sections.includeOverview ||
    sections.includeStats ||
    sections.includeSales ||
    sections.includePurchases;

  const handleConfirm = () => {
    if (!hasSelection) {
      Alert.alert(
        isKuLanguage ? 'ئاگاداری' : 'Warning',
        isKuLanguage ? 'تکایە لانیکەم یەک بەش هەڵبژێرە.' : 'Please select at least one section.'
      );
      return;
    }
    onGenerate(sections);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: colors.gray200,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.titleIconBadge, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="document-text" size={17} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.title,
                  { color: colors.black, fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKuLanguage ? 'ڕاپۆرتی PDF' : 'PDF Report'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={10}
              style={[styles.closeBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
            >
              <Ionicons name="close" size={18} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          {/* ── Simple 4 Items List ── */}
          <View style={styles.itemsList}>
            {/* 1. Overview */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => toggleSection('includeOverview')}
              style={[
                styles.itemRow,
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  backgroundColor: sections.includeOverview
                    ? (isDark ? '#334155' : '#FFFDF5')
                    : (isDark ? colors.gray200 : colors.gray50),
                  borderColor: sections.includeOverview ? colors.primary : colors.gray200,
                },
              ]}
            >
              <View style={[styles.itemContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name="pie-chart-outline"
                  size={19}
                  color={sections.includeOverview ? colors.primary : colors.gray500}
                />
                <Text
                  style={[
                    styles.itemText,
                    {
                      color: colors.black,
                      fontFamily: sections.includeOverview ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                    },
                  ]}
                >
                  {isKuLanguage ? 'ڕاپۆرتی گشتی' : 'General Overview'}
                </Text>
              </View>

              <Ionicons
                name={sections.includeOverview ? 'checkbox' : 'square-outline'}
                size={22}
                color={sections.includeOverview ? colors.primary : colors.gray400}
              />
            </TouchableOpacity>

            {/* 2. Numerical Summary Stats (Pure Numbers - No People Names) */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => toggleSection('includeStats')}
              style={[
                styles.itemRow,
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  backgroundColor: sections.includeStats
                    ? (isDark ? '#334155' : '#FFFDF5')
                    : (isDark ? colors.gray200 : colors.gray50),
                  borderColor: sections.includeStats ? colors.primary : colors.gray200,
                },
              ]}
            >
              <View style={[styles.itemContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name="stats-chart-outline"
                  size={19}
                  color={sections.includeStats ? colors.primary : colors.gray500}
                />
                <Text
                  style={[
                    styles.itemText,
                    {
                      color: colors.black,
                      fontFamily: sections.includeStats ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                    },
                  ]}
                >
                  {isKuLanguage ? 'پوختەی ئامارەکان (تەنها ژمارە)' : 'Summary Stats (Numbers Only)'}
                </Text>
              </View>

              <Ionicons
                name={sections.includeStats ? 'checkbox' : 'square-outline'}
                size={22}
                color={sections.includeStats ? colors.primary : colors.gray400}
              />
            </TouchableOpacity>

            {/* 3. Customer Debts */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => toggleSection('includeSales')}
              style={[
                styles.itemRow,
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  backgroundColor: sections.includeSales
                    ? (isDark ? '#334155' : '#FFFDF5')
                    : (isDark ? colors.gray200 : colors.gray50),
                  borderColor: sections.includeSales ? colors.primary : colors.gray200,
                },
              ]}
            >
              <View style={[styles.itemContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name="people-outline"
                  size={19}
                  color={sections.includeSales ? colors.primary : colors.gray500}
                />
                <Text
                  style={[
                    styles.itemText,
                    {
                      color: colors.black,
                      fontFamily: sections.includeSales ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                    },
                  ]}
                >
                  {isKuLanguage ? 'قەرزی کڕیاران (فرۆشتن)' : 'Customer Debts (Sales)'}
                </Text>
              </View>

              <Ionicons
                name={sections.includeSales ? 'checkbox' : 'square-outline'}
                size={22}
                color={sections.includeSales ? colors.primary : colors.gray400}
              />
            </TouchableOpacity>

            {/* 4. Supplier Debts */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => toggleSection('includePurchases')}
              style={[
                styles.itemRow,
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  backgroundColor: sections.includePurchases
                    ? (isDark ? '#334155' : '#FFFDF5')
                    : (isDark ? colors.gray200 : colors.gray50),
                  borderColor: sections.includePurchases ? colors.primary : colors.gray200,
                },
              ]}
            >
              <View style={[styles.itemContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name="business-outline"
                  size={19}
                  color={sections.includePurchases ? colors.primary : colors.gray500}
                />
                <Text
                  style={[
                    styles.itemText,
                    {
                      color: colors.black,
                      fontFamily: sections.includePurchases ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                    },
                  ]}
                >
                  {isKuLanguage ? 'قەرزی دابینکەران (کڕین)' : 'Supplier Debts (Purchases)'}
                </Text>
              </View>

              <Ionicons
                name={sections.includePurchases ? 'checkbox' : 'square-outline'}
                size={22}
                color={sections.includePurchases ? colors.primary : colors.gray400}
              />
            </TouchableOpacity>
          </View>

          {/* ── Action Button ── */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: hasSelection ? colors.primary : colors.gray300,
                opacity: hasSelection && !isGenerating ? 1 : 0.6,
              },
            ]}
            onPress={handleConfirm}
            disabled={!hasSelection || isGenerating}
            activeOpacity={0.85}
          >
            {isGenerating ? (
              <ActivityIndicator color="#0F172A" size="small" />
            ) : (
              <View style={[styles.actionBtnContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="document-text" size={18} color="#0F172A" />
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: '#0F172A', fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKuLanguage ? 'دروستکردنی PDF' : 'Generate PDF'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleRow: {
    alignItems: 'center',
    gap: 8,
  },
  titleIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsList: {
    gap: 9,
    marginBottom: 16,
  },
  itemRow: {
    borderWidth: 1.2,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemContent: {
    alignItems: 'center',
    gap: 10,
  },
  itemText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnContent: {
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
  },
});
