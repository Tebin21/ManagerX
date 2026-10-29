import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/AppText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { SUPPORT_PHONE } from '@/constants/config';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  style?: any;
}

export function CreateWebsiteCtaButton({ style }: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, flexDirection, textAlign } = useRTL();
  const { isTablet } = useResponsive();
  const currentLang = useLanguageStore((s) => s.language);
  const isKu = currentLang === 'ku';
  const isAr = currentLang === 'ar';
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  };

  const handleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {});
  };

  const handleWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const text = isAr
      ? 'مرحباً، أود تفعيل متجر إلكتروني لعملي عبر تطبيق فروشيار.'
      : isKu
      ? 'سڵاو، دەمەوێت وێبسایتی ئۆنلاین بۆ بزنسەکەم لە ئەپڵیکەیشنی فرۆشیار چالاک بکەم.'
      : 'Hello, I want to activate an online storefront for my business on Froshiar.';
    Linking.openURL(`https://wa.me/964${SUPPORT_PHONE.replace(/^0/, '')}?text=${encodeURIComponent(text)}`).catch(() => {});
  };

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#D4AF3744' : '#D4AF3777',
          },
        ]}
      >
        {/* Main Trigger Row */}
        <TouchableOpacity
          onPress={toggleExpand}
          activeOpacity={0.85}
          style={[styles.mainRow, { flexDirection }]}
        >
          {/* Storefront Icon with Gold Glow */}
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isDark ? '#D4AF3722' : '#FFFBEB',
                borderColor: isDark ? '#D4AF3755' : '#FDE68A',
                width: isTablet ? 54 : 46,
                height: isTablet ? 54 : 46,
                borderRadius: isTablet ? 18 : 15,
              },
            ]}
          >
            <Ionicons name="storefront" size={isTablet ? 26 : 22} color="#D4AF37" />
          </View>

          {/* Details */}
          <View style={[styles.content, { marginHorizontal: isTablet ? 12 : 8 }]}>
            <View style={[styles.titleRow, { flexDirection }]}>
              <Text
                style={[
                  styles.title,
                  {
                    color: isDark ? '#FFFFFF' : '#0F172A',
                    fontSize: isTablet ? 17 : 13.5,
                    textAlign,
                  },
                  (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
                numberOfLines={1}
              >
                {isAr ? 'إنشاء موقع إلكتروني لمتجرك' : isKu ? 'وێبسایتی بزنسەکەت دروست بکە' : 'Create Your Business Website'}
              </Text>

              {/* Sparkle badge */}
              <View
                style={[
                  styles.sparkleBadge,
                  {
                    backgroundColor: isDark ? '#D4AF3722' : '#FEF3C7',
                    borderColor: isDark ? '#D4AF3744' : '#FDE68A',
                  },
                ]}
              >
                <Ionicons name="sparkles" size={11} color="#D4AF37" />
                <Text style={[styles.sparkleText, (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                  {isAr ? 'أونلاين' : isKu ? 'ئۆنلاین' : 'Online'}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.subtitle,
                {
                  color: isDark ? '#94A3B8' : '#64748B',
                  fontSize: isTablet ? 13.5 : 12,
                  textAlign,
                },
              ]}
              numberOfLines={1}
            >
              {isAr
                ? 'متجر إلكتروني خاص لعرض وبيع منتجاتك'
                : isKu
                ? 'فرۆشگای تایبەت بە ناوی مارکێتەکەت بۆ فرۆشتنی کاڵاکان'
                : 'Online storefront under your brand to sell products'}
            </Text>
          </View>

          {/* Downward Toggle Chevron */}
          <View
            style={[
              styles.arrowCircle,
              {
                backgroundColor: isDark ? '#334155' : '#F8FAFC',
                borderColor: isDark ? '#475569' : '#E2E8F0',
              },
            ]}
          >
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#D4AF37"
            />
          </View>
        </TouchableOpacity>

        {/* Downward Expanded Content (بۆ خوارەوە دەکرێتەوە) */}
        {isExpanded && (
          <View style={styles.expandedWrapper}>
            <View
              style={[
                styles.divider,
                { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
              ]}
            />

            {/* Intro text */}
            <View
              style={[
                styles.introBox,
                {
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <Text
                style={[
                  styles.introText,
                  { color: isDark ? '#CBD5E1' : '#334155', textAlign },
                ]}
              >
                {isAr
                  ? 'مع الموقع الرسمي من فروشيار، تُعرض جميع منتجاتك وأسعارك أونلاين، ويمكن لزبائنك تصفحها والطلب مباشرة من أي مكان.'
                  : isKu
                  ? 'بە وێبسایتی فەرمی فرۆشیار، سەرجەم کاڵا و نرخەکانت لەسەر ئینتەرنێت بڵاودەبنەوە و کڕیارانت دەتوانن لە هەر شوێنێک بن ڕاستەوخۆ کاڵاکان ببینن و داواکاری بنێرن.'
                  : 'With Froshiar Online Store, all your products are published online with live prices and images, allowing customers to order directly from anywhere.'}
              </Text>
            </View>

            {/* Features List */}
            <View style={styles.featuresList}>
              {/* Feature 1 */}
              <View
                style={[
                  styles.featureItem,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    flexDirection,
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconWrap,
                    { backgroundColor: '#10B98115', borderColor: '#10B98133' },
                  ]}
                >
                  <Ionicons name="sync" size={18} color="#10B981" />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text
                    style={[
                      styles.featureTitle,
                      { color: isDark ? '#FFFFFF' : '#0F172A', textAlign },
                      (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isAr ? 'مزامنة تلقائية مع المخزن' : isKu ? 'هاوکاتبوونی خۆکار لەگەڵ کۆگا' : 'Real-time Catalog Sync'}
                  </Text>
                  <Text
                    style={[
                      styles.featureDesc,
                      { color: isDark ? '#94A3B8' : '#64748B', textAlign },
                    ]}
                  >
                    {isAr
                      ? 'يتم نشر جميع المنتجات والأسعار التي تضيفها تلقائياً على موقعك.'
                      : isKu
                      ? 'هەموو کاڵا و نرخەکانت کە لە ئەپەکەدا زیادیان دەکەیت خۆکارانە لەسەر وێبسایتەکەت بڵاودەبنەوە.'
                      : 'Products, prices, and stock added in the app are automatically synced to your website.'}
                  </Text>
                </View>
              </View>

              {/* Feature 2 */}
              <View
                style={[
                  styles.featureItem,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    flexDirection,
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconWrap,
                    { backgroundColor: '#25D36615', borderColor: '#25D36633' },
                  ]}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text
                    style={[
                      styles.featureTitle,
                      { color: isDark ? '#FFFFFF' : '#0F172A', textAlign },
                      (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isAr ? 'طلب مباشر عبر واتساب' : isKu ? 'داواکاری ڕاستەوخۆ بە واتسئەپ' : 'Direct WhatsApp Ordering'}
                  </Text>
                  <Text
                    style={[
                      styles.featureDesc,
                      { color: isDark ? '#94A3B8' : '#64748B', textAlign },
                    ]}
                  >
                    {isAr
                      ? 'يمكن للزبائن ملء سلة التسوق وإرسال الفاتورة مباشرة إلى واتساب الخاص بك بنقرة واحدة.'
                      : isKu
                      ? 'کڕیارەکان دەتوانن سەبەتەی کڕین پڕبکەنەوە و بە یەک کلیک وەسڵی داواکاری بۆ واتسئەپت بنێرن.'
                      : 'Customers add items to cart and send organized invoices directly to your WhatsApp.'}
                  </Text>
                </View>
              </View>

              {/* Feature 3 */}
              <View
                style={[
                  styles.featureItem,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    flexDirection,
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconWrap,
                    { backgroundColor: '#6366F115', borderColor: '#6366F133' },
                  ]}
                >
                  <Ionicons name="globe-outline" size={18} color="#6366F1" />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text
                    style={[
                      styles.featureTitle,
                      { color: isDark ? '#FFFFFF' : '#0F172A', textAlign },
                      (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isAr ? 'رابط رسمي لمتجرك' : isKu ? 'دۆمەین و بەستەری فەرمی مارکێتەکەت' : 'Official Store Link'}
                  </Text>
                  <Text
                    style={[
                      styles.featureDesc,
                      { color: isDark ? '#94A3B8' : '#64748B', textAlign },
                    ]}
                  >
                    {isAr
                      ? 'رابط مخصص باسم متجرك للمشاركة على إنستغرام، سناب شات وفيسبوك.'
                      : isKu
                      ? 'بەستەرێکی تایبەت بە ناوی فرۆشگاکەتەوە بۆ بڵاوکردنەوە لە ئینستاگرام، سناپچات و فەیسبووک.'
                      : 'A dedicated store link with your brand name to share across all social media platforms.'}
                  </Text>
                </View>
              </View>

              {/* Feature 4 */}
              <View
                style={[
                  styles.featureItem,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    flexDirection,
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconWrap,
                    { backgroundColor: '#D4AF3715', borderColor: '#D4AF3744' },
                  ]}
                >
                  <Ionicons name="ribbon-outline" size={18} color="#D4AF37" />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text
                    style={[
                      styles.featureTitle,
                      { color: isDark ? '#FFFFFF' : '#0F172A', textAlign },
                      (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isAr ? 'بدون عمولة وأرباحك كاملة 100%' : isKu ? '١٠٠٪ بێ کۆمسیۆن و داهاتی تەواو' : '100% Commission Free'}
                  </Text>
                  <Text
                    style={[
                      styles.featureDesc,
                      { color: isDark ? '#94A3B8' : '#64748B', textAlign },
                    ]}
                  >
                    {isAr
                      ? 'جميع الأرباح والمبيعات تعود إليك بالكامل دون أي استقطاع.'
                      : isKu
                      ? 'هەموو قازانج و داهاتی فرۆشتنەکان بۆ خۆت دەبێت و هیچ بڕە پارەیەکی زیادە نابڕدرێت.'
                      : 'All profits and earnings from orders belong 100% to you without any deductions.'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Contact Admin to Activate Section */}
            <View
              style={[
                styles.contactCard,
                {
                  backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF',
                  borderColor: isDark ? '#6366F1' : '#C7D2FE',
                },
              ]}
            >
              <View style={[styles.contactHeader, { flexDirection }]}>
                <Ionicons name="call" size={18} color="#6366F1" />
                <Text
                  style={[
                    styles.contactPrompt,
                    { color: isDark ? '#FFFFFF' : '#1E1B4B', textAlign },
                    (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isAr
                    ? 'لإنشاء وتفعيل موقع إلكتروني لمتجرك، تواصل مع الإدارة:'
                    : isKu
                    ? 'بۆ دروستکردن و چالاککردنی وێبسایت بۆ بزنسەکەت، پەیوەندی بە ئەدمینەوە بکە:'
                    : 'To create and activate a website for your business, contact the Admin:'}
                </Text>
              </View>

              {/* Big Phone Number Display */}
              <View style={styles.phoneDisplay}>
                <Text style={styles.phoneText}>{SUPPORT_PHONE}</Text>
              </View>

              {/* Action Buttons: Call & WhatsApp */}
              <View style={[styles.actionButtonsRow, { flexDirection }]}>
                <TouchableOpacity
                  onPress={handleCall}
                  activeOpacity={0.8}
                  style={[styles.callBtn, { flexDirection }]}
                >
                  <Ionicons name="call" size={16} color="#FFFFFF" />
                  <Text style={[styles.callBtnText, (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {isAr ? 'اتصال هاتفي' : isKu ? 'پەیوەندی تەلەفۆنی' : 'Call Admin'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleWhatsApp}
                  activeOpacity={0.8}
                  style={[styles.whatsappBtn, { flexDirection }]}
                >
                  <Ionicons name="logo-whatsapp" size={17} color="#FFFFFF" />
                  <Text style={[styles.whatsappBtnText, (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {isAr ? 'مراسلة واتساب' : isKu ? 'نامە لە واتسئەپ' : 'WhatsApp'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  mainRow: {
    alignItems: 'center',
    width: '100%',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  content: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  titleRow: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  sparkleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    borderWidth: 1,
    flexShrink: 0,
  },
  sparkleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D4AF37',
  },
  subtitle: {
    fontWeight: '600',
    marginTop: 3,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Downward Accordion Expanded Styles
  expandedWrapper: {
    marginTop: 14,
    width: '100%',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 14,
  },
  introBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  introText: {
    fontSize: 12.5,
    lineHeight: 19,
  },
  featuresList: {
    gap: 8,
    marginBottom: 14,
  },
  featureItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    gap: 10,
  },
  featureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11.5,
    lineHeight: 17,
  },
  contactCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
  },
  contactHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  contactPrompt: {
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  phoneDisplay: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12,
  },
  phoneText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#6366F1',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionButtonsRow: {
    width: '100%',
    gap: 10,
  },
  callBtn: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  whatsappBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  whatsappBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});

