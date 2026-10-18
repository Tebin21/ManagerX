import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ModuleCard } from './ModuleCard';
import { ModernModuleGrid } from './styles/ModernModuleGrid';
import { BentoModuleGrid } from './styles/BentoModuleGrid';
import { CompactModuleGrid } from './styles/CompactModuleGrid';
import { LuxeModuleGrid } from './styles/LuxeModuleGrid';
import { Text } from '@/components/ui/AppText';
import { useModuleStore } from '@/store/moduleStore';
import { MODULES, ModuleDefinition, ModuleId } from '@/constants/config';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import { useRTL } from '@/lib/rtl';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function ModuleGrid() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isTablet, isTabletLandscape } = useResponsive();
  const { isRTL, textAlign } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const {
    modules,
    dashboardStyle = 'classic',
    toggleModuleLayout,
    setAllLayouts,
    swapModules,
    resetToDefaultLayout,
  } = useModuleStore();

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [selectedIdForSwap, setSelectedIdForSwap] = useState<ModuleId | null>(null);

  const sortedModules = useMemo(() => {
    return [...MODULES].sort((a, b) => {
      const orderA = modules[a.id]?.order ?? MODULES.findIndex((m) => m.id === a.id);
      const orderB = modules[b.id]?.order ?? MODULES.findIndex((m) => m.id === b.id);
      return orderA - orderB;
    });
  }, [modules]);

  const displayModules = useMemo(() => {
    return sortedModules;
  }, [sortedModules]);

  const animateLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const safeImpact = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      Haptics.impactAsync(style).catch(() => {});
    } catch {}
  };

  const safeNotification = (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) => {
    try {
      Haptics.notificationAsync(type).catch(() => {});
    } catch {}
  };

  const handleStartCustomize = (id: ModuleId) => {
    animateLayout();
    setIsCustomizing(true);
    setSelectedIdForSwap(id);
  };

  const handleToggleLayout = (id: ModuleId) => {
    animateLayout();
    toggleModuleLayout(id);
  };

  const handleSetAll = (layout: 'half' | 'full') => {
    safeImpact(Haptics.ImpactFeedbackStyle.Medium);
    animateLayout();
    setAllLayouts(layout);
  };

  const handleSelectForSwap = (id: ModuleId) => {
    if (!selectedIdForSwap) {
      safeImpact(Haptics.ImpactFeedbackStyle.Light);
      setSelectedIdForSwap(id);
    } else if (selectedIdForSwap === id) {
      safeImpact(Haptics.ImpactFeedbackStyle.Light);
      setSelectedIdForSwap(null);
    } else {
      safeNotification(Haptics.NotificationFeedbackType.Success);
      animateLayout();
      swapModules(selectedIdForSwap, id);
      setSelectedIdForSwap(null);
    }
  };

  const handleDone = () => {
    safeNotification(Haptics.NotificationFeedbackType.Success);
    animateLayout();
    setIsCustomizing(false);
    setSelectedIdForSwap(null);
  };

  const handleReset = () => {
    safeNotification(Haptics.NotificationFeedbackType.Warning);
    animateLayout();
    resetToDefaultLayout();
    setSelectedIdForSwap(null);
  };

  return (
    <View style={[styles.container, { paddingHorizontal: isTabletLandscape ? 4 : isTablet ? 12 : 8 }]}>
      {/* Customize Toolbar when editing layout (Shown for ALL styles) */}
      {isCustomizing && (
        <View
          style={[
            styles.toolbar,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: colors.primary + '35',
            },
          ]}
        >
          <View style={[styles.toolbarHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.toolbarTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.toolbarIconBox, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="apps" size={16} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.toolbarTitle,
                  { color: colors.darkBlue, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('dashboard.customizeButtons')}
              </Text>
            </View>

            <View style={[styles.toolbarBtnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={handleReset}
                activeOpacity={0.7}
                style={[styles.resetBtn, { backgroundColor: colors.gray200 }]}
              >
                <Text
                  style={[
                    styles.resetBtnText,
                    { color: colors.gray600 },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {t('dashboard.customizeReset')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDone}
                activeOpacity={0.7}
                style={[styles.doneBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                <Text
                  style={[
                    styles.doneBtnText,
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {t('dashboard.customizeDone')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Shape Toggles: Only applicable to Classic style */}
          {dashboardStyle === 'classic' && (
            <View style={[styles.shapeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={() => handleSetAll('half')}
                activeOpacity={0.7}
                style={[
                  styles.shapeToggleBtn,
                  {
                    backgroundColor: isDark ? colors.gray200 : '#F1F5F9',
                    borderColor: isDark ? colors.gray300 : '#E2E8F0',
                  },
                ]}
              >
                <Ionicons name="grid-outline" size={13} color={colors.darkBlue} />
                <Text
                  style={[
                    styles.shapeToggleText,
                    { color: colors.darkBlue },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {isKurdish ? 'هەمووی چوارگۆشە' : 'All Square'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSetAll('full')}
                activeOpacity={0.7}
                style={[
                  styles.shapeToggleBtn,
                  {
                    backgroundColor: isDark ? colors.gray200 : '#F1F5F9',
                    borderColor: isDark ? colors.gray300 : '#E2E8F0',
                  },
                ]}
              >
                <Ionicons name="reorder-two-outline" size={15} color={colors.darkBlue} />
                <Text
                  style={[
                    styles.shapeToggleText,
                    { color: colors.darkBlue },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {isKurdish ? 'هەمووی درێژ' : 'All Wide'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.toolbarHint, { color: colors.gray500, textAlign }]}>
            {selectedIdForSwap
              ? t('dashboard.swapTapHint')
              : dashboardStyle === 'classic'
              ? t('dashboard.customizeHint')
              : isKurdish
              ? 'دەست لە دوگمەیەک بنێ بۆ دیاریکردن و ئاڵوگۆڕکردنی شوێنەکەی'
              : 'Tap a button to select and swap positions'}
          </Text>
        </View>
      )}

      {/* Modern Style */}
      {dashboardStyle === 'modern' && (
        <ModernModuleGrid
          modules={displayModules}
          isCustomizing={isCustomizing}
          selectedIdForSwap={selectedIdForSwap}
          onStartCustomize={handleStartCustomize}
          onSelectForSwap={handleSelectForSwap}
        />
      )}

      {/* Bento Style */}
      {dashboardStyle === 'bento' && (
        <BentoModuleGrid
          modules={displayModules}
          isCustomizing={isCustomizing}
          selectedIdForSwap={selectedIdForSwap}
          onStartCustomize={handleStartCustomize}
          onSelectForSwap={handleSelectForSwap}
        />
      )}

      {/* Compact Style */}
      {dashboardStyle === 'compact' && (
        <CompactModuleGrid
          modules={displayModules}
          isCustomizing={isCustomizing}
          selectedIdForSwap={selectedIdForSwap}
          onStartCustomize={handleStartCustomize}
          onSelectForSwap={handleSelectForSwap}
        />
      )}

      {/* Luxe Style */}
      {dashboardStyle === 'luxe' && (
        <LuxeModuleGrid
          modules={displayModules}
          isCustomizing={isCustomizing}
          selectedIdForSwap={selectedIdForSwap}
          onStartCustomize={handleStartCustomize}
          onSelectForSwap={handleSelectForSwap}
        />
      )}

      {/* Classic Style */}
      {dashboardStyle === 'classic' && (
        <View style={styles.gridContainer}>
          {displayModules.map((item) => {
            const config = modules[item.id];
            const layout = config?.layout ?? (item.id === 'expenses' ? 'full' : 'half');
            const isSelected = selectedIdForSwap === item.id;

            return (
              <ModuleCard
                key={item.id}
                module={item}
                enabled={config?.enabled ?? true}
                label={t(item.labelKey)}
                layout={layout}
                isCustomizing={isCustomizing}
                isSelectedForSwap={isSelected}
                onStartCustomize={() => handleStartCustomize(item.id)}
                onToggleLayout={() => handleToggleLayout(item.id)}
                onSelectForSwap={() => handleSelectForSwap(item.id)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  toolbar: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  toolbarHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolbarTitleGroup: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  toolbarIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  toolbarBtnRow: {
    alignItems: 'center',
    gap: 6,
  },
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  toolbarHint: {
    fontSize: 11,
    marginTop: 6,
  },
  shapeRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  shapeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  shapeToggleText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
