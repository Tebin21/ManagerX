import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/settings/SettingsText';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsBackground } from '@/components/settings/SettingsBackground';
import { SettingSection } from '@/components/settings/SettingSection';
import { SettingRow } from '@/components/settings/SettingRow';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, useDirectionalChevron } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT } from '@/lib/settingsFont';
import { useModuleStore } from '@/store/moduleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { hexToRgba } from '@/lib/colorUtils';
import { DASHBOARD_STYLES } from './dashboard-style';
import { getScaleInfo, DEFAULT_SCALE_LEVEL, APP_SCALE_LEVELS } from '@/constants/scale';

export default function CustomizationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const { isTablet, contentContainerStyle } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const { dashboardStyle } = useModuleStore();

  const activeStyleItem =
    DASHBOARD_STYLES.find((s) => s.id === dashboardStyle) ?? DASHBOARD_STYLES[0];

  const activeStyleAccent =
    activeStyleItem.id === 'luxe'
      ? (colors.primary || '#D4AF37')
      : activeStyleItem.accentColor;

  const appScaleLevel = useSettingsStore((s) => s.appScaleLevel ?? DEFAULT_SCALE_LEVEL);
  const setAppScaleLevel = useSettingsStore((s) => s.setAppScaleLevel);
  const scaleInfo = getScaleInfo(appScaleLevel);

  const handleOpenStylesScreen = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    router.push('/(app)/settings/dashboard-style' as never);
  };

  const handleOpenScaleScreen = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    router.push('/(app)/settings/ui-scale' as never);
  };

  const handleQuickDecrement = () => {
    if (appScaleLevel > 1) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } catch {}
      setAppScaleLevel(appScaleLevel - 1);
    }
  };

  const handleQuickIncrement = () => {
    if (appScaleLevel < 10) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } catch {}
      setAppScaleLevel(appScaleLevel + 1);
    }
  };

  return (
    <View style={styles.screen}>
      <SettingsBackground />
      <SettingsHeader title={t('settings.customization.title')} />

      <ScrollView
        contentContainerStyle={[styles.body, isTablet && contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* Dashboard UI Style Section — Navigates to dedicated screen */}
        <SettingSection title={t('settings.customization.stylesSection')}>
          <SettingRow
            icon={activeStyleItem.icon}
            label={t('settings.customization.dashboardStyleTitle', {
              defaultValue: isKurdish ? 'شێوازی دیزاینی داشبۆرد' : 'Dashboard UI Styles',
            })}
            sub={t('settings.customization.dashboardStyleSub', {
              defaultValue: isKurdish ? '٥ دیزاینی جیاواز بۆ ڕووکاری داشبۆرد' : '5 unique layout themes for dashboard',
            })}
            onPress={handleOpenStylesScreen}
            rightElement={
              <View
                style={[
                  styles.stylePill,
                  {
                    backgroundColor: isDark
                      ? hexToRgba(activeStyleAccent, 0.2)
                      : hexToRgba(activeStyleAccent, 0.12),
                    borderColor: activeStyleAccent + '50',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View
                  style={[
                    styles.styleDot,
                    { backgroundColor: activeStyleAccent },
                  ]}
                />
                <Text
                  style={[
                    styles.stylePillText,
                    { color: activeStyleAccent },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {t(activeStyleItem.shortKey)}
                </Text>
                <Ionicons
                  name={chevronForward as never}
                  size={14}
                  color={activeStyleItem.accentColor}
                  style={{ marginStart: 4 }}
                />
              </View>
            }
          />
        </SettingSection>

        {/* App UI Scale & Sizing Section */}
        <SettingSection
          title={isKurdish ? 'قەبارە و پێوەری گشتی بەرنامە (UI Scale)' : 'App Display Sizing & Scale'}
        >
          <SettingRow
            icon="resize-outline"
            label={isKurdish ? 'قەبارەی گشتی بەشەکان (١٠ ئاست)' : 'General App Scale (10 Levels)'}
            sub={`${isKurdish ? scaleInfo.labelKu : scaleInfo.labelEn} • ${scaleInfo.percent}٪ (ئاستی ${scaleInfo.level})`}
            onPress={handleOpenScaleScreen}
            rightElement={
              <View
                style={[
                  styles.stylePill,
                  {
                    backgroundColor: hexToRgba(colors.primary, isDark ? 0.2 : 0.12),
                    borderColor: colors.primary + '50',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons name="expand-outline" size={13} color={colors.primary} />
                <Text
                  style={[
                    styles.stylePillText,
                    { color: colors.primary },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKurdish ? `ئاستی ${scaleInfo.level} • ${scaleInfo.percent}٪` : `Lvl ${scaleInfo.level} • ${scaleInfo.percent}%`}
                </Text>
                <Ionicons
                  name={chevronForward as never}
                  size={14}
                  color={colors.primary}
                  style={{ marginStart: 4 }}
                />
              </View>
            }
          />

          {/* Inline Quick Stepper Card */}
          <View
            style={[
              styles.inlineScaleCard,
              {
                backgroundColor: isDark ? '#1E293B' : colors.white,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          >
            <View style={[styles.inlineHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text
                  style={[
                    styles.inlineTitle,
                    { color: colors.black },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKurdish ? 'ڕێکخستنی خێرای قەبارە' : 'Quick Scale Stepper'}
                </Text>
                <Text
                  style={[
                    styles.inlineSub,
                    { color: colors.gray400 },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKurdish
                    ? `دۆخی ئێستا: ${scaleInfo.labelKu} (${scaleInfo.percent}٪)`
                    : `Current scale: ${scaleInfo.labelEn} (${scaleInfo.percent}%)`}
                </Text>
              </View>

              {/* Stepper buttons [-] / [+] */}
              <View style={[styles.inlineStepperRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  onPress={handleQuickDecrement}
                  disabled={appScaleLevel <= 1}
                  style={[
                    styles.inlineStepBtn,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                      opacity: appScaleLevel <= 1 ? 0.35 : 1,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={18} color={appScaleLevel <= 1 ? colors.gray400 : colors.primary} />
                </TouchableOpacity>

                <View style={styles.inlineLevelBadge}>
                  <Text
                    style={[
                      styles.inlineLevelText,
                      { color: colors.primary },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {appScaleLevel}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleQuickIncrement}
                  disabled={appScaleLevel >= 10}
                  style={[
                    styles.inlineStepBtn,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                      opacity: appScaleLevel >= 10 ? 0.35 : 1,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={18} color={appScaleLevel >= 10 ? colors.gray400 : colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* 10 Step progress bar */}
            <View style={[styles.inlineBarsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {APP_SCALE_LEVELS.map((item) => {
                const isActive = item.level === appScaleLevel;
                const isPassed = item.level <= appScaleLevel;
                return (
                  <TouchableOpacity
                    key={item.level}
                    onPress={() => setAppScaleLevel(item.level)}
                    activeOpacity={0.75}
                    style={styles.inlineBarTouch}
                  >
                    <View
                      style={[
                        styles.inlineBar,
                        {
                          backgroundColor: isActive
                            ? colors.primary
                            : isPassed
                            ? hexToRgba(colors.primary, 0.45)
                            : isDark
                            ? 'rgba(255, 255, 255, 0.1)'
                            : '#E2E8F0',
                          height: isActive ? 10 : 5,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Link to full preview screen */}
            <TouchableOpacity
              onPress={handleOpenScaleScreen}
              style={[styles.openPreviewBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              activeOpacity={0.75}
            >
              <Ionicons name="eye-outline" size={14} color={colors.primary} />
              <Text
                style={[
                  styles.openPreviewBtnText,
                  { color: colors.primary },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKurdish ? 'کردنەوەی پێشبینینی ڕاستەوخۆ و بینینی وردەکارییەکان' : 'Open Live Interactive Scale Preview'}
              </Text>
            </TouchableOpacity>
          </View>
        </SettingSection>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    padding: 16,
    paddingBottom: 40,
  },
  stylePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  styleDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  stylePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inlineScaleCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 10,
  },
  inlineHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inlineTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  inlineSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  inlineStepperRow: {
    alignItems: 'center',
    gap: 8,
  },
  inlineStepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineLevelBadge: {
    minWidth: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineLevelText: {
    fontSize: 16,
    fontWeight: '900',
  },
  inlineBarsRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginVertical: 10,
  },
  inlineBarTouch: {
    flex: 1,
    paddingVertical: 4,
  },
  inlineBar: {
    width: '100%',
    borderRadius: 3,
  },
  openPreviewBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    marginTop: 4,
  },
  openPreviewBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
