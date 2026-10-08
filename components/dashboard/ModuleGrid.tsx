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
  const { isTablet } = useResponsive();
  const { isRTL, textAlign } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const {
    modules,
    toggleModuleLayout,
    swapModules,
    moveModule,
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

  const handleHold2Seconds = (id: ModuleId) => {
    animateLayout();
    toggleModuleLayout(id);
    setIsCustomizing(true);
  };

  const handleLongPress = () => {
    animateLayout();
    setIsCustomizing(true);
  };

  const handleToggleLayout = (id: ModuleId) => {
    safeImpact(Haptics.ImpactFeedbackStyle.Light);
    animateLayout();
    toggleModuleLayout(id);
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

  const handleMove = (id: ModuleId, dir: 'up' | 'down') => {
    safeImpact(Haptics.ImpactFeedbackStyle.Light);
    animateLayout();
    moveModule(id, dir);
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
    <View style={[styles.container, { paddingHorizontal: isTablet ? 12 : 8 }]}>
      {/* Customize Toolbar when editing layout */}
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

          <Text style={[styles.toolbarHint, { color: colors.gray500, textAlign }]}>
            {selectedIdForSwap ? t('dashboard.swapTapHint') : t('dashboard.customizeHint')}
          </Text>
        </View>
      )}

      {/* Grid of 7 Buttons */}
      <View style={styles.gridContainer}>
        {displayModules.map((item, index) => {
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
              onHold2Seconds={() => handleHold2Seconds(item.id)}
              onLongPress={handleLongPress}
              onToggleLayout={() => handleToggleLayout(item.id)}
              onSelectForSwap={() => handleSelectForSwap(item.id)}
              onMovePrev={() => handleMove(item.id, 'up')}
              onMoveNext={() => handleMove(item.id, 'down')}
              canMovePrev={index > 0}
              canMoveNext={index < displayModules.length - 1}
            />
          );
        })}
      </View>
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
});
