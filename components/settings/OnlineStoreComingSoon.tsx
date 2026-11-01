import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { SUPPORT_PHONE } from '@/constants/config';
import { hexToRgba } from '@/lib/colorUtils';

export function OnlineStoreComingSoon() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, flexDirection, textAlign } = useRTL();
  const currentLang = useLanguageStore((s) => s.language);
  const isKu = currentLang === 'ku';
  const isAr = currentLang === 'ar';

  const primaryAccent = colors.primary || '#D4AF37';

  const handleOpenDemo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Linking.openURL('https://froshiar.store/demo').catch(() => {});
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
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : colors.gray50 }]}>
      {/* Icon with Gold Glow */}
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isDark ? hexToRgba(primaryAccent, 0.15) : hexToRgba(primaryAccent, 0.10),
            borderColor: isDark ? hexToRgba(primaryAccent, 0.45) : hexToRgba(primaryAccent, 0.35),
          },
        ]}
      >
        <Ionicons name="storefront" size={56} color={primaryAccent} />
      </View>

      {/* Heading */}
      <Text
        style={[
          styles.heading,
          { color: isDark ? '#FFFFFF' : colors.darkBlue },
          (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
        ]}
      >
        {t('dashboard.onlineStore.comingSoonHeading')}
      </Text>

      {/* Description */}
      <Text style={[styles.sub, { color: isDark ? '#94A3B8' : colors.gray500 }]}>
        {t('dashboard.onlineStore.comingSoonBody')}
      </Text>

      {/* View Demo Website Button */}
      <TouchableOpacity
        onPress={handleOpenDemo}
        activeOpacity={0.85}
        style={[
          styles.demoBtn,
          {
            backgroundColor: primaryAccent,
            flexDirection,
          },
        ]}
      >
        <Ionicons name="globe-outline" size={20} color="#0F172A" />
        <Text
          style={[
            styles.demoBtnText,
            { color: '#0F172A' },
            (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
          ]}
        >
          {t('dashboard.onlineStore.previewDemoStore')}
        </Text>
        <Ionicons
          name={isRTL ? 'arrow-back' : 'arrow-forward'}
          size={18}
          color="#0F172A"
        />
      </TouchableOpacity>

      {/* Contact Admin Card */}
      <View
        style={[
          styles.contactCard,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
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
              backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
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

        {/* Action Buttons Row: Call & WhatsApp */}
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
            <Text style={[styles.actionBtnText, (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
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
            <Text style={[styles.actionBtnText, (isKu || isAr) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
              {isAr ? 'واتساب' : isKu ? 'نامە لە واتسئەپ' : 'WhatsApp'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconWrap: {
    width: 104,
    height: 104,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  sub: {
    fontSize: 14.5,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  demoBtn: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  demoBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  contactCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
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
  whatsappBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
});