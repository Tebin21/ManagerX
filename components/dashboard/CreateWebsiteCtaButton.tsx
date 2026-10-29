import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/AppText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { SUPPORT_PHONE } from '@/constants/config';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

interface Props {
  style?: any;
}

export function CreateWebsiteCtaButton({ style }: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, flexDirection, textAlign } = useRTL();
  const { isTablet } = useResponsive();
  const [modalVisible, setModalVisible] = useState(false);

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setModalVisible(true);
  };

  const handleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {});
  };

  const handleWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const text = isRTL
      ? 'سڵاو، دەمەوێت وێبسایتی ئۆنلاین بۆ بزنسەکەم لە ئەپڵیکەیشنی فرۆشیار چالاک بکەم.'
      : 'Hello, I want to activate an online storefront for my business on Froshiar.';
    Linking.openURL(`https://wa.me/964${SUPPORT_PHONE.replace(/^0/, '')}?text=${encodeURIComponent(text)}`).catch(() => {});
  };

  return (
    <>
      <View style={[styles.container, style]}>
        <TouchableOpacity
          onPress={handleOpen}
          activeOpacity={0.85}
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#D4AF3744' : '#D4AF3777',
              flexDirection,
            },
          ]}
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
          <View style={styles.content}>
            <View style={[styles.titleRow, { flexDirection }]}>
              <Text
                style={[
                  styles.title,
                  {
                    color: isDark ? '#FFFFFF' : '#0F172A',
                    fontSize: isTablet ? 17 : 15,
                    textAlign,
                  },
                ]}
                numberOfLines={1}
              >
                {isRTL ? 'وێبسایتی بزنسەکەت دروست بکە' : 'Create Your Business Website'}
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
                <Text style={styles.sparkleText}>
                  {isRTL ? 'ئۆنلاین' : 'Online'}
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
              {isRTL
                ? 'فرۆشگای تایبەت بە ناوی مارکێتەکەت بۆ فرۆشتنی کاڵاکان'
                : 'Online storefront under your brand to sell products'}
            </Text>
          </View>

          {/* Trailing Action Icon */}
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
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={16}
              color="#D4AF37"
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Kurdish RTL Explanatory Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#E2E8F0',
                maxWidth: isTablet ? 560 : '92%',
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { flexDirection }]}>
              <View style={[styles.modalTitleWrap, { flexDirection }]}>
                <View
                  style={[
                    styles.modalHeaderIcon,
                    {
                      backgroundColor: isDark ? '#D4AF3722' : '#FFFBEB',
                      borderColor: '#D4AF37',
                    },
                  ]}
                >
                  <Ionicons name="storefront" size={24} color="#D4AF37" />
                </View>
                <View>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: isDark ? '#FFFFFF' : '#0F172A', textAlign },
                    ]}
                  >
                    {isRTL ? 'وێبسایتی بزنسەکەت دروست بکە' : 'Create Your Business Website'}
                  </Text>
                  <Text
                    style={[
                      styles.modalSub,
                      { color: isDark ? '#94A3B8' : '#64748B', textAlign },
                    ]}
                  >
                    {isRTL
                      ? 'فرۆشگای ئۆنلاینی تایبەت بە مارکێتەکەت'
                      : 'Dedicated Online Storefront for Your Brand'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[
                  styles.closeBtn,
                  { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                ]}
                hitSlop={8}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={isDark ? '#94A3B8' : '#64748B'}
                />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {/* Intro Banner */}
              <View
                style={[
                  styles.introBox,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
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
                  {isRTL
                    ? 'بە وێبسایتی فرۆشیار، سەرجەم کاڵا و بەرهەمەکانت لەسەر ئینتەرنێت بە وێنە و نرخەوە بڵاودەبنەوە و کڕیارانت دەتوانن لە هەر شوێنێک بن ڕاستەوخۆ داواکاری بنێرن.'
                    : 'With Froshiar Online Store, all your products are published online with images and prices, allowing customers to browse and order directly from anywhere.'}
                </Text>
              </View>

              {/* Feature Cards List */}
              <View style={styles.featuresList}>
                {/* Feature 1 */}
                <View
                  style={[
                    styles.featureItem,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
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
                    <Ionicons name="sync" size={20} color="#10B981" />
                  </View>
                  <View style={styles.featureTextWrap}>
                    <Text
                      style={[
                        styles.featureTitle,
                        { color: isDark ? '#FFFFFF' : '#0F172A', textAlign },
                      ]}
                    >
                      {isRTL
                        ? 'هاوکاتبوونی خۆکار لەگەڵ کۆگا'
                        : 'Real-time Automatic Catalog Sync'}
                    </Text>
                    <Text
                      style={[
                        styles.featureDesc,
                        { color: isDark ? '#94A3B8' : '#64748B', textAlign },
                      ]}
                    >
                      {isRTL
                        ? 'هەموو کاڵا و نرخەکانت کە لە ئەپەکەدا زیادیان دەکەیت خۆکارانە دەچنە سەر وێبسایتەکەت بەبێ دووبارە داخڵکردنەوە.'
                        : 'Products, prices, and stock added in the app are automatically synced to your website.'}
                    </Text>
                  </View>
                </View>

                {/* Feature 2 */}
                <View
                  style={[
                    styles.featureItem,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
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
                    <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                  </View>
                  <View style={styles.featureTextWrap}>
                    <Text
                      style={[
                        styles.featureTitle,
                        { color: isDark ? '#FFFFFF' : '#0F172A', textAlign },
                      ]}
                    >
                      {isRTL
                        ? 'داواکاری ڕاستەوخۆ بە واتسئەپ'
                        : 'Direct WhatsApp Ordering'}
                    </Text>
                    <Text
                      style={[
                        styles.featureDesc,
                        { color: isDark ? '#94A3B8' : '#64748B', textAlign },
                      ]}
                    >
                      {isRTL
                        ? 'کڕیارەکان دەتوانن سەبەتەی کڕین پڕبکەنەوە و بە یەک کلیک وەسڵی داواکارییەکە بۆ واتسئەپت بنێرن.'
                        : 'Customers can add items to their cart and send organized invoices directly to your WhatsApp.'}
                    </Text>
                  </View>
                </View>

                {/* Feature 3 */}
                <View
                  style={[
                    styles.featureItem,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
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
                    <Ionicons name="globe-outline" size={20} color="#6366F1" />
                  </View>
                  <View style={styles.featureTextWrap}>
                    <Text
                      style={[
                        styles.featureTitle,
                        { color: isDark ? '#FFFFFF' : '#0F172A', textAlign },
                      ]}
                    >
                      {isRTL
                        ? 'دۆمەین و بەستەری فەرمی مارکێتەکەت'
                        : 'Custom Official Store Link'}
                    </Text>
                    <Text
                      style={[
                        styles.featureDesc,
                        { color: isDark ? '#94A3B8' : '#64748B', textAlign },
                      ]}
                    >
                      {isRTL
                        ? 'بەستەرێکی تایبەت بە ناوی فرۆشگاکەتەوە بۆ بڵاوکردنەوە لە ئینستاگرام، سناپچات و فەیسبووک.'
                        : 'A dedicated web link with your business name to share across all social media platforms.'}
                    </Text>
                  </View>
                </View>

                {/* Feature 4 */}
                <View
                  style={[
                    styles.featureItem,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
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
                    <Ionicons name="ribbon-outline" size={20} color="#D4AF37" />
                  </View>
                  <View style={styles.featureTextWrap}>
                    <Text
                      style={[
                        styles.featureTitle,
                        { color: isDark ? '#FFFFFF' : '#0F172A', textAlign },
                      ]}
                    >
                      {isRTL
                        ? '١٠٠٪ بێ کۆمسیۆن و داهاتی تەواو'
                        : '100% Commission Free'}
                    </Text>
                    <Text
                      style={[
                        styles.featureDesc,
                        { color: isDark ? '#94A3B8' : '#64748B', textAlign },
                      ]}
                    >
                      {isRTL
                        ? 'هەموو قازانج و داهاتی فرۆشتنەکان بۆ خۆت دەبێت و هیچ بڕە پارەیەکی زیادە نابڕدرێت.'
                        : 'All earnings and profits from orders belong 100% to you without any hidden cuts.'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Contact Admin Activation Section */}
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
                    ]}
                  >
                    {isRTL
                      ? 'بۆ دروستکردن و چالاککردنی وێبسایت بۆ بزنسەکەت، پەیوەندی بە ئەدمینەوە بکە:'
                      : 'To create and activate a website for your business, contact the Admin:'}
                  </Text>
                </View>

                {/* Big Phone Number Display */}
                <View style={styles.phoneDisplay}>
                  <Text style={styles.phoneText}>{SUPPORT_PHONE}</Text>
                </View>

                {/* Direct Action Buttons */}
                <View style={[styles.actionButtonsRow, { flexDirection }]}>
                  {/* Phone Call Button */}
                  <TouchableOpacity
                    onPress={handleCall}
                    activeOpacity={0.8}
                    style={[styles.callBtn, { flexDirection }]}
                  >
                    <Ionicons name="call" size={17} color="#FFFFFF" />
                    <Text style={styles.callBtnText}>
                      {isRTL ? 'پەیوەندی تەلەفۆنی' : 'Call Admin'}
                    </Text>
                  </TouchableOpacity>

                  {/* WhatsApp Button */}
                  <TouchableOpacity
                    onPress={handleWhatsApp}
                    activeOpacity={0.8}
                    style={[styles.whatsappBtn, { flexDirection }]}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                    <Text style={styles.whatsappBtnText}>
                      {isRTL ? 'نامە لە واتسئەپ' : 'WhatsApp'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 74,
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '88%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  modalTitleWrap: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    maxHeight: 520,
  },
  introBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  introText: {
    fontSize: 13,
    lineHeight: 20,
  },
  featuresList: {
    gap: 10,
    marginBottom: 16,
  },
  featureItem: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  contactCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
  },
  contactHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  contactPrompt: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  phoneDisplay: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 14,
  },
  phoneText: {
    fontSize: 22,
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
    borderRadius: 12,
    paddingVertical: 11,
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
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 11,
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
