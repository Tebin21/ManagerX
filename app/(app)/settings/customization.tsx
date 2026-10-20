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
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useModuleStore } from '@/store/moduleStore';
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

  const { dashboardStyle } = useModuleStore();

  const activeStyleItem =
    DASHBOARD_STYLES.find((s) => s.id === dashboardStyle) ?? DASHBOARD_STYLES[0];

  const activeStyleAccent =
    activeStyleItem.id === 'luxe'
      ? (colors.primary || '#D4AF37')
      : activeStyleItem.accentColor;

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
        {/* Dashboard UI Style Section — Navigates to dedicated screen */}
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
