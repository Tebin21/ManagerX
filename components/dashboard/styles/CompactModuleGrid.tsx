import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { ModuleDefinition, ModuleId } from '@/constants/config';
import { MODULE_THEMES } from '../ModuleCard';
import { useResponsive } from '@/hooks/useResponsive';

interface Props {
  modules: ModuleDefinition[];
  isCustomizing?: boolean;
  selectedIdForSwap?: ModuleId | null;
  onStartCustomize?: (id: ModuleId) => void;
  onSelectForSwap?: (id: ModuleId) => void;
}

interface ItemProps {
  item: ModuleDefinition;
  isCustomizing?: boolean;
  isSelected?: boolean;
  onStartCustomize?: (id: ModuleId) => void;
  onSelectForSwap?: (id: ModuleId) => void;
}

function CompactItem({
  item,
  isCustomizing = false,
  isSelected = false,
  onStartCustomize,
  onSelectForSwap,
}: ItemProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { isTablet, isTabletLandscape, squircleSize, squircleIconSize, titleFontSize } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const theme = MODULE_THEMES[item.id] || {
    iconName: 'grid-outline' as const,
    tagKu: 'مۆدیول',
    iconColor: colors.primary,
  };
  const title = isKurdish ? theme.tagKu : t(item.labelKey);

  const pressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredHoldRef = useRef(false);

  useEffect(() => {
    if (isSelected) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.10,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 380,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSelected, pulseAnim]);

  const clearTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimer();
  }, []);

  const handlePressIn = () => {
    hasTriggeredHoldRef.current = false;
    clearTimer();

    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 280,
      friction: 18,
    }).start();

    holdTimerRef.current = setTimeout(() => {
      hasTriggeredHoldRef.current = true;
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } catch {}
      onStartCustomize?.(item.id);
    }, 350);
  };

  const handlePressOut = () => {
    clearTimer();
    Animated.spring(pressAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 280,
      friction: 18,
    }).start();
  };

  const handlePress = () => {
    if (hasTriggeredHoldRef.current) {
      hasTriggeredHoldRef.current = false;
      return;
    }

    if (isCustomizing) {
      onSelectForSwap?.(item.id);
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    router.push(item.route as never);
  };

  const scale = Animated.multiply(
    pulseAnim,
    pressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.94],
    })
  );

  const borderRadius = Math.round(squircleSize * 0.30);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={() => {
        if (!hasTriggeredHoldRef.current) {
          hasTriggeredHoldRef.current = true;
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          } catch {}
          onStartCustomize?.(item.id);
        }
      }}
      delayLongPress={350}
      style={[
        styles.appItem,
        {
          gap: isTablet ? 10 : 6,
          paddingVertical: isTablet ? 6 : 2,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.squircleWrap,
          {
            transform: [{ scale }],
          },
        ]}
      >
        <View
          style={[
            styles.squircle,
            {
              width: squircleSize,
              height: squircleSize,
              borderRadius,
              backgroundColor: theme.iconColor,
              shadowColor: theme.iconColor,
            },
            isSelected && {
              borderColor: '#FFFFFF',
              borderWidth: isTablet ? 3.5 : 2.5,
              shadowOpacity: 0.65,
              shadowRadius: 14,
              elevation: 10,
            },
            isCustomizing && !isSelected && {
              opacity: 0.88,
            },
          ]}
        >
          <Ionicons name={theme.iconName} size={squircleIconSize} color="#FFFFFF" />

          {/* Swap Indicator Badge */}
          {isSelected && (
            <View
              style={[
                styles.swapBadge,
                {
                  backgroundColor: colors.primary,
                  width: isTablet ? 26 : 20,
                  height: isTablet ? 26 : 20,
                  borderRadius: isTablet ? 13 : 10,
                  top: isTablet ? -6 : -5,
                  right: isTablet ? -6 : -5,
                },
              ]}
            >
              <Ionicons name="swap-horizontal" size={isTablet ? 14 : 11} color="#FFFFFF" />
            </View>
          )}

          {isCustomizing && !isSelected && (
            <View
              style={[
                styles.targetBadge,
                {
                  width: isTablet ? 22 : 17,
                  height: isTablet ? 22 : 17,
                  borderRadius: isTablet ? 11 : 8.5,
                  top: isTablet ? -4 : -3,
                  right: isTablet ? -4 : -3,
                },
              ]}
            >
              <Ionicons name="swap-vertical-outline" size={isTablet ? 13 : 10} color="#FFFFFF" />
            </View>
          )}
        </View>
      </Animated.View>

      <Text
        style={[
          styles.label,
          {
            color: colors.black,
            fontSize: titleFontSize,
          },
          isSelected && { color: colors.primary, fontWeight: '800' },
          isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function CompactModuleGrid({
  modules,
  isCustomizing = false,
  selectedIdForSwap = null,
  onStartCustomize,
  onSelectForSwap,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const { isTablet, isTabletLandscape } = useResponsive();

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
          borderColor: isCustomizing
            ? colors.primary + '50'
            : isDark
            ? colors.gray200
            : '#E2E8F0',
          paddingVertical: isTabletLandscape ? 28 : isTablet ? 22 : 18,
          paddingHorizontal: isTabletLandscape ? 24 : isTablet ? 16 : 8,
          borderRadius: isTablet ? 24 : 20,
        },
      ]}
    >
      <View
        style={[
          styles.grid,
          {
            rowGap: isTabletLandscape ? 26 : isTablet ? 20 : 16,
          },
        ]}
      >
        {modules.map((item) => (
          <CompactItem
            key={item.id}
            item={item}
            isCustomizing={isCustomizing}
            isSelected={selectedIdForSwap === item.id}
            onStartCustomize={onStartCustomize}
            onSelectForSwap={onSelectForSwap}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderWidth: 1,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: '100%',
  },
  appItem: {
    width: '25%',
    alignItems: 'center',
  },
  squircleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  squircle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 5,
    position: 'relative',
  },
  swapBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 5,
  },
  targetBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF70',
  },
  label: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
