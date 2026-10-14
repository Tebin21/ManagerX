import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { fmtExchangeRate, fmtIQD, fmtUSD } from '@/utils/formatters';
import { IraqiDinarGraphic, USDollarGraphic } from './CurrencyLargeToggleSwitch';

interface Props {
  visible: boolean;
  targetCurrency: 'IQD' | 'USD';
  currentRate: number; // e.g. 1310
  onConfirm: () => void;
  onCancel: () => void;
}

export function CurrencySwitchConfirmModal({
  visible,
  targetCurrency,
  currentRate,
  onConfirm,
  onCancel,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL } = useRTL();
  const textAlign = isRTL ? 'right' : 'left';

  const isUSD = targetCurrency === 'USD';
  const sampleIqd = currentRate * 100; // e.g. 131,000 IQD

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? 'rgba(212, 175, 55, 0.4)' : '#E2E8F0',
            },
          ]}
        >
          {/* Header Graphic Transition Badge */}
          <View style={styles.badgeHeader}>
            <LinearGradient
              colors={isUSD ? ['#059669', '#047857'] : ['#D97706', '#B45309']}
              style={styles.headerIconCircle}
            >
              <Ionicons
                name={isUSD ? 'cash' : 'wallet'}
                size={28}
                color="#FFFFFF"
              />
            </LinearGradient>
          </View>

          <Text style={[styles.title, { color: colors.black }]}>
            {isUSD
              ? 'گۆڕینی دراوی سەرەکی بۆ دۆلار ($)'
              : 'گۆڕینی دراوی سەرەکی بۆ دینار (د.ع)'}
          </Text>

          <Text style={[styles.subtitle, { color: colors.gray500 }]}>
            {isUSD
              ? 'تەواوی مۆدێلەکانی سیستەم و حیسابات دەگۆڕدرێن بۆ دۆلاری ئەمریکی'
              : 'تەواوی مۆدێلەکانی سیستەم و حیسابات دەگۆڕدرێن بۆ دیناری عێراقی'}
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Visual Transition Representation */}
            <View
              style={[
                styles.flowBox,
                {
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.flowItem}>
                {isUSD ? <IraqiDinarGraphic size={34} /> : <USDollarGraphic size={34} />}
                <Text style={[styles.flowLabel, { color: colors.gray400 }]}>
                  {isUSD ? 'دیناری عێراقی' : 'دۆلاری ئەمریکی'}
                </Text>
              </View>

              <View style={styles.flowArrowWrap}>
                <Ionicons
                  name={isRTL ? 'arrow-back' : 'arrow-forward'}
                  size={20}
                  color="#D4AF37"
                />
              </View>

              <View style={styles.flowItem}>
                {isUSD ? <USDollarGraphic size={34} /> : <IraqiDinarGraphic size={34} />}
                <Text style={[styles.flowLabel, { color: '#D4AF37', fontWeight: '700' }]}>
                  {isUSD ? 'دۆلاری ئەمریکی ($)' : 'دیناری عێراقی (د.ع)'}
                </Text>
              </View>
            </View>

            {/* Practical Example Card */}
            <View
              style={[
                styles.exampleCard,
                {
                  backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : '#FEF9C3',
                  borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : '#FDE047',
                },
              ]}
            >
              <View style={styles.exampleHeader}>
                <Ionicons name="calculator-outline" size={18} color="#D4AF37" />
                <Text style={[styles.exampleTitle, { color: colors.black }]}>
                  نموونەی کردارەکی لەسەر بەرز و نزمی نرخ:
                </Text>
              </View>

              <Text style={[styles.exampleText, { color: colors.gray600, textAlign }]}>
                • نرخی گۆڕینی ئێستا:{' '}
                <Text style={{ fontWeight: '800', color: colors.black }}>
                  100$ = {fmtExchangeRate(currentRate)} د.ع
                </Text>
              </Text>

              <Text style={[styles.exampleText, { color: colors.gray600, textAlign, marginTop: 4 }]}>
                • بۆ نموونە کاڵایەک ئەگەر نرخی{' '}
                <Text style={{ fontWeight: '700', color: colors.black }}>
                  {fmtIQD(sampleIqd)} دینار
                </Text>{' '}
                بێت، کاتێک سیستەم دەبێت بە دۆلار، بە نرخی{' '}
                <Text style={{ fontWeight: '800', color: '#16A34A' }}>
                  $100.00
                </Text>{' '}
                دەردەکەوێت.
              </Text>

              <Text style={[styles.exampleText, { color: colors.gray600, textAlign, marginTop: 4 }]}>
                • ئەگەر نرخی دۆلار لە بازاڕ بەرز بووەوە (بۆ نموونە بووە 150,000 دینار)، دەتوانیت لە هەر کاتێکدا نرخی گۆڕین نوێ بکەیتەوە بەبێ ئەوەی باڵانسی کاڵاکانت تێکبچێت.
              </Text>
            </View>

            {/* What will change checklist */}
            <View style={styles.checklist}>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={[styles.checkText, { color: colors.black, textAlign }]}>
                  هەموو نرخی کاڵاکان، کۆگا و بەشی فرۆشتن بە {isUSD ? 'دۆلار ($)' : 'دینار (د.ع)'} دەبن.
                </Text>
              </View>

              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={[styles.checkText, { color: colors.black, textAlign }]}>
                  هەموو وەسڵەکانی فرۆشتن و کڕین و داشکاندنەکان بە {isUSD ? 'دۆلار' : 'دینار'} پیشان دەدرێن.
                </Text>
              </View>

              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={[styles.checkText, { color: colors.black, textAlign }]}>
                  ڕاپۆرتی جەرد، قەرزەکان و فایلە PDFـەکان بە دراوی نوێ چاپ دەکرێن.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onCancel}
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: isDark ? '#334155' : '#F1F5F9',
                },
              ]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.gray500 }]}>
                پەشیمانبوونەوە
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={onConfirm}
              style={[
                styles.confirmBtn,
                {
                  backgroundColor: isUSD ? '#16A34A' : '#D97706',
                },
              ]}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>
                {isUSD ? 'بەڵێ، بیگۆڕە بۆ دۆلار' : 'بەڵێ، بیگۆڕە بۆ دینار'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  badgeHeader: {
    marginTop: -8,
    marginBottom: 12,
  },
  headerIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  scrollBody: {
    width: '100%',
    maxHeight: 340,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  flowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  flowItem: {
    alignItems: 'center',
    gap: 4,
  },
  flowLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  flowArrowWrap: {
    paddingHorizontal: 8,
  },
  exampleCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  exampleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  exampleText: {
    fontSize: 12,
    lineHeight: 18,
  },
  checklist: {
    gap: 8,
    marginBottom: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
