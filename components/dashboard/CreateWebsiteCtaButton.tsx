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
import { hexToRgba, hexToHsl, hslToHex } from '@/lib/colorUtils';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Ensures an accent color has high contrast against the current surface:
 * - In Dark Mode (#1E293B): lightness is boosted to at least 65-70% so icons,
 *   borders, and badges glow and pop vividly across ALL color presets.
 * - In Light Mode (#FFFFFF): lightness is held at <= 45% so it never washes out.
 */
function getContrastAccent(hex: string, isDark: boolean): string {
  try {
    const [h, s, l] = hexToHsl(hex);
    if (isDark) {
      if (l < 62) {
        return hslToHex(h, Math.max(s, 60), 68);
      }
      return hex;
    } else {
      if (l > 48) {
        return hslToHex(h, Math.max(s, 65), 40);
      }
      return hex;
    }
  } catch {
    return isDark ? '#E2C264' : '#B8860B';
  }
}

interface Props {
  style?: any;
}

export function CreateWebsiteCtaButton({ style }: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, flexDirection, textAlign } = useRTL();
  const { isTablet, isTabletLandscape } = useResponsive();
  const currentLang = useLanguageStore((s) => s.language);
  const isKu = currentLang === 'ku';
  const isAr = currentLang === 'ar';
  const [isExpanded, setIsExpanded] = useState(false);

  // Dynamic High-Contrast Theme Accent Color (100% visible across all color presets & dark/light)
  const baseAccent = colors.primary || '#D4AF37';
  const primaryAccent = getContrastAccent(baseAccent, isDark);
  const cardBorderColor = isDark
    ? hexToRgba(primaryAccent, 0.55)
    : hexToRgba(primaryAccent, 0.65);

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
    <View style={[styles.container, isTablet && { paddingHorizontal: 20 }, style]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: cardBorderColor,
            borderWidth: isTablet ? 2 : 1.5,
            borderRadius: isTablet ? 22 : 18,
            paddingHorizontal: isTabletLandscape ? 18 : isTablet ? 16 : 12,
            paddingVertical: isTabletLandscape ? 16 : isTablet ? 14 : 11,
            shadowColor: primaryAccent,
          },
        ]}
      >
        {/* Main Trigger Row */}
        <TouchableOpacity
          onPress={toggleExpand}
          activeOpacity={0.85}
          style={[styles.mainRow, { flexDirection }]}
        >
          {/* Storefront Icon with Dynamic Theme Glow */}
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isDark
                  ? hexToRgba(primaryAccent, 0.18)
                  : hexToRgba(primaryAccent, 0.10),
                borderColor: isDark
                  ? hexToRgba(primaryAccent, 0.45)
                  : hexToRgba(primaryAccent, 0.35),
                width: isTabletLandscape ? 56 : isTablet ? 52 : 44,
                height: isTabletLandscape ? 56 : isTablet ? 52 : 44,
                borderRadius: isTablet ? 16 : 13,
              },
            ]}
          >
            <Ionicons
              name="storefront"
              size={isTabletLandscape ? 28 : isTablet ? 25 : 21}
              color={primaryAccent}
            />
          </View>

          {/* Details */}
          <View style={[styles.content, { marginHorizontal: isTablet ? 12 : 8 }]}>
            <View
              style={[
                styles.titleRow,
                {
                  flexDirection,
                  alignItems: 'center',
                  gap: 6,
                },
              ]}
            >
              <Text
                style={[
                  styles.title,
                  {
                    color: isDark ? '#FFFFFF' : '#0F172A',
                    fontSize: isTabletLandscape ? 17.5 : isTablet ? 16 : 13,
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
                    backgroundColor: isDark
                      ? hexToRgba(primaryAccent, 0.20)
                      : hexToRgba(primaryAccent, 0.12),
                    borderColor: isDark
                      ? hexToRgba(primaryAccent, 0.50)
                      : hexToRgba(primaryAccent, 0.35),
                  },
                ]}
              >
                <Ionicons name="sparkles" size={isTablet ? 12 : 10.5} color={primaryAccent} />
                <Text
                  style={[
                    styles.sparkleText,
                    { color: primaryAccent },
                    (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isAr ? 'أونلاين' : isKu ? 'ئۆنلاین' : 'Online'}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.subtitle,
                {
                  color: isDark ? '#E2E8F0' : '#334155',
                  fontSize: isTabletLandscape ? 13.5 : isTablet ? 12.5 : 11.5,
                  lineHeight: isTablet ? 19 : 17,
                  textAlign,
                },
              ]}
              numberOfLines={2}
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
                backgroundColor: isDark
                  ? hexToRgba(primaryAccent, 0.16)
                  : hexToRgba(primaryAccent, 0.10),
                borderColor: isDark
                  ? hexToRgba(primaryAccent, 0.40)
                  : hexToRgba(primaryAccent, 0.30),
                width: isTablet ? 34 : 28,
                height: isTablet ? 34 : 28,
                borderRadius: isTablet ? 17 : 14,
              },
            ]}
          >
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={isTablet ? 20 : 18}
              color={primaryAccent}
            />
          </View>
        </TouchableOpacity>

        {/* Downward Expanded Content (بۆ خوارەوە دەکرێتەوە) */}
        {isExpanded && (
          <View style={styles.expandedWrapper}>
            <View
              style={[
                styles.divider,
                {
                  backgroundColor: isDark
                    ? hexToRgba(primaryAccent, 0.22)
                    : hexToRgba(primaryAccent, 0.18),
                },
              ]}
            />

            {/* Intro text */}
            <View
              style={[
                styles.introBox,
                {
                  backgroundColor: isDark
                    ? hexToRgba(primaryAccent, 0.05)
                    : hexToRgba(primaryAccent, 0.03),
                  borderColor: isDark
                    ? hexToRgba(primaryAccent, 0.25)
                    : hexToRgba(primaryAccent, 0.18),
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

            {/* View Demo Website Button */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                Linking.openURL('https://froshiar.store/demo').catch(() => {});
              }}
              activeOpacity={0.85}
              style={[
                styles.demoBtn,
                {
                  backgroundColor: primaryAccent,
                  flexDirection,
                },
              ]}
            >
              <Ionicons name="globe-outline" size={18} color="#0F172A" />
              <Text
                style={[
                  styles.demoBtnText,
                  { color: '#0F172A' },
                  (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isAr ? 'مشاهدة النسخة التجريبية للموقع' : isKu ? 'بینینی دیمۆی وێبسایتەکە' : 'View Demo Website'}
              </Text>
              <Ionicons
                name={isRTL ? 'arrow-back' : 'arrow-forward'}
                size={16}
                color="#0F172A"
              />
            </TouchableOpacity>

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
                    {
                      backgroundColor: hexToRgba(primaryAccent, 0.14),
                      borderColor: hexToRgba(primaryAccent, 0.35),
                    },
                  ]}
                >
                  <Ionicons name="ribbon-outline" size={18} color={primaryAccent} />
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

            {/* Contact Admin to Activate Section - Clean Minimalist */}
            <View
              style={[
                styles.contactCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <View style={[styles.contactHeader, { flexDirection }]}>
                <Ionicons name="call-outline" size={17} color={primaryAccent} />
                <Text
                  style={[
                    styles.contactPrompt,
                    { color: isDark ? '#FFFFFF' : '#0F172A', textAlign },
                    (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isAr
                    ? 'لطلب تفعيل الموقع الإلكتروني، تواصل مع الإدارة:'
                    : isKu
                    ? 'بۆ داواکاری و چالاککردنی وێبسایت، پەیوەندی بە ئەدمینەوە بکە:'
                    : 'To request website activation, contact Admin:'}
                </Text>
              </View>

              {/* Clean Minimalist Phone Display */}
              <TouchableOpacity
                onPress={handleCall}
                activeOpacity={0.7}
                style={[
                  styles.phoneDisplay,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                <Ionicons name="call-outline" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                <Text
                  style={[
                    styles.phoneText,
                    { color: isDark ? '#FFFFFF' : '#0F172A' },
                  ]}
                >
                  {SUPPORT_PHONE}
                </Text>
              </TouchableOpacity>

              {/* Action Buttons: Call & WhatsApp with Clean Simple Styling */}
              <View style={[styles.actionButtonsRow, { flexDirection }]}>
                <TouchableOpacity
                  onPress={handleCall}
                  activeOpacity={0.8}
                  style={[
                    styles.callBtn,
                    {
                      backgroundColor: isDark ? '#334155' : '#1E293B',
                      flexDirection,
                    },
                  ]}
                >
                  <Ionicons name="call" size={15} color="#FFFFFF" />
                  <Text style={[styles.callBtnText, (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {isAr ? 'اتصال هاتفي' : isKu ? 'پەیوەندی تەلەفۆنی' : 'Call'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleWhatsApp}
                  activeOpacity={0.8}
                  style={[
                    styles.whatsappBtn,
                    {
                      backgroundColor: '#10B981',
                      flexDirection,
                    },
                  ]}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                  <Text style={[styles.whatsappBtnText, (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {isAr ? 'واتساب' : isKu ? 'نامە لە واتسئەپ' : 'WhatsApp'}
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
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
    marginHorizontal: 10,
    justifyContent: 'center',
  },
  titleRow: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.2,
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
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  contactHeader: {
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
    width: '100%',
  },
  contactPrompt: {
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  demoBtn: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  demoBtnText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    width: '100%',
  },
  phoneText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionButtonsRow: {
    width: '100%',
    gap: 10,
  },
  callBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
  whatsappBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  whatsappBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
});

