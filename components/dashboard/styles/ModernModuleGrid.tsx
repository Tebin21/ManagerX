import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, useDirectionalChevron } from '@/lib/rtl';
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

function ModernItem({
  item,
  isCustomizing = false,
  isSelected = false,
  onStartCustomize,
  onSelectForSwap,
}: ItemProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const { isTablet, isTabletLandscape } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const theme = MODULE_THEMES[item.id] || {
    iconName: 'grid-outline' as const,
    tagKu: 'مۆدیول',
    subtitleKu: 'بەڕێوەبردن',
    iconColor: colors.primary,
    circleBg: colors.softBlue,
  };

  const title = isKurdish ? theme.tagKu : t(item.labelKey);
  const sub = isKurdish ? theme.subtitleKu : t(item.descriptionKey);

  const pressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const liftAnim = useRef(new Animated.Value(0)).current;
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredHoldRef = useRef(false);

  useEffect(() => {
    if (isSelected) {
      Animated.spring(liftAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 18,
      }).start();

      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.99,
            duration: 380,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => {
        loop.stop();
        pulseAnim.setValue(1);
      };
    } else {
      Animated.spring(liftAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 260,
        friction: 18,
      }).start();
      pulseAnim.setValue(1);
    }
  }, [isSelected, pulseAnim, liftAnim]);

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
      outputRange: [1, 0.97],
    })
  );

  const translateY = liftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  const cardWidth = isTabletLandscape ? '23.8%' : isTablet ? '48.5%' : '48.5%';
  const iconWrapSize = isTabletLandscape ? 62 : isTablet ? 54 : 38;
  const iconSize = isTabletLandscape ? 32 : isTablet ? 28 : 19;

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
      style={{ width: cardWidth }}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
            borderRadius: isTablet ? 18 : 14,
            borderColor: isSelected
              ? colors.primary
              : isCustomizing
              ? theme.iconColor + '60'
              : isDark
              ? colors.gray200
              : '#E2E8F0',
            borderWidth: isSelected ? 3 : 1,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            transform: [{ scale }, { translateY }],
            shadowColor: isSelected ? colors.primary : '#000',
            shadowOpacity: isSelected ? 0.35 : 0.05,
            shadowRadius: isSelected ? 10 : 4,
            elevation: isSelected ? 6 : 2,
            paddingVertical: isTabletLandscape ? 20 : isTablet ? 16 : 12,
            paddingHorizontal: isTabletLandscape ? 18 : isTablet ? 16 : 12,
          },
        ]}
      >
        {/* Color accent strip on leading edge */}
        <View
          style={[
            styles.accentStrip,
            {
              backgroundColor: isSelected ? colors.primary : theme.iconColor,
              width: isTablet ? 6 : 4,
              [isRTL ? 'right' : 'left']: 0,
            },
          ]}
        />

        <View
          style={[
            styles.iconWrap,
            {
              width: iconWrapSize,
              height: iconWrapSize,
              borderRadius: isTabletLandscape ? 18 : isTablet ? 15 : 11,
              backgroundColor: isDark ? theme.iconColor + '22' : theme.circleBg,
            },
          ]}
        >
          <Ionicons name={theme.iconName} size={iconSize} color={theme.iconColor} />
        </View>

        <View style={[styles.textCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text
            style={[
              styles.title,
              {
                color: colors.black,
                textAlign,
                fontSize: isTabletLandscape ? 19 : isTablet ? 17 : 13.5,
              },
              isSelected && { color: colors.primary },
              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.sub,
              {
                color: colors.gray400,
                textAlign,
                fontSize: isTabletLandscape ? 14.5 : isTablet ? 13 : 10.5,
              },
            ]}
            numberOfLines={1}
          >
            {sub}
          </Text>
        </View>

        {/* Status indicator on trailing side */}
        {isSelected ? (
          <View style={[styles.swapBadgePill, { backgroundColor: colors.primary, width: isTabletLandscape ? 30 : isTablet ? 26 : 22, height: isTabletLandscape ? 30 : isTablet ? 26 : 22, borderRadius: isTabletLandscape ? 15 : isTablet ? 13 : 11 }]}>
            <Ionicons name="swap-horizontal" size={isTablet ? 16 : 13} color="#FFFFFF" />
          </View>
        ) : isCustomizing ? (
          <View style={[styles.swapTargetCircle, { borderColor: theme.iconColor + '80', width: isTabletLandscape ? 30 : isTablet ? 26 : 22, height: isTabletLandscape ? 30 : isTablet ? 26 : 22, borderRadius: isTabletLandscape ? 15 : isTablet ? 13 : 11 }]}>
            <Ionicons name="swap-vertical-outline" size={isTablet ? 15 : 12} color={theme.iconColor} />
          </View>
        ) : (
          <Ionicons
            name={chevronForward as never}
            size={isTabletLandscape ? 20 : isTablet ? 17 : 14}
            color={colors.gray300}
            style={{ opacity: 0.6 }}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

export function ModernModuleGrid({
  modules,
  isCustomizing = false,
  selectedIdForSwap = null,
  onStartCustomize,
  onSelectForSwap,
}: Props) {
  const { isTabletLandscape } = useResponsive();

  return (
    <View
      style={[
        styles.grid,
        {
          rowGap: isTabletLandscape ? 14 : 10,
        },
      ]}
    >
      {modules.map((item) => (
        <ModernItem
          key={item.id}
          item={item}
          isCustomizing={isCustomizing}
          isSelected={selectedIdForSwap === item.id}
          onStartCustomize={onStartCustomize}
          onSelectForSwap={onSelectForSwap}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  card: {
    position: 'relative',
    borderRadius: 14,
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
  },
  accentStrip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    marginBottom: 2,
  },
  sub: {
    lineHeight: 14,
  },
  swapBadgePill: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  swapTargetCircle: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
