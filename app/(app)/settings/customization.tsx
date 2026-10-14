import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/settings/SettingsText';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsBackground } from '@/components/settings/SettingsBackground';
import { SettingSection } from '@/components/settings/SettingSection';
import { SettingSwitch } from '@/components/settings/SettingSwitch';
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
  descKey: string;
  accentColor: string;
  isDefault?: boolean;
}

const STYLES: StyleOption[] = [
  {
    id: 'classic',
    icon: 'grid-outline',
    titleKey: 'settings.customization.classic.title',
    descKey: 'settings.customization.classic.desc',
    accentColor: '#059669',
    isDefault: true,
  },
  {
    id: 'modern',
    icon: 'reorder-two-outline',
    titleKey: 'settings.customization.modern.title',
    descKey: 'settings.customization.modern.desc',
    accentColor: '#3B82F6',
  },
  {
    id: 'bento',
    icon: 'layers-outline',
    titleKey: 'settings.customization.bento.title',
    descKey: 'settings.customization.bento.desc',
    accentColor: '#8B5CF6',
  },
  {
    id: 'compact',
    icon: 'apps-outline',
    titleKey: 'settings.customization.compact.title',
    descKey: 'settings.customization.compact.desc',
    accentColor: '#EC4899',
  },
  {
    id: 'luxe',
    icon: 'sparkles-outline',
    titleKey: 'settings.customization.luxe.title',
    descKey: 'settings.customization.luxe.desc',
    accentColor: '#D4AF37',
  },
];

export default function CustomizationScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet, contentContainerStyle } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const {
    showDashboardNavigation,
    setShowDashboardNavigation,
    dashboardStyle,
    setDashboardStyle,
  } = useModuleStore();

  const handleSelectStyle = (styleId: DashboardStyle) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
    setDashboardStyle(styleId);
  };

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

  return (
    <View style={styles.screen}>
      <SettingsBackground />
      <SettingsHeader title={t('settings.customization.title')} />

      <ScrollView
        contentContainerStyle={[styles.body, isTablet && contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Master Toggle Section: Show/Hide Dashboard Navigation Grid */}
        <SettingSection title={t('settings.customization.navSection')}>
          <SettingSwitch
            icon="apps"
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
                ? 'ناڤیگەشنی مۆدیولەکان لەسەر داشبۆردی سەرەکی شاردراوەتەوە. هەرکاتێک بتەوێت دەتوانیت لێرە بیخەیتەوە کار.'
                : 'Dashboard module navigation is hidden on the main home screen. You can re-enable it here anytime.'}
            </Text>
          </View>
        )}

        {/* 2. 5 Distinct UI Styles */}
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
            {t('settings.customization.stylesSub')}
          </Text>
        </View>

        <View style={styles.stylesList}>
          {STYLES.map((styleItem) => {
            const isSelected = dashboardStyle === styleItem.id;

            return (
              <TouchableOpacity
                key={styleItem.id}
                activeOpacity={0.85}
                onPress={() => handleSelectStyle(styleItem.id)}
                style={[
                  styles.styleCard,
                  {
                    backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                    borderColor: isSelected
                      ? styleItem.accentColor
                      : isDark
                      ? colors.gray200
                      : '#E2E8F0',
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                {/* Header row of card */}
                <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.titleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View
                      style={[
                        styles.styleIconBox,
                        {
                          backgroundColor: isDark
                            ? hexToRgba(styleItem.accentColor, 0.22)
                            : hexToRgba(styleItem.accentColor, 0.12),
                          borderColor: styleItem.accentColor + '35',
                        },
                      ]}
                    >
                      <Ionicons
                        name={styleItem.icon}
                        size={22}
                        color={styleItem.accentColor}
                      />
                    </View>

                    <View>
                      <View style={[styles.nameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text
                          style={[
                            styles.styleName,
                            { color: colors.black, textAlign },
                            isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                          ]}
                        >
                          {t(styleItem.titleKey)}
                        </Text>
                        {styleItem.isDefault && (
                          <View style={[styles.defaultTag, { backgroundColor: colors.softBlue }]}>
                            <Text style={[styles.defaultTagText, { color: colors.primary }]}>
                              {isKurdish ? 'سەرەکی' : 'Default'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.styleDesc, { color: colors.gray400, textAlign }]}>
                        {t(styleItem.descKey)}
                      </Text>
                    </View>
                  </View>

                  {/* Radio / Active Badge */}
                  <View
                    style={[
                      styles.radioBadge,
                      {
                        backgroundColor: isSelected
                          ? styleItem.accentColor
                          : isDark
                          ? colors.gray200
                          : '#F1F5F9',
                        borderColor: isSelected ? styleItem.accentColor : colors.gray300,
                      },
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                </View>

                {/* Visual Mini Mockup Representation */}
                <View
                  style={[
                    styles.mockupContainer,
                    {
                      backgroundColor: isDark ? '#0F172A80' : '#F8FAFC',
                      borderColor: isDark ? '#33415550' : '#E2E8F0',
                    },
                  ]}
                >
                  {styleItem.id === 'classic' && (
                    <View style={styles.mockupGrid2}>
                      <View style={[styles.mockupClassicCard, { backgroundColor: isDark ? colors.gray100 : '#FFFFFF' }]}>
                        <View style={[styles.mockupCircle, { backgroundColor: '#059669' }]} />
                        <View style={styles.mockupLineLong} />
                        <View style={styles.mockupLineShort} />
                      </View>
                      <View style={[styles.mockupClassicCard, { backgroundColor: isDark ? colors.gray100 : '#FFFFFF' }]}>
                        <View style={[styles.mockupCircle, { backgroundColor: '#EA580C' }]} />
                        <View style={styles.mockupLineLong} />
                        <View style={styles.mockupLineShort} />
                      </View>
                    </View>
                  )}

                  {styleItem.id === 'modern' && (
                    <View style={styles.mockupCol}>
                      <View
                        style={[
                          styles.mockupModernRow,
                          {
                            backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                            borderStartColor: '#3B82F6',
                          },
                        ]}
                      >
                        <View style={[styles.mockupSquircle, { backgroundColor: '#3B82F6' }]} />
                        <View style={styles.mockupTextGroup}>
                          <View style={styles.mockupLineLong} />
                          <View style={styles.mockupLineShort} />
                        </View>
                        <Ionicons name="chevron-forward" size={12} color="#94A3B8" />
                      </View>
                      <View
                        style={[
                          styles.mockupModernRow,
                          {
                            backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                            borderStartColor: '#10B981',
                          },
                        ]}
                      >
                        <View style={[styles.mockupSquircle, { backgroundColor: '#10B981' }]} />
                        <View style={styles.mockupTextGroup}>
                          <View style={styles.mockupLineLong} />
                          <View style={styles.mockupLineShort} />
                        </View>
                        <Ionicons name="chevron-forward" size={12} color="#94A3B8" />
                      </View>
                    </View>
                  )}

                  {styleItem.id === 'bento' && (
                    <View style={styles.mockupCol}>
                      <View style={[styles.mockupBentoHero, { backgroundColor: isDark ? colors.gray100 : '#FFFFFF' }]}>
                        <View style={[styles.mockupSquircleLarge, { backgroundColor: '#8B5CF6' }]} />
                        <View style={styles.mockupTextGroup}>
                          <View style={[styles.mockupLineLong, { width: 90 }]} />
                          <View style={styles.mockupLineShort} />
                        </View>
                      </View>
                      <View style={styles.mockupGrid2}>
                        <View style={[styles.mockupBentoTile, { backgroundColor: isDark ? colors.gray100 : '#FFFFFF' }]}>
                          <View style={[styles.mockupCircle, { backgroundColor: '#0284C7' }]} />
                          <View style={styles.mockupLineShort} />
                        </View>
                        <View style={[styles.mockupBentoTile, { backgroundColor: isDark ? colors.gray100 : '#FFFFFF' }]}>
                          <View style={[styles.mockupCircle, { backgroundColor: '#D97706' }]} />
                          <View style={styles.mockupLineShort} />
                        </View>
                      </View>
                    </View>
                  )}

                  {styleItem.id === 'compact' && (
                    <View style={styles.mockupAppGrid}>
                      {['#059669', '#EA580C', '#0284C7', '#6366F1'].map((c, idx) => (
                        <View key={idx} style={styles.mockupAppItem}>
                          <View style={[styles.mockupAppIcon, { backgroundColor: c }]} />
                          <View style={[styles.mockupLineShort, { width: 30 }]} />
                        </View>
                      ))}
                    </View>
                  )}

                  {styleItem.id === 'luxe' && (
                    <View style={styles.mockupGrid2}>
                      <View
                        style={[
                          styles.mockupLuxeCard,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                            borderColor: '#D4AF37',
                          },
                        ]}
                      >
                        <View style={styles.mockupLuxeTop}>
                          <View style={styles.mockupGoldDot} />
                          <Ionicons name="sparkles" size={10} color="#D4AF37" />
                        </View>
                        <View style={styles.mockupLineLong} />
                        <View style={styles.mockupLineShort} />
                      </View>
                      <View
                        style={[
                          styles.mockupLuxeCard,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                            borderColor: '#D4AF37',
                          },
                        ]}
                      >
                        <View style={styles.mockupLuxeTop}>
                          <View style={styles.mockupGoldDot} />
                          <Ionicons name="sparkles" size={10} color="#D4AF37" />
                        </View>
                        <View style={styles.mockupLineLong} />
                        <View style={styles.mockupLineShort} />
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. Live Active Preview */}
        <View style={styles.previewSection}>
          <View style={[styles.previewHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.previewIconWrap, { backgroundColor: colors.softBlue }]}>
              <Ionicons name="eye" size={16} color={colors.primary} />
            </View>
            <Text
              style={[
                styles.previewTitle,
                { color: colors.darkBlue, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {t('settings.customization.previewTitle')}
            </Text>
          </View>

          <View
            style={[
              styles.previewContainer,
              {
                backgroundColor: isDark ? colors.white : '#F8FAFC',
                borderColor: colors.gray200,
              },
            ]}
          >
            {dashboardStyle === 'classic' && (
              <View style={styles.classicPreviewWrap}>
                {MODULES.slice(0, 4).map((item) => (
                  <ModuleCard
                    key={item.id}
                    module={item}
                    enabled={true}
                    label={t(item.labelKey)}
                    layout="half"
                  />
                ))}
              </View>
            )}

            {dashboardStyle === 'modern' && (
              <ModernModuleGrid modules={MODULES.slice(0, 4)} />
            )}

            {dashboardStyle === 'bento' && (
              <BentoModuleGrid modules={MODULES.slice(0, 4)} />
            )}

            {dashboardStyle === 'compact' && (
              <CompactModuleGrid modules={MODULES} />
            )}

            {dashboardStyle === 'luxe' && (
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
  sectionHeaderWrap: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  stylesList: {
    gap: 12,
    marginBottom: 20,
  },
  styleCard: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleGroup: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  styleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  styleName: {
    fontSize: 15,
    fontWeight: '700',
  },
  defaultTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultTagText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  styleDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    maxWidth: 240,
  },
  radioBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginTop: 2,
  },
  mockupGrid2: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  mockupCol: {
    gap: 8,
  },
  mockupClassicCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
  },
  mockupModernRow: {
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderStartWidth: 3,
  },
  mockupBentoHero: {
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mockupBentoTile: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    gap: 4,
  },
  mockupAppGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mockupAppItem: {
    alignItems: 'center',
    gap: 4,
  },
  mockupAppIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  mockupLuxeCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  mockupLuxeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mockupGoldDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4AF37',
  },
  mockupCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  mockupSquircle: {
    width: 20,
    height: 20,
    borderRadius: 6,
  },
  mockupSquircleLarge: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  mockupTextGroup: {
    flex: 1,
    gap: 3,
  },
  mockupLineLong: {
    width: 50,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B850',
  },
  mockupLineShort: {
    width: 32,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#94A3B835',
  },
  previewSection: {
    marginTop: 8,
  },
  previewHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  previewIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  previewContainer: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  classicPreviewWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
});
