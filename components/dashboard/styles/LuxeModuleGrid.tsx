import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { ModuleDefinition, ModuleId } from '@/constants/config';
import { MODULE_THEMES } from '../ModuleCard';
import { useResponsive } from '@/hooks/useResponsive';
import { hexToRgba } from '@/lib/colorUtils';

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

function LuxeItem({
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
  const { isTablet, isTabletLandscape } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const activeAccent = colors.primary || '#D4AF37';

  const theme = MODULE_THEMES[item.id] || {
    iconName: 'grid-outline' as const,
    tagKu: 'مۆدیول',
    subtitleKu: 'تایبەتمەندی',
    iconColor: activeAccent,
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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

  const cardWidth = isTabletLandscape ? '23.8%' : '48.5%';
  const ringSize = isTabletLandscape ? 54 : isTablet ? 46 : 34;

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
            borderRadius: isTablet ? 20 : 16,
            borderColor: isSelected
              ? activeAccent
              : isDark
              ? hexToRgba(activeAccent, 0.40)
              : hexToRgba(activeAccent, 0.30),
            borderWidth: isSelected ? 3 : 1.5,
            shadowColor: isSelected ? activeAccent : isDark ? '#000000' : activeAccent,
            shadowOpacity: isSelected ? 0.45 : isDark ? 0.30 : 0.12,
            shadowRadius: isSelected ? 10 : 6,
            elevation: isSelected ? 6 : 3,
            transform: [{ scale }, { translateY }],
          },
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? ['#1E293B', '#1E293BEE', hexToRgba(activeAccent, isSelected ? 0.25 : 0.12)]
              : ['#FFFFFF', '#FAFBFD', hexToRgba(activeAccent, isSelected ? 0.18 : 0.08)]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.cardGradient,
            {
              padding: isTabletLandscape ? 22 : isTablet ? 18 : 14,
              minHeight: isTabletLandscape ? 156 : isTablet ? 138 : 110,
            },
          ]}
        >
          {/* Header: Dynamic theme accent chip & Star / Swap status */}
          <View style={[styles.topRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: hexToRgba(activeAccent, isDark ? 0.22 : 0.12),
                  borderColor: hexToRgba(activeAccent, isDark ? 0.42 : 0.28),
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  paddingHorizontal: isTablet ? 11 : 8,
                  paddingVertical: isTablet ? 5 : 3,
                },
                isSelected && {
                  backgroundColor: activeAccent,
                  borderColor: '#FFFFFF',
                },
              ]}
            >
              <Ionicons
                name={isSelected ? 'swap-horizontal' : 'sparkles'}
                size={isTablet ? 13 : 10}
                color={isSelected ? '#FFFFFF' : activeAccent}
              />
              <Text style={[styles.pillText, { color: isSelected ? '#FFFFFF' : activeAccent, fontSize: isTabletLandscape ? 13.5 : isTablet ? 12.5 : 10.5 }]}>
                {isSelected ? (isKurdish ? 'هەڵبژێردراو' : 'Selected') : title}
              </Text>
            </View>

            {isSelected ? (
              <View
                style={[
                  styles.ringIcon,
                  {
                    width: ringSize,
                    height: ringSize,
                    borderRadius: ringSize / 2,
                    borderColor: '#FFFFFF',
                    backgroundColor: activeAccent,
                  },
                ]}
              >
                <Ionicons name="swap-horizontal" size={isTablet ? 22 : 16} color="#FFFFFF" />
              </View>
            ) : isCustomizing ? (
              <View
                style={[
                  styles.ringIcon,
                  {
                    width: ringSize,
                    height: ringSize,
                    borderRadius: ringSize / 2,
                    borderColor: hexToRgba(activeAccent, 0.6),
                    backgroundColor: hexToRgba(activeAccent, 0.15),
                  },
                ]}
              >
                <Ionicons name="swap-vertical-outline" size={isTablet ? 22 : 16} color={activeAccent} />
              </View>
            ) : (
              <View
                style={[
                  styles.ringIcon,
                  {
                    width: ringSize,
                    height: ringSize,
                    borderRadius: ringSize / 2,
                    borderColor: hexToRgba(theme.iconColor, isDark ? 0.45 : 0.30),
                    backgroundColor: hexToRgba(theme.iconColor, isDark ? 0.15 : 0.08),
                  },
                ]}
              >
                <Ionicons name={theme.iconName} size={isTabletLandscape ? 28 : isTablet ? 24 : 18} color={theme.iconColor} />
              </View>
            )}
          </View>

          {/* Title & Description */}
          <View style={[styles.bottomCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text
              style={[
                styles.title,
                {
                  color: colors.black,
                  textAlign,
                  fontSize: isTabletLandscape ? 19.5 : isTablet ? 17.5 : 14.5,
                },
                isSelected && { color: activeAccent },
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
                  fontSize: isTabletLandscape ? 14.5 : isTablet ? 13 : 11,
                },
              ]}
              numberOfLines={1}
            >
              {sub}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

export function LuxeModuleGrid({
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
        <LuxeItem
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
    borderRadius: 18,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
  },
  cardGradient: {
    justifyContent: 'space-between',
  },
  topRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pill: {
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
  },
  pillText: {
    fontWeight: '700',
  },
  ringIcon: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomCol: {
    width: '100%',
  },
  title: {
    fontWeight: '800',
    marginBottom: 2,
  },
  sub: {
    lineHeight: 15,
  },
});
