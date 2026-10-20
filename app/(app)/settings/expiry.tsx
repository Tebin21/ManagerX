import React, { useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Switch,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { KeyboardAwareScrollView } from '@/components/common/KeyboardAwareScrollView';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsBackground } from '@/components/settings/SettingsBackground';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { useResponsive } from '@/hooks/useResponsive';
import { hexToRgba } from '@/lib/colorUtils';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { toEnglishDigits } from '@/utils/formatters';

const PRESET_ALERT_DAYS = [7, 15, 30, 60, 90];

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
  const expiryAlertDays = useSettingsStore((s) => s.expiryAlertDays);
  const expiryTermsAccepted = useSettingsStore((s) => s.expiryTermsAccepted);
  const setExpiryTrackingEnabled = useSettingsStore((s) => s.setExpiryTrackingEnabled);
  const setExpiryAlertDays = useSettingsStore((s) => s.setExpiryAlertDays);
  const setExpiryTermsAccepted = useSettingsStore((s) => s.setExpiryTermsAccepted);

  const products = useInventoryStore((s) => s.products);

  const [customDaysInput, setCustomDaysInput] = useState(String(expiryAlertDays));

  // Compute live expiry statistics for items currently in inventory
  const expiryStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalTracked = 0;
    let expired = 0;
    let expiringSoon = 0;
    let safe = 0;

    for (const p of products) {
      if (!p.expiryDate) continue;
      totalTracked++;
      const exp = new Date(p.expiryDate);
      exp.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        expired++;
      } else if (diffDays <= expiryAlertDays) {
        expiringSoon++;
      } else {
        safe++;
      }
    }

    return { totalTracked, expired, expiringSoon, safe };
  }, [products, expiryAlertDays]);

  const handleAgreeAndEnable = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
    setExpiryTermsAccepted(true);
    setExpiryTrackingEnabled(true);
  };

  const handleToggleSwitch = (value: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    setExpiryTrackingEnabled(value);
  };

  const handleSelectDays = (days: number) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    setExpiryAlertDays(days);
    setCustomDaysInput(String(days));
  };

  const handleCustomDaysChange = (text: string) => {
    const clean = toEnglishDigits(text).replace(/[^0-9]/g, '');
    setCustomDaysInput(clean);
    const parsed = parseInt(clean, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 365) {
      setExpiryAlertDays(parsed);
    }
  };

  return (
    <SettingsBackground>
      <AppHeader
        title={isKu ? 'بەسەرچوون' : 'Expiry Tracking'}
        showBack
      />

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          isTablet && { maxWidth: isTabletLandscape ? 900 : 720, alignSelf: 'center', width: '100%' },
        ]}
      >
        {/* ── 1. Hero Card ────────────────────────────────────── */}
        <SettingsCard style={styles.heroCard}>
          <View style={[styles.heroRow, { flexDirection }]}>
            <View
              style={[
                styles.heroIconBox,
                {
                  backgroundColor: hexToRgba(colors.primary, isDark ? 0.22 : 0.12),
                  borderColor: hexToRgba(colors.primary, isDark ? 0.40 : 0.25),
                },
              ]}
            >
              <Ionicons name="time" size={isTablet ? 36 : 28} color={colors.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <View style={[styles.titleRow, { flexDirection }]}>
                <Text
                  style={[
                    styles.heroTitle,
                    { color: colors.black, textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKu ? 'سیستەمی بەرواری بەسەرچوون' : 'Expiry Date Tracking System'}
                </Text>
              </View>

              <Text
                style={[
                  styles.heroSub,
                  { color: colors.gray400, textAlign },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {isKu
                  ? 'چاودێری کردنی تەواوی بەرواری دروستکردن و بەسەرچوونی کاڵاکان بۆ پاراستنی زیانی ماوەبەسەرچوون'
                  : 'Track manufacturing and expiration dates for your inventory with smart early alerts'}
              </Text>
            </View>
          </View>

          {/* Master Switch Row */}
          <View
            style={[
              styles.switchRow,
              {
                flexDirection,
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.60)' : colors.gray50,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
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
                {isKu ? 'چالاککردنی بەدواداچوونی بەسەرچوون' : 'Enable Expiry Tracking'}
              </Text>
              <Text
                style={[
                  styles.switchSub,
                  { color: expiryTrackingEnabled ? colors.success : colors.gray400, textAlign },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {expiryTrackingEnabled
                  ? isKu
                    ? 'چالاککراوە • بەشەکان لە کۆگا و کڕین بەردەستن'
                    : 'Active • Available in Inventory & Purchases'
                  : isKu
                  ? 'ناچالاکە • بژاردەکان لە کۆگا و کڕین شاردراونەتەوە'
                  : 'Disabled • Hidden in Inventory & Purchases'}
              </Text>
            </View>

            <Switch
              value={expiryTrackingEnabled}
              onValueChange={handleToggleSwitch}
              trackColor={{ false: isDark ? '#334155' : '#E2E8F0', true: colors.primary }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            />
          </View>
        </SettingsCard>

        {/* ── 2. Information Table & Guidelines Card ─────────── */}
        <SettingsCard style={styles.guideCard}>
          <View style={[styles.sectionHeader, { flexDirection }]}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.black, textAlign },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKu ? 'چۆنیەتی کارکردنی سیستەمەکە' : 'How Expiry Tracking Works'}
            </Text>
          </View>

          <Text
            style={[
              styles.guideIntro,
              { color: colors.gray500, textAlign },
              isKu && { fontFamily: SETTINGS_KURDISH_FONT },
            ]}
          >
            {isKu
              ? 'بە چالاککردنی ئەم بەشە، گۆڕانکارییەکان بەم شێوەیە دەبن:'
              : 'When this feature is enabled, the following enhancements take effect:'}
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
                <Text
                  style={[
                    styles.tableRowTitle,
                    { color: colors.black, textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKu ? '١. لە بەشی کڕین (Purchases)' : '1. In Purchases Module'}
                </Text>
                <Text
                  style={[
                    styles.tableRowDesc,
                    { color: colors.gray500, textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu
                    ? 'لە کاتی داخلکردنی کاڵای نوێ، دوو بژاردەی ئاسان بۆ (بەرواری دەرچوون) و (بەرواری بەسەرچوون) زیاد دەبێت لەگەڵ دوگمەی خێرای (+١ مانگ، +٣ مانگ، +٦ مانگ، +١ ساڵ...).'
                    : 'When entering items, quick options for Production and Expiry dates appear with one-tap shortcuts (+1M, +3M, +6M, +1Y).'}
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
                <Text
                  style={[
                    styles.tableRowTitle,
                    { color: colors.black, textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKu ? '٢. لە بەشی کۆگا (Inventory)' : '2. In Inventory Module'}
                </Text>
                <Text
                  style={[
                    styles.tableRowDesc,
                    { color: colors.gray500, textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu
                    ? 'لە دەستە چەپی دوگمەی بەرهەمەکان، بەشی (بەسەرچوون) چالاک دەبێت. لەوێ ڕاپۆرتی تەواوی بەروارەکان، ڕۆژەکانی ماوە، فلتەری کاڵاکان و هۆشداری پێشوەختە پشان دەدرێت.'
                    : 'A dedicated Expiry tab appears in Inventory next to Products, featuring full expiry audits, countdown days remaining, and status filters.'}
                </Text>
              </View>
            </View>

            <View style={[styles.tableDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray100 }]} />

            {/* Table Row 3: Alerts */}
            <View style={[styles.tableRow, { flexDirection }]}>
              <View style={[styles.tableIconBox, { backgroundColor: hexToRgba('#F59E0B', isDark ? 0.2 : 0.1) }]}>
                <Ionicons name="notifications" size={18} color="#F59E0B" />
              </View>
              <View style={styles.tableTextCol}>
                <Text
                  style={[
                    styles.tableRowTitle,
                    { color: colors.black, textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKu ? '٣. هۆشداری پێشوەختە (Smart Alerts)' : '3. Early Expiry Alerts'}
                </Text>
                <Text
                  style={[
                    styles.tableRowDesc,
                    { color: colors.gray500, textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu
                    ? 'دەتوانیت خۆت دیاری بکەیت کە سیستەمەکە چەند ڕۆژ پێش بەسەرچوون ئاگادارت بکاتەوە تاوەکو فریا بکەویت و کاڵاکە بفرۆشیت.'
                    : 'Customize how many days before expiration you want warnings (e.g. 30 days) to prevent stock losses.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Terms confirmation button or accepted notice */}
          {!expiryTermsAccepted ? (
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={handleAgreeAndEnable}
              style={[styles.agreeBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="checkmark-circle" size={20} color="#0F172A" />
              <Text style={[styles.agreeBtnText, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                {isKu ? 'ڕازیم و دەمەوێت چالاکی بکەم' : 'I Agree & Enable System'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.acceptedBadge,
                {
                  backgroundColor: hexToRgba(colors.success, isDark ? 0.16 : 0.08),
                  borderColor: hexToRgba(colors.success, isDark ? 0.35 : 0.25),
                  flexDirection,
                },
              ]}
            >
              <Ionicons name="checkmark-done-circle" size={20} color={colors.success} />
              <Text
                style={[
                  styles.acceptedBadgeText,
                  { color: colors.success, textAlign },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {isKu
                  ? 'ڕەزامەندیت لەسەر چۆنیەتی کارکردن داوە • دەتوانیت لە سەرەوە ئۆن و ئۆفی بکەیت'
                  : 'Guidelines accepted • You can toggle ON or OFF above'}
              </Text>
            </View>
          )}
        </SettingsCard>

        {/* ── 3. Alert Days Threshold Card ───────────────────── */}
        <SettingsCard style={styles.alertCard}>
          <View style={[styles.sectionHeader, { flexDirection }]}>
            <Ionicons name="alarm" size={20} color={colors.primary} />
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.black, textAlign },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKu ? 'ماوەی ئاگادارکردنەوە پێش بەسەرچوون' : 'Alert Notice Threshold'}
            </Text>
          </View>

          <Text
            style={[
              styles.guideIntro,
              { color: colors.gray500, textAlign },
              isKu && { fontFamily: SETTINGS_KURDISH_FONT },
            ]}
          >
            {isKu
              ? 'چەند ڕۆژ پێش بەسەرچوون کاڵاکان بخرێنە لیستی هۆشداری نزیک لە بەسەرچوون؟'
              : 'How many days before expiry should products trigger early warnings?'}
          </Text>

          {/* Quick Preset Buttons */}
          <View style={[styles.presetsWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {PRESET_ALERT_DAYS.map((days) => {
              const isSelected = expiryAlertDays === days;
              return (
                <TouchableOpacity
                  key={days}
                  activeOpacity={0.8}
                  onPress={() => handleSelectDays(days)}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark
                        ? 'rgba(30, 41, 59, 0.70)'
                        : colors.gray100,
                      borderColor: isSelected
                        ? colors.primary
                        : isDark
                        ? 'rgba(255, 255, 255, 0.10)'
                        : colors.gray200,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      {
                        color: isSelected ? '#0F172A' : colors.black,
                      },
                      isKu && { fontFamily: isSelected ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {isKu ? `${days} ڕۆژ` : `${days} Days`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Days Input */}
          <View
            style={[
              styles.customInputRow,
              {
                flexDirection,
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.60)' : colors.gray50,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.customInputLabel,
                  { color: colors.black, textAlign },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKu ? 'ڕۆژی دڵخواز (١ تا ٣٦٥ ڕۆژ)' : 'Custom Days (1 to 365)'}
              </Text>
              <Text
                style={[
                  styles.customInputSub,
                  { color: colors.gray400, textAlign },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {isKu ? `ئێستا دیاریکراوە بۆ: ${expiryAlertDays} ڕۆژ` : `Currently set to: ${expiryAlertDays} days`}
              </Text>
            </View>

            <View style={styles.inputBoxWrap}>
              <TextInput
                value={customDaysInput}
                onChangeText={handleCustomDaysChange}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="30"
                placeholderTextColor={colors.gray400}
                style={[
                  styles.daysInput,
                  {
                    color: colors.black,
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : colors.gray300,
                  },
                ]}
              />
              <Text style={[styles.inputUnit, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                {isKu ? 'ڕۆژ' : 'd'}
              </Text>
            </View>
          </View>
        </SettingsCard>

        {/* ── 4. Live Statistics Summary Card ─────────────────── */}
        <SettingsCard style={styles.statsCard}>
          <View style={[styles.sectionHeader, { flexDirection }]}>
            <Ionicons name="pie-chart" size={20} color={colors.primary} />
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.black, textAlign },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKu ? 'ئاماری کاڵاکانی کۆگا بەپێی بەسەرچوون' : 'Current Inventory Expiry Stats'}
            </Text>
          </View>

          <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Total Tracked */}
            <View
              style={[
                styles.statBox,
                {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.70)' : colors.gray50,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
                },
              ]}
            >
              <Text style={[styles.statValue, { color: colors.primary }]}>{expiryStats.totalTracked}</Text>
              <Text
                style={[styles.statLabel, { color: colors.gray400 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}
              >
                {isKu ? 'کاڵای خاوەن بەروار' : 'Tracked Items'}
              </Text>
            </View>

            {/* Expired */}
            <View
              style={[
                styles.statBox,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.30)' : '#FECACA',
                },
              ]}
            >
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{expiryStats.expired}</Text>
              <Text
                style={[styles.statLabel, { color: '#EF4444' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}
              >
                {isKu ? 'بەسەرچووە' : 'Expired'}
              </Text>
            </View>

            {/* Expiring Soon */}
            <View
              style={[
                styles.statBox,
                {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
                  borderColor: isDark ? 'rgba(245, 158, 11, 0.30)' : '#FDE68A',
                },
              ]}
            >
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{expiryStats.expiringSoon}</Text>
              <Text
                style={[styles.statLabel, { color: '#F59E0B' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}
              >
                {isKu ? 'بەم نزیکانە' : 'Expiring Soon'}
              </Text>
            </View>

            {/* Safe */}
            <View
              style={[
                styles.statBox,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#D1FAE5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.30)' : '#A7F3D0',
                },
              ]}
            >
              <Text style={[styles.statValue, { color: '#10B981' }]}>{expiryStats.safe}</Text>
              <Text
                style={[styles.statLabel, { color: '#10B981' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}
              >
                {isKu ? 'سەلامەت' : 'Safe'}
              </Text>
            </View>
          </View>

          {/* Quick link button to Inventory Expiry tab */}
          {expiryTrackingEnabled && (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => router.push('/(app)/inventory' as never)}
              style={[
                styles.viewInventoryBtn,
                {
                  backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.12)',
                  borderColor: colors.primary,
                  flexDirection,
                },
              ]}
            >
              <Ionicons name="arrow-forward-circle" size={20} color={colors.primary} />
              <Text
                style={[
                  styles.viewInventoryBtnText,
                  { color: colors.primary },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKu ? 'چوون بۆ بینینی بەشی بەسەرچوون لە کۆگا' : 'View Expiry Report in Inventory'}
              </Text>
            </TouchableOpacity>
          )}
        </SettingsCard>

        <View style={{ height: 40 }} />
      </KeyboardAwareScrollView>
    </SettingsBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    padding: 18,
    borderRadius: 20,
    gap: 16,
  },
  heroRow: {
    alignItems: 'center',
    gap: 14,
  },
  heroIconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 19,
  },
  switchRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  switchLabel: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  switchSub: {
    fontSize: 12,
    marginTop: 3,
  },
  guideCard: {
    padding: 18,
    borderRadius: 20,
    gap: 12,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  guideIntro: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
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
    gap: 3,
  },
  tableRowTitle: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  tableRowDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  tableDivider: {
    height: 1,
    width: '100%',
  },
  agreeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    marginTop: 8,
  },
  agreeBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  acceptedBadge: {
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  acceptedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  alertCard: {
    padding: 18,
    borderRadius: 20,
    gap: 14,
  },
  presetsWrap: {
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  customInputRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  customInputLabel: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  customInputSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  inputBoxWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daysInput: {
    width: 60,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  inputUnit: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsCard: {
    padding: 18,
    borderRadius: 20,
    gap: 14,
  },
  statsGrid: {
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewInventoryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  viewInventoryBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
