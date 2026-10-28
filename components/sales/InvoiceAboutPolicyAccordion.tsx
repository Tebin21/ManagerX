import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { useSettingsStore } from '@/store/settingsStore';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';
import * as Haptics from 'expo-haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function InvoiceAboutPolicyAccordion() {
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const [isExpanded, setIsExpanded] = useState(false);
  const invoiceAboutPolicy = useSettingsStore((s) => s.invoiceAboutPolicy);
  const setInvoiceAboutPolicy = useSettingsStore((s) => s.setInvoiceAboutPolicy);

  const toggleExpand = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  };

  const handleClear = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
    setInvoiceAboutPolicy('');
  };

  const hasContent = !!invoiceAboutPolicy.trim();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1E293B' : colors.white,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
        },
      ]}
    >
      {/* Header Button matching CheckoutActionGrid & Preview style */}
      <TouchableOpacity
        style={[styles.headerBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        onPress={toggleExpand}
        activeOpacity={0.8}
      >
        {/* Right side in RTL: Icon Box + Title/Subtitle */}
        <View style={[styles.headerLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.headerIconBox,
              { backgroundColor: hexToRgba(colors.primary, isDark ? 0.22 : 0.12) },
            ]}
          >
            <Ionicons name="document-text-outline" size={17} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text
              style={[
                styles.title,
                { color: colors.black, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
              numberOfLines={1}
            >
              {isKurdish ? 'دەربارەی کۆمپانیا و سیاسەت' : 'About & Business Policy'}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: colors.gray400, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
              ]}
              numberOfLines={1}
            >
              {hasContent
                ? (isKurdish ? 'سیاسەت لەسەر وەسڵەکە چاپ دەکرێت' : 'Printed on invoice top')
                : (isKurdish ? 'زانیاری دەربارە و مەرجەکانی فرۆشتن' : 'Add business policy & terms')}
            </Text>
          </View>
        </View>

        {/* Left side in RTL: Badge + Chevron */}
        <View style={[styles.headerRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: hasContent
                  ? (isDark ? 'rgba(212, 175, 55, 0.15)' : '#FEF3C7')
                  : (isDark ? 'rgba(255, 255, 255, 0.06)' : colors.gray100),
                borderColor: hasContent
                  ? (isDark ? 'rgba(212, 175, 55, 0.35)' : '#FDE68A')
                  : (isDark ? 'rgba(255, 255, 255, 0.12)' : colors.gray200),
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons
              name={hasContent ? 'checkmark-circle-outline' : 'create-outline'}
              size={13}
              color={hasContent ? (isDark ? '#FBBF24' : '#B45309') : (isDark ? colors.gray400 : colors.gray600)}
            />
            <Text
              style={[
                styles.statusPillText,
                {
                  color: hasContent ? (isDark ? '#FBBF24' : '#B45309') : (isDark ? colors.gray400 : colors.gray600),
                },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {hasContent
                ? (isKurdish ? 'چالاکە' : 'Active')
                : (isKurdish ? 'دەربارە' : 'About')}
            </Text>
          </View>

          <View
            style={[
              styles.chevronCircle,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.gray100 },
            ]}
          >
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.primary}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded Policy Editor */}
      {isExpanded && (
        <View
          style={[
            styles.expandedBody,
            { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200 },
          ]}
        >
          <View style={[styles.infoBanner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="sparkles-outline" size={14} color={colors.primary} style={{ marginTop: 2 }} />
            <Text
              style={[
                styles.infoBannerText,
                { color: isDark ? colors.gray300 : colors.gray600, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
              ]}
            >
              {isKurdish
                ? 'ئەم دەقە لە سەرووی پوختەی نرخەکانی وەسڵ چاپ دەکرێت و خۆکارانە پاشەکەوت دەبێت بۆ هەموو فرۆشتنێک:'
                : 'This text prints at the very top of invoices above prices and is auto-saved for every sale:'}
            </Text>
          </View>

          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                color: colors.black,
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr',
              },
              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
            ]}
            multiline
            numberOfLines={4}
            value={invoiceAboutPolicy}
            onChangeText={setInvoiceAboutPolicy}
            placeholder={
              isKurdish
                ? 'بۆ نموونە:\n١. کاڵای فرۆشراو بە مەرجی تەندروستی ناگەڕێتەوە.\n٢. کاتی کارکردن: ٩ی بەیانی تا ٩ی شەو.\n٣. بۆ هەر سەرنجێک پەیوەندی بە بەشی خزمەتگوزاری بکەن.'
                : 'e.g. Return policies, warranty terms, working hours, company description...'
            }
            placeholderTextColor={isDark ? colors.gray500 : colors.gray400}
            textAlignVertical="top"
          />

          <View style={[styles.bottomHelperRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.autoSaveIndicator, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="shield-checkmark-outline" size={13} color={colors.primary} />
              <Text
                style={[
                  styles.autoSaveText,
                  { color: isDark ? colors.gray400 : colors.gray500 },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {isKurdish ? 'خۆکارانە پاشەکەوت دەبێت' : 'Auto-saved permanently'}
              </Text>
            </View>

            {hasContent && (
              <TouchableOpacity
                onPress={handleClear}
                style={[styles.clearBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={13} color="#EF4444" />
                <Text
                  style={[
                    styles.clearBtnText,
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKurdish ? 'سڕینەوە' : 'Clear'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chevronCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedBody: {
    padding: 14,
    borderTopWidth: 1,
  },
  infoBanner: {
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 18,
  },
  textInput: {
    minHeight: 88,
    maxHeight: 160,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 12.5,
    lineHeight: 19,
  },
  bottomHelperRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  autoSaveIndicator: {
    alignItems: 'center',
    gap: 4,
  },
  autoSaveText: {
    fontSize: 11,
  },
  clearBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  clearBtnText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
});

