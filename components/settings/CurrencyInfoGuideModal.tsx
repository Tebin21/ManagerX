import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { hexToRgba } from '@/lib/colorUtils';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function CurrencyInfoGuideModal({ visible, onClose }: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL } = useRTL();
  const textAlign = isRTL ? 'right' : 'left';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? hexToRgba(colors.primary, 0.4) : '#E2E8F0',
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: hexToRgba(colors.primary, 0.25) }]}>
            <View style={[styles.iconCircle, { backgroundColor: hexToRgba(colors.primary, isDark ? 0.20 : 0.12) }]}>
              <Ionicons name="information-circle" size={26} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={[styles.title, { color: colors.black, textAlign }]}>
                ڕێبەری تەواوی نرخی دراو و گۆڕانکارییەکان
              </Text>
              <Text style={[styles.subtitle, { color: colors.gray400, textAlign }]}>
                زانیاری گشتگیر لەسەر چۆنیەتی کارکردنی دراو لە فڕۆشیار
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Section 1 */}
            <View style={[styles.sectionCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="swap-horizontal" size={18} color="#D4AF37" />
                <Text style={[styles.sectionTitle, { color: colors.black }]}>
                  ١. نرخی گۆڕین چییە و چۆن کار دەکات؟
                </Text>
              </View>
              <Text style={[styles.sectionBody, { color: colors.gray600, textAlign }]}>
                سیستەمەکە پشت بە نرخی ١٠٠ دۆلار بەرامبەر بە دیناری عێراقی دەبەستێت. بۆ نموونە کاتێک دەنوسیت «131,000»، واتە هەر ١٠٠ دۆلارێک یەکسانە بە ١٣١ هەزار دینار (١ دۆلار = ١,٣١٠ دینار).
              </Text>
            </View>

            {/* Section 2 */}
            <View style={[styles.sectionCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="cash-outline" size={18} color="#16A34A" />
                <Text style={[styles.sectionTitle, { color: colors.black }]}>
                  ٢. هەڵبژاردنی دراوی سەرەکی (دینار یان دۆلار)
                </Text>
              </View>
              <Text style={[styles.sectionBody, { color: colors.gray600, textAlign }]}>
                تۆ دەتوانیت لە ڕێگەی بەتنی گەورەی ئۆن/ئۆف لە سەرەوە دراوی بنەڕەتی کۆگاکەت بکەیت بە «دۆلاری ئەمریکی ($)» یان «دیناری عێراقی (د.ع)». بە دەستنیشانکردنی دۆلار، تەواوی بەشەکانی فرۆشتن، کڕین، قەرز و پسوولەکان بە دۆلار ئەژمار دەکرێن.
              </Text>
            </View>

            {/* Section 3 */}
            <View style={[styles.sectionCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trending-up-outline" size={18} color="#0284C7" />
                <Text style={[styles.sectionTitle, { color: colors.black }]}>
                  ٣. نموونەی بەرزبوونەوە و دابەزینی دۆلار
                </Text>
              </View>
              <Text style={[styles.sectionBody, { color: colors.gray600, textAlign }]}>
                • ئەگەر نرخی دۆلار لە بازاڕ بەرز بێتەوە بۆ نموونە بۆ ١٥٠,٠٠٠ دینار: تۆ ڕاستەوخۆ نرخی نوێ دەنووسیت و پاشەکەوتی دەکەیت. کاتێک کاڵایەکی پێشووت بە دۆلار بفرۆشیت یان بیکڕیت، سیستەمەکە نرخی فرۆشتنی دینارەکەی دەگونجێنێت لەگەڵ نرخی نوێ بۆ ئەوەی خاوەنکار زەرەر نەکات.{'\n\n'}
                • ئەگەر دۆلار دابەزی: نرخی نوێ دادەنێیتەوە و باڵانسی کاڵاکانت بە نرخی نوێ نوێ دەبنەوە.
              </Text>
            </View>

            {/* Section 4 */}
            <View style={[styles.sectionCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={18} color="#9333EA" />
                <Text style={[styles.sectionTitle, { color: colors.black }]}>
                  ٤. وەسڵەکان و ڕاپۆرتی جەرد (PDF)
                </Text>
              </View>
              <Text style={[styles.sectionBody, { color: colors.gray600, textAlign }]}>
                هەموو پسوولەکانی فرۆشتن و کڕین لەگەڵ تەواوی جەردی کۆگا و فایلە PDFـەکان بە شێوازێکی زۆر ورد بەپێی دراوی هەڵبژێردراو حیساب دەکرێن و چاپ دەکرێن، لەگەڵ ڕوونکردنەوەی نرخی گۆڕینی بەکارهاتوو.
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Close Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onClose}
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.doneBtnText}>تێگەیشتم، زۆر سوپاس</Text>
          </TouchableOpacity>
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
    padding: 18,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.25)',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    width: '100%',
    maxHeight: 380,
  },
  scrollContent: {
    paddingBottom: 10,
    gap: 10,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  doneBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
