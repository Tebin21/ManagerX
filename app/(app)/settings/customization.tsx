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
import { SettingSwitch } from '@/components/settings/SettingSwitch';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, useDirectionalChevron } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useModuleStore } from '@/store/moduleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { hexToRgba } from '@/lib/colorUtils';
import { DASHBOARD_STYLES } from './dashboard-style';

export default function CustomizationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const { isTablet, contentContainerStyle } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const settingsGridLayout = useSettingsStore((s) => s.settingsGridLayout);
  const setSettingsGridLayout = useSettingsStore((s) => s.setSettingsGridLayout);

  const {
    showDashboardNavigation,
    setShowDashboardNavigation,
    dashboardStyle,
  } = useModuleStore();

  const activeStyleItem =
    DASHBOARD_STYLES.find((s) => s.id === dashboardStyle) ?? DASHBOARD_STYLES[0];

  const activeStyleAccent =
    activeStyleItem.id === 'luxe'
      ? (colors.primary || '#D4AF37')
      : activeStyleItem.accentColor;

  const handleToggleNav = (val: boolean) => {
    try {
      Haptics.notificationAsync(
        val
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      ).catch(() => {});
    } catch {}
    setShowDashboardNavigation(val);
  };

  const handleToggleSettingsGrid = (val: boolean) => {
    try {
      Haptics.notificationAsync(
        val
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      ).catch(() => {});
    } catch {}
    setSettingsGridLayout(val);
  };

  const handleOpenStylesScreen = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    router.push('/(app)/settings/dashboard-style' as never);
  };

  return (
    <View style={styles.screen}>
      <SettingsBackground />
      <SettingsHeader title={t('settings.customization.title')} />

      <ScrollView
        contentContainerStyle={[styles.body, isTablet && contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Settings Screen Layout: List vs Grid Toggle */}
        <SettingSection title={t('settings.customization.settingsLayoutSection')}>
          <SettingSwitch
            icon="grid"
            label={t('settings.customization.settingsGridTitle')}
            sub={t('settings.customization.settingsGridSub')}
            value={settingsGridLayout}
            onToggle={handleToggleSettingsGrid}
          />
        </SettingSection>

        {settingsGridLayout && (
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: isDark ? hexToRgba(colors.primary, 0.15) : hexToRgba(colors.primary, 0.08),
                borderColor: isDark ? hexToRgba(colors.primary, 0.4) : hexToRgba(colors.primary, 0.25),
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons name="apps" size={22} color={colors.primary} />
            <Text
              style={[
                styles.noticeText,
                { color: isDark ? colors.primary : colors.black, textAlign },
              ]}
            >
              {t('settings.customization.settingsGridNotice')}
            </Text>
          </View>
        )}

        {/* 2. Master Toggle Section: Show/Hide Main Dashboard Navigation Banner */}
        <SettingSection title={t('settings.customization.navSection')}>
          <SettingSwitch
            icon="compass"
            label={t('settings.customization.showNavTitle')}
            sub={t('settings.customization.showNavSub')}
            value={showDashboardNavigation}
            onToggle={handleToggleNav}
          />
        </SettingSection>

        {!showDashboardNavigation && (
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: isDark ? hexToRgba(colors.warning, 0.15) : '#FEF3C7',
                borderColor: isDark ? hexToRgba(colors.warning, 0.4) : '#FDE68A',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons name="information-circle" size={22} color={colors.warning} />
            <Text
              style={[
                styles.noticeText,
                { color: isDark ? colors.warning : '#92400E', textAlign },
              ]}
            >
              {isKurdish
                ? 'ناڤیگەشن و بانەری سەرەکی لەسەر داشبۆرد شاردراوەتەوە. هەرکاتێک بتەوێت دەتوانیت لێرە بیخەیتەوە کار.'
                : 'Main dashboard navigation banner is hidden on the home screen. You can re-enable it here anytime.'}
            </Text>
          </View>
        )}

        {/* 2. Dashboard UI Style Section — Navigates to dedicated screen */}
        <SettingSection title={t('settings.customization.stylesSection')}>
          <SettingRow
            icon={activeStyleItem.icon}
            label={t('settings.customization.dashboardStyleTitle', {
              defaultValue: isKurdish ? 'شێوازی دیزاینی داشبۆرد' : 'Dashboard UI Styles',
            })}
            sub={t(activeStyleItem.titleKey)}
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
                  {t(activeStyleItem.titleKey)}
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
  noticeCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 10,
    marginTop: -8,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
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
});
