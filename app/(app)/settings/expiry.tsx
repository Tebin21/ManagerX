import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsBackground } from '@/components/settings/SettingsBackground';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { useResponsive } from '@/hooks/useResponsive';
import { hexToRgba } from '@/lib/colorUtils';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

export default function ExpirySettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL } = useRTL();
  const textAlign = isRTL ? 'right' : 'left';
  const flexDirection = isRTL ? 'row-reverse' : 'row';
  const isKu = useLanguageStore((s) => s.language !== 'en');
  const { isTablet, isTabletLandscape } = useResponsive();

  const expiryTrackingEnabled = useSettingsStore((s) => s.expiryTrackingEnabled);
  const expiryTermsAccepted = useSettingsStore((s) => s.expiryTermsAccepted);
  const setExpiryTrackingEnabled = useSettingsStore((s) => s.setExpiryTrackingEnabled);
  const setExpiryTermsAccepted = useSettingsStore((s) => s.setExpiryTermsAccepted);

  // Local state for the checkbox (سەح) at the bottom
  const [termsChecked, setTermsChecked] = useState(expiryTermsAccepted);

  // Handle toggling the checkbox (سەح)
  const handleToggleTermsCheckbox = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    const nextVal = !termsChecked;
    setTermsChecked(nextVal);
    setExpiryTermsAccepted(nextVal);
    // If user unchecks the checkbox, we also disable tracking
    if (!nextVal && expiryTrackingEnabled) {
      setExpiryTrackingEnabled(false);
    }
  };

  // Handle toggling the master switch at the very bottom
  const handleToggleSwitch = (value: boolean) => {
    if (!termsChecked) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } catch {}
      Alert.alert(
        isKu ? 'ئاگاداری' : 'Notice',
        isKu
          ? 'تکایە سەرەتا سەحی خوێندنەوەی ڕێنماییەکان لێبدە بۆ ئەوەی بتوانیت سیستەمەکە چالاک بکەیت.'
          : 'Please check the agreement box above to enable this feature.'
      );
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    setExpiryTrackingEnabled(value);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.black : colors.gray50 }]}>
      <SettingsBackground />
      <AppHeader
        title={isKu ? 'بەسەرچوون' : 'Expiry Tracking'}
        showBack
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          isTablet && {
            maxWidth: isTabletLandscape ? 960 : 760,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 1. Hero / Purpose Card (بۆ چی بەکار دێت) ────────────────── */}
        <SettingsCard style={styles.heroCard}>
          <View style={[styles.heroHeaderRow, { flexDirection }]}>
            <View
              style={[
                styles.heroIconBox,
                {
                  backgroundColor: hexToRgba(colors.primary, isDark ? 0.22 : 0.12),
                  borderColor: hexToRgba(colors.primary, isDark ? 0.40 : 0.25),
                },
              ]}
            >
              <Ionicons name="time" size={isTablet ? 32 : 26} color={colors.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.heroTitle,
                  { color: colors.black, textAlign },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKu ? 'سیستەمی بەرواری بەسەرچوون چییە؟' : 'What is Expiry Tracking?'}
              </Text>
              <Text
                style={[
                  styles.heroSubBadge,
                  { color: colors.primary, textAlign },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {isKu ? 'بۆ چی بەکاردێت و چۆن سوودی لێ دەبینیت؟' : 'Purpose & Key Advantages'}
              </Text>
            </View>
          </View>

          {/* Detailed Kurdish Explanation */}
          <View
            style={[
              styles.heroExplainBox,
              {
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.50)' : colors.gray50,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
              },
            ]}
          >
            <Text
              style={[
                styles.heroExplainText,
                { color: isDark ? '#E2E8F0' : '#334155', textAlign },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT },
              ]}
            >
              {isKu
                ? 'ئەم سیستەمە تایبەتە بە کۆنتڕۆڵکردن و چاودێریکردنی تەواوی تەمەنی بەرهەمەکان (بەرواری دروستکردن و بەرواری بەسەرچوون). بەتایبەتی بۆ ئەو فرۆشگایانەی کاڵای خۆراکی، دەرمان، کەرەستەی جوانکاری یان ئەو بەرهەمانە دەفرۆشن کە ماوەی بەسەرچوونیان هەیە.\n\nبە یارمەتی ئەم بەشە، سەرمایەکەت لە زەرەری ماوەبەسەرچوون دەپارێزیت و پێشوەختە ئاگاداری ئەو کاڵایانە دەبیت کە کاتیان کەم ماوە تاوەکو بە زوویی بیانفرۆشیت یان بگەڕێنیتەوە بۆ کۆمپانیا و دابینکەرەکان.'
                : 'This system enables comprehensive tracking of product shelf-life (manufacturing & expiry dates). Designed especially for food, pharmaceutical, cosmetic, and perishable retail businesses to minimize inventory loss and protect customers.'}
            </Text>
          </View>

          {/* 3 Key Benefits */}
          <View
            style={[
              styles.benefitsContainer,
              { flexDirection: isTablet ? (isRTL ? 'row-reverse' : 'row') : 'column' },
            ]}
          >
            <View
              style={[
                styles.benefitItem,
                isTablet && { flex: 1 },
                {
                  flexDirection,
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.60)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
                },
              ]}
            >
              <View style={[styles.benefitIconBox, { backgroundColor: hexToRgba('#EF4444', isDark ? 0.2 : 0.1) }]}>
                <Ionicons name="shield-checkmark" size={18} color="#EF4444" />
              </View>
              <View style={styles.benefitTextCol}>
                <Text
                  style={[
                    styles.benefitTitle,
                    { color: colors.black, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKu ? 'پاراستنی سەرمایە لە زیان' : 'Prevent Stock Loss'}
                </Text>
                <Text
                  style={[
                    styles.benefitDesc,
                    { color: colors.gray400, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu
                    ? 'ڕێگری لە بەفیڕۆچوونی کاڵاکان و زانینی بەهای ئەو بەرهەمانەی نزیکن لە بەسەرچوون.'
                    : 'Eliminate wasted inventory and identify at-risk items before they expire.'}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.benefitItem,
                isTablet && { flex: 1 },
                {
                  flexDirection,
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.60)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
                },
              ]}
            >
              <View style={[styles.benefitIconBox, { backgroundColor: hexToRgba('#F59E0B', isDark ? 0.2 : 0.1) }]}>
                <Ionicons name="notifications" size={18} color="#F59E0B" />
              </View>
              <View style={styles.benefitTextCol}>
                <Text
                  style={[
                    styles.benefitTitle,
                    { color: colors.black, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKu ? 'ئاگاداری زیرەکی پێشوەختە' : 'Smart Early Warning'}
                </Text>
                <Text
                  style={[
                    styles.benefitDesc,
                    { color: colors.gray400, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu
                    ? 'ئاگاداربە لە ژمارەی ڕۆژەکانی ماوە بەپێی ئەو ماوەیەی کە خۆت دیاری دەکەیت.'
                    : 'Configurable countdown alerts notify you well ahead of expiration deadlines.'}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.benefitItem,
                isTablet && { flex: 1 },
                {
                  flexDirection,
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.60)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
                },
              ]}
            >
              <View style={[styles.benefitIconBox, { backgroundColor: hexToRgba('#10B981', isDark ? 0.2 : 0.1) }]}>
                <Ionicons name="checkmark-done-circle" size={18} color="#10B981" />
              </View>
              <View style={styles.benefitTextCol}>
                <Text
                  style={[
                    styles.benefitTitle,
                    { color: colors.black, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKu ? 'تۆمارکردنی ئاسان و خێرا' : 'Quick & Intuitive Flow'}
                </Text>
                <Text
                  style={[
                    styles.benefitDesc,
                    { color: colors.gray400, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu
                    ? 'دوگمەی کورتەبڕی خێرا بۆ کاتی کڕین بە یەک کلیک (+١ مانگ، +٣ مانگ، +١ ساڵ...).'
                    : 'One-tap date shortcut chips during purchase entry make intake effortless.'}
                </Text>
              </View>
            </View>
          </View>
        </SettingsCard>

        {/* ── 2. Guidelines & Feature Table (ڕێنمایی و چۆنیەتی کارکردن) ── */}
        <SettingsCard style={styles.guideCard}>
          <View style={[styles.sectionHeader, { flexDirection }]}>
            <Ionicons name="book" size={20} color={colors.primary} />
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.black, textAlign },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKu ? 'ڕێنمایی چۆنیەتی کارکردنی بەشەکان' : 'Feature Workflow & Instructions'}
            </Text>
          </View>

          <Text
            style={[
              styles.guideIntro,
              { color: colors.gray400, textAlign },
              isKu && { fontFamily: SETTINGS_KURDISH_FONT },
            ]}
          >
            {isKu
              ? 'تکایە ئەم خاڵانە بە وردی بخوێنەوە بۆ ئەوەی بزانیت سیستەمەکە چۆن کار دەکات:'
              : 'Please read the following guidelines carefully to understand the integrated workflow:'}
          </Text>

          {/* Table Breakdown */}
          <View
            style={[
              styles.tableContainer,
              {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : colors.gray200,
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.40)' : '#FFFFFF',
              },
            ]}
          >
            {/* Table Row 1: Purchases */}
            <View style={[styles.tableRow, { flexDirection }]}>
              <View style={[styles.tableIconBox, { backgroundColor: hexToRgba('#3B82F6', isDark ? 0.2 : 0.1) }]}>
                <Ionicons name="cart" size={18} color="#3B82F6" />
              </View>
              <View style={styles.tableTextCol}>
                <View style={[styles.rowHeaderWrap, { flexDirection }]}>
                  <Text
                    style={[
                      styles.tableRowTitle,
                      { color: colors.black, textAlign },
                      isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isKu ? '١. لە کاتی کڕینی کاڵادا' : '1. During Purchases Intake'}
                  </Text>
                  <View style={[styles.rowBadge, { backgroundColor: hexToRgba('#3B82F6', isDark ? 0.25 : 0.12) }]}>
                    <Text style={[styles.rowBadgeText, { color: '#3B82F6' }]}>Purchases</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.tableRowDesc,
                    { color: colors.gray400, textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu
                    ? 'لە کاتی داخلکردنی کاڵای نوێ لە بەشی کڕین، دوو بژاردەی ئاسان بۆ (بەرواری دەرچوون) و (بەرواری بەسەرچوون) دەردەکەوێت لەگەڵ دوگمەی کورتەبڕی خێرا وەک (+١ مانگ، +٣ مانگ، +٦ مانگ، +١ ساڵ...).'
                    : 'When entering inventory bills, quick fields for Production and Expiry dates appear with one-tap shortcut chips (+1M, +3M, +6M, +1Y).'}
                </Text>
              </View>
            </View>

            <View style={[styles.tableDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray100 }]} />

            {/* Table Row 2: Inventory */}
            <View style={[styles.tableRow, { flexDirection }]}>
              <View style={[styles.tableIconBox, { backgroundColor: hexToRgba('#10B981', isDark ? 0.2 : 0.1) }]}>
                <Ionicons name="cube" size={18} color="#10B981" />
              </View>
              <View style={styles.tableTextCol}>
                <View style={[styles.rowHeaderWrap, { flexDirection }]}>
                  <Text
                    style={[
                      styles.tableRowTitle,
                      { color: colors.black, textAlign },
                      isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isKu ? '٢. لە بەشی کۆگا و ئامار' : '2. In Inventory Module'}
                  </Text>
                  <View style={[styles.rowBadge, { backgroundColor: hexToRgba('#10B981', isDark ? 0.25 : 0.12) }]}>
                    <Text style={[styles.rowBadgeText, { color: '#10B981' }]}>Inventory</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.tableRowDesc,
                    { color: colors.gray400, textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu
                    ? 'لە داشبۆردی سەرەکی دوگمەی تایبەتی (بەسەرچوون) لە خوارەوە چالاک دەبێت. لەوێ ئامار، ڕاپۆرتی تەواوی بەروارەکان، ڕۆژەکانی ماوە بۆ بەسەرچوون، فلتەری خێرا و ئاگادارییەکان نیشان دەدرێت.'
                    : 'A dedicated Expiry module appears on your main Dashboard at the bottom, featuring full expiration audits, countdown days, and status filters.'}
                </Text>
              </View>
            </View>

            <View style={[styles.tableDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray100 }]} />

            {/* Table Row 3: Alerts */}
            <View style={[styles.tableRow, { flexDirection }]}>
              <View style={[styles.tableIconBox, { backgroundColor: hexToRgba('#F59E0B', isDark ? 0.2 : 0.1) }]}>
                <Ionicons name="alarm" size={18} color="#F59E0B" />
              </View>
              <View style={styles.tableTextCol}>
                <View style={[styles.rowHeaderWrap, { flexDirection }]}>
                  <Text
                    style={[
                      styles.tableRowTitle,
                      { color: colors.black, textAlign },
                      isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isKu ? '٣. ئاگاداری پێشوەختە' : '3. Early Warning Alerts'}
                  </Text>
                  <View style={[styles.rowBadge, { backgroundColor: hexToRgba('#F59E0B', isDark ? 0.25 : 0.12) }]}>
                    <Text style={[styles.rowBadgeText, { color: '#F59E0B' }]}>Smart Alerts</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.tableRowDesc,
                    { color: colors.gray400, textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu
                    ? 'لە بەشی بەسەرچوون دەتوانیت ژمارەی ئەو ڕۆژانە دیاری بکەیت کە سیستەمەکە پێشوەختە هۆشداریت پێ بدات پێش بەسەرچوونی کاڵاکان.'
                    : 'Customize how many days before expiration you want warnings directly in the Expiry module.'}
                </Text>
              </View>
            </View>
          </View>
        </SettingsCard>


        {/* ── 5. Bottom Agreement & Master Activation Card (پەسەندکردن و ۆن و ۆف لە خوارەوە) ── */}
        <SettingsCard
          style={[
            styles.activationCard,
            {
              borderColor: termsChecked
                ? hexToRgba(colors.primary, isDark ? 0.45 : 0.30)
                : isDark
                ? 'rgba(255, 255, 255, 0.10)'
                : colors.gray200,
            },
          ]}
        >
          <View style={[styles.sectionHeader, { flexDirection }]}>
            <Ionicons
              name={termsChecked ? 'shield-checkmark' : 'lock-closed'}
              size={20}
              color={termsChecked ? colors.primary : colors.gray400}
            />
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.black, textAlign },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKu ? 'پەسەندکردن و چالاککردنی سیستەم' : 'Terms Agreement & Activation'}
            </Text>
          </View>

          {/* Step 1: Checkbox (دەبێ سەحێ لێ بدات) */}
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={handleToggleTermsCheckbox}
            style={[
              styles.checkboxRow,
              {
                flexDirection,
                backgroundColor: termsChecked
                  ? hexToRgba(colors.primary, isDark ? 0.14 : 0.08)
                  : isDark
                  ? 'rgba(15, 23, 42, 0.60)'
                  : colors.gray50,
                borderColor: termsChecked
                  ? colors.primary
                  : isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : colors.gray300,
              },
            ]}
          >
            {/* The Checkbox Square (سەح) */}
            <View
              style={[
                styles.checkboxSquare,
                {
                  backgroundColor: termsChecked ? colors.primary : isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: termsChecked ? colors.primary : colors.gray400,
                },
              ]}
            >
              {termsChecked && (
                <Ionicons name="checkmark" size={18} color="#0F172A" />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.checkboxLabel,
                  { color: colors.black, textAlign },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKu
                  ? 'هەموو ڕێنماییەکان و چۆنیەتی کارکردنی سیستەمەکەم خوێندەوە و تێگەیشتم'
                  : 'I have read and agree to all feature guidelines and instructions'}
              </Text>
              <Text
                style={[
                  styles.checkboxSub,
                  { color: termsChecked ? colors.primary : colors.gray400, textAlign },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {termsChecked
                  ? isKu
                    ? 'ڕەزامەندیت داوە • دەتوانیت لە خوارەوە ئۆن و ئۆفی بکەیت'
                    : 'Agreed • You can toggle ON / OFF below'
                  : isKu
                  ? 'بۆ ئەوەی بتوانیت ئۆن و ئۆف بکەیت، دەبێ سەرەتا ئەم سەحە لێبدەیت'
                  : 'You must check this box first before you can toggle the switch'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Step 2: Master Switch (ۆن و ۆف لە خوار خوارەوە) */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (!termsChecked) {
                Alert.alert(
                  isKu ? 'پەسەندکردنی ڕێنماییەکان' : 'Agreement Required',
                  isKu
                    ? 'بۆ چالاککردنی ئەم بەشە دەبێ سەرەتا سەحی خوێندنەوەی ڕێنماییەکان لێبدەیت. ئایا دەتەوێت پەسەندی بکەیت و چالاکی بکەیت؟'
                    : 'Please confirm that you have read the guidelines before enabling.',
                  [
                    { text: isKu ? 'داخستن' : 'Cancel', style: 'cancel' },
                    {
                      text: isKu ? 'بەڵێ، پەسەندم کرد' : 'Agree & Enable',
                      onPress: () => {
                        setTermsChecked(true);
                        setExpiryTermsAccepted(true);
                        setExpiryTrackingEnabled(true);
                      },
                    },
                  ]
                );
              } else {
                handleToggleSwitch(!expiryTrackingEnabled);
              }
            }}
            style={[
              styles.bottomSwitchRow,
              {
                flexDirection,
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.60)' : colors.gray50,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
                opacity: termsChecked ? 1 : 0.6,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.switchLabel,
                  { color: colors.black, textAlign },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKu ? 'چالاککردنی سیستەمی بەرواری بەسەرچوون' : 'Enable Expiry Tracking'}
              </Text>
              <Text
                style={[
                  styles.switchSub,
                  {
                    color: !termsChecked
                      ? colors.gray400
                      : expiryTrackingEnabled
                      ? colors.success
                      : colors.gray400,
                    textAlign,
                  },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {!termsChecked
                  ? isKu
                    ? 'سەرەتا سەحی سەرەوە لێبدە بۆ چالاککردنی ئەم دوگمەیە'
                    : 'Check agreement box above first'
                  : expiryTrackingEnabled
                  ? isKu
                    ? 'سیستەمەکە چالاکە (ON) • لە کۆگا و کڕین بەردەستە'
                    : 'Active (ON) • Available in Inventory & Purchases'
                  : isKu
                  ? 'سیستەمەکە ناچالاکە (OFF) • لە کۆگا و کڕین شاردراوەتەوە'
                  : 'Disabled (OFF) • Hidden in Inventory & Purchases'}
              </Text>
            </View>

            <Switch
              value={expiryTrackingEnabled}
              onValueChange={handleToggleSwitch}
              trackColor={{ false: isDark ? '#334155' : '#E2E8F0', true: colors.primary }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            />
          </TouchableOpacity>
        </SettingsCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 16,
  },

  /* ── Hero & Purpose Card ── */
  heroCard: {
    padding: 18,
    borderRadius: 20,
    gap: 16,
  },
  heroHeaderRow: {
    alignItems: 'center',
    gap: 14,
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  heroSubBadge: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 2,
    fontWeight: '600',
  },
  heroExplainBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  heroExplainText: {
    fontSize: 13.5,
    lineHeight: 22,
  },
  benefitsContainer: {
    gap: 10,
  },
  benefitItem: {
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  benefitIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  benefitTextCol: {
    flex: 1,
    gap: 2,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  benefitDesc: {
    fontSize: 12.5,
    lineHeight: 19,
  },

  /* ── Guidelines & Table Card ── */
  guideCard: {
    padding: 18,
    borderRadius: 20,
    gap: 14,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  guideIntro: {
    fontSize: 13,
    lineHeight: 20,
  },
  tableContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableRow: {
    padding: 14,
    alignItems: 'flex-start',
    gap: 12,
  },
  tableIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tableTextCol: {
    flex: 1,
    gap: 4,
  },
  rowHeaderWrap: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tableRowTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    lineHeight: 21,
  },
  rowBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rowBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tableRowDesc: {
    fontSize: 12.5,
    lineHeight: 20,
  },
  tableDivider: {
    height: 1,
    width: '100%',
  },

  /* ── Bottom Activation & Agreement Card (لە خوار خوارەوە) ── */
  activationCard: {
    padding: 18,
    borderRadius: 20,
    gap: 14,
    borderWidth: 1.5,
  },
  checkboxRow: {
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  checkboxSquare: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  checkboxSub: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  bottomSwitchRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  switchLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    lineHeight: 20,
  },
  switchSub: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
});
