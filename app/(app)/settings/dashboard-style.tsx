import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/settings/SettingsText';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsBackground } from '@/components/settings/SettingsBackground';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useModuleStore, DashboardStyle } from '@/store/moduleStore';
import { MODULES } from '@/constants/config';
import { hexToRgba } from '@/lib/colorUtils';
import { ModernModuleGrid } from '@/components/dashboard/styles/ModernModuleGrid';
import { BentoModuleGrid } from '@/components/dashboard/styles/BentoModuleGrid';
import { CompactModuleGrid } from '@/components/dashboard/styles/CompactModuleGrid';
import { LuxeModuleGrid } from '@/components/dashboard/styles/LuxeModuleGrid';
import { ModuleCard } from '@/components/dashboard/ModuleCard';

interface StyleOption {
  id: DashboardStyle;
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  shortKey: string;
  descKey: string;
  accentColor: string;
  isDefault?: boolean;
}

export const DASHBOARD_STYLES: StyleOption[] = [
  {
    id: 'classic',
    icon: 'grid-outline',
    titleKey: 'settings.customization.classic.title',
    shortKey: 'settings.customization.classic.short',
    descKey: 'settings.customization.classic.desc',
    accentColor: '#059669',
    isDefault: true,
  },
  {
    id: 'modern',
    icon: 'reorder-two-outline',
    titleKey: 'settings.customization.modern.title',
    shortKey: 'settings.customization.modern.short',
    descKey: 'settings.customization.modern.desc',
    accentColor: '#3B82F6',
  },
  {
    id: 'bento',
    icon: 'layers-outline',
    titleKey: 'settings.customization.bento.title',
    shortKey: 'settings.customization.bento.short',
    descKey: 'settings.customization.bento.desc',
    accentColor: '#8B5CF6',
  },
  {
    id: 'compact',
    icon: 'apps-outline',
    titleKey: 'settings.customization.compact.title',
    shortKey: 'settings.customization.compact.short',
    descKey: 'settings.customization.compact.desc',
    accentColor: '#EC4899',
  },
  {
    id: 'luxe',
    icon: 'sparkles-outline',
    titleKey: 'settings.customization.luxe.title',
    shortKey: 'settings.customization.luxe.short',
    descKey: 'settings.customization.luxe.desc',
    accentColor: '#D4AF37',
  },
];

export default function DashboardStyleScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet, contentContainerStyle } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const { dashboardStyle, setDashboardStyle } = useModuleStore();

  const activeStyle =
    DASHBOARD_STYLES.find((s) => s.id === dashboardStyle) ?? DASHBOARD_STYLES[0];

  const handleSelectStyle = (styleId: DashboardStyle) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
    setDashboardStyle(styleId);
  };

  return (
    <View style={styles.screen}>
      <SettingsBackground />
      <SettingsHeader
        title={t('settings.customization.dashboardStyleTitle', {
          defaultValue: isKurdish ? 'شێوازی دیزاینی داشبۆرد' : 'Dashboard UI Styles',
        })}
        showBack
      />

      <ScrollView
        contentContainerStyle={[styles.body, isTablet && contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Introduction */}
        <View style={styles.sectionHeaderWrap}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.gray400, textAlign },
            ]}
          >
            {t('settings.customization.stylesSection').toUpperCase()}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.gray400, textAlign }]}>
            {t('settings.customization.tapSquareHint', {
              defaultValue: isKurdish
                ? 'دەست لە یەکێک لە ٥ چوارگۆشەکە بنێ بۆ گۆڕینی شێواز و بینینی نموونەکەی لە خوارەوە'
                : 'Tap any of the 5 squares above to switch style and preview below',
            })}
          </Text>
        </View>

        {/* 5 Compact Squares Grid (٥ چوار گۆشە) */}
        <View style={[styles.squaresGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {DASHBOARD_STYLES.map((styleItem) => {
            const isSelected = dashboardStyle === styleItem.id;

            return (
              <TouchableOpacity
                key={styleItem.id}
                activeOpacity={0.8}
                onPress={() => handleSelectStyle(styleItem.id)}
                style={[
                  styles.squareCard,
                  isTablet && styles.squareCardTablet,
                  {
                    backgroundColor: isSelected
                      ? (isDark
                          ? hexToRgba(styleItem.accentColor, 0.22)
                          : hexToRgba(styleItem.accentColor, 0.12))
                      : (isDark ? colors.gray100 : '#FFFFFF'),
                    borderColor: isSelected
                      ? styleItem.accentColor
                      : (isDark ? colors.gray200 : '#E2E8F0'),
                    borderWidth: isSelected ? 2.5 : 1,
                    shadowColor: isSelected ? styleItem.accentColor : '#000000',
                    shadowOpacity: isSelected ? 0.25 : 0.04,
                  },
                ]}
              >
                {/* Checkmark badge on selected square */}
                {isSelected && (
                  <View
                    style={[
                      styles.checkBadge,
                      { backgroundColor: styleItem.accentColor },
                    ]}
                  >
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  </View>
                )}

                {/* Default Tag */}
                {styleItem.isDefault && !isSelected && (
                  <View style={[styles.defaultTag, { backgroundColor: isDark ? colors.gray200 : colors.softBlue }]}>
                    <Text style={[styles.defaultTagText, { color: colors.primary }]}>
                      {isKurdish ? 'سەرەکی' : 'Def'}
                    </Text>
                  </View>
                )}

                {/* Icon Squircle */}
                <View
                  style={[
                    styles.squareIconBox,
                    {
                      backgroundColor: isSelected
                        ? styleItem.accentColor
                        : (isDark
                            ? hexToRgba(styleItem.accentColor, 0.18)
                            : hexToRgba(styleItem.accentColor, 0.10)),
                      borderColor: isSelected ? '#FFFFFF40' : styleItem.accentColor + '30',
                    },
                  ]}
                >
                  <Ionicons
                    name={styleItem.icon}
                    size={22}
                    color={isSelected ? '#FFFFFF' : styleItem.accentColor}
                  />
                </View>

                {/* Name */}
                <Text
                  style={[
                    styles.squareName,
                    {
                      color: isSelected
                        ? (isDark ? '#FFFFFF' : styleItem.accentColor)
                        : colors.black,
                      textAlign: 'center',
                    },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                  numberOfLines={1}
                >
                  {t(styleItem.shortKey, { defaultValue: styleItem.id })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Style Detail & Sample Section (لە خوارەوە نموونەکەی دیار بێت) */}
        <View style={styles.previewSection}>
          {/* Section Header */}
          <View style={[styles.previewHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.previewIconWrap,
                { backgroundColor: hexToRgba(activeStyle.accentColor, 0.15) },
              ]}
            >
              <Ionicons name={activeStyle.icon} size={16} color={activeStyle.accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.previewSectionTitle,
                  { color: colors.black, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {t('settings.customization.selectedPreviewTitle', {
                  defaultValue: isKurdish ? 'نموونەی شێوازی هەڵبژێردراو' : 'Selected Style Sample & Preview',
                })}
              </Text>
              <Text style={[styles.previewSectionSubtitle, { color: colors.gray400, textAlign }]}>
                {t(activeStyle.titleKey)}
              </Text>
            </View>

            <View
              style={[
                styles.activeStatusPill,
                {
                  backgroundColor: hexToRgba(activeStyle.accentColor, 0.16),
                  borderColor: activeStyle.accentColor + '40',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: activeStyle.accentColor }]} />
              <Text style={[styles.statusPillText, { color: activeStyle.accentColor }]}>
                {t('settings.customization.active')}
              </Text>
            </View>
          </View>

          {/* Full Real-Data Live Interactive Preview */}
          <View
            style={[
              styles.previewContainer,
              {
                backgroundColor: isDark ? colors.white : '#F8FAFC',
                borderColor: colors.gray200,
              },
            ]}
          >
            {activeStyle.id === 'classic' && (
              <View style={styles.classicPreviewWrap}>
                {MODULES.slice(0, 4).map((item) => (
                  <ModuleCard
                    key={item.id}
                    module={item}
                    enabled={true}
                    label={t(item.labelKey)}
                    layout="half"
                    onPress={() => {}}
                  />
                ))}
              </View>
            )}

            {activeStyle.id === 'modern' && (
              <ModernModuleGrid modules={MODULES.slice(0, 4)} />
            )}

            {activeStyle.id === 'bento' && (
              <BentoModuleGrid modules={MODULES.slice(0, 4)} />
            )}

            {activeStyle.id === 'compact' && (
              <CompactModuleGrid modules={MODULES} />
            )}

            {activeStyle.id === 'luxe' && (
              <LuxeModuleGrid modules={MODULES.slice(0, 4)} />
            )}
          </View>
        </View>

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
  sectionHeaderWrap: {
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  // 5 Squares Grid
  squaresGrid: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  squareCard: {
    width: '30.5%',
    minWidth: 100,
    height: 102,
    borderRadius: 18,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  squareCardTablet: {
    width: '18%',
    height: 125,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    end: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  defaultTag: {
    position: 'absolute',
    top: 6,
    start: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  defaultTagText: {
    fontSize: 8.5,
    fontWeight: '700',
  },
  squareIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  squareName: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Preview section
  previewSection: {
    marginTop: 4,
  },
  previewHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previewIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  previewSectionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  activeStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    minHeight: 180,
  },
  classicPreviewWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
});
