import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

function BentoHeroCard({
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
    subtitleKu: 'تۆمارکردن',
    iconColor: colors.primary,
    circleBg: colors.softBlue,
  };

  const title = isKurdish ? theme.tagKu : t(item.labelKey);
  const sub = isKurdish ? theme.subtitleKu : t(item.descriptionKey);

  const pressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredHoldRef = useRef(false);

  useEffect(() => {
    if (isSelected) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.035,
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
      outputRange: [1, 0.98],
    })
  );

  const heroIconBoxSize = isTabletLandscape ? 80 : isTablet ? 68 : 52;
  const heroIconSize = isTabletLandscape ? 42 : isTablet ? 36 : 28;

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
      style={{ width: isTablet ? '48.5%' : '100%' }}
    >
      <Animated.View
        style={[
          styles.heroCard,
          {
            borderRadius: isTablet ? 24 : 18,
            borderColor: isSelected
              ? colors.primary
              : isDark
              ? theme.iconColor + '35'
              : theme.iconColor + '25',
            borderWidth: isSelected ? 3 : 1.5,
            transform: [{ scale }],
            shadowColor: isSelected ? colors.primary : '#000',
            shadowOpacity: isSelected ? 0.35 : 0.08,
            shadowRadius: isSelected ? 10 : 6,
            elevation: isSelected ? 6 : 3,
          },
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? [colors.gray100, hexToRgba(theme.iconColor, 0.12)]
              : ['#FFFFFF', hexToRgba(theme.iconColor, 0.08)]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroGradient, { flexDirection: isRTL ? 'row-reverse' : 'row', padding: isTabletLandscape ? 24 : isTablet ? 20 : 16 }]}
        >
          <View
            style={[
              styles.heroIconBox,
              {
                width: heroIconBoxSize,
                height: heroIconBoxSize,
                borderRadius: isTabletLandscape ? 22 : isTablet ? 18 : 16,
                backgroundColor: isDark ? hexToRgba(theme.iconColor, 0.22) : theme.circleBg,
                borderColor: theme.iconColor + '30',
              },
            ]}
          >
            <Ionicons name={theme.iconName} size={heroIconSize} color={theme.iconColor} />
          </View>

          <View style={[styles.heroTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.heroBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text
                style={[
                  styles.heroTitle,
                  {
                    color: colors.black,
                    textAlign,
                    fontSize: isTabletLandscape ? 23 : isTablet ? 20 : 16,
                  },
                  isSelected && { color: colors.primary },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {title}
              </Text>
              <View style={[styles.quickBadge, { backgroundColor: theme.iconColor + '18', paddingHorizontal: isTablet ? 10 : 8, paddingVertical: isTablet ? 3 : 2 }]}>
                <Text style={[styles.quickBadgeText, { color: theme.iconColor, fontSize: isTabletLandscape ? 14 : isTablet ? 13 : 11 }]}>
                  {isKurdish ? 'سەرەکی' : 'Main'}
                </Text>
              </View>
            </View>
            <Text style={[styles.heroSub, { color: colors.gray400, textAlign, fontSize: isTabletLandscape ? 15.5 : isTablet ? 14 : 12 }]}>
              {sub}
            </Text>
          </View>

          {isSelected ? (
            <View style={[styles.swapBadgePill, { backgroundColor: colors.primary, width: isTabletLandscape ? 34 : isTablet ? 28 : 24, height: isTabletLandscape ? 34 : isTablet ? 28 : 24, borderRadius: isTabletLandscape ? 17 : isTablet ? 14 : 12 }]}>
              <Ionicons name="swap-horizontal" size={isTablet ? 18 : 14} color="#FFFFFF" />
            </View>
          ) : isCustomizing ? (
            <View style={[styles.swapTargetCircle, { borderColor: theme.iconColor + '80', width: isTabletLandscape ? 34 : isTablet ? 28 : 24, height: isTabletLandscape ? 34 : isTablet ? 28 : 24, borderRadius: isTabletLandscape ? 17 : isTablet ? 14 : 12 }]}>
              <Ionicons name="swap-vertical-outline" size={isTablet ? 17 : 13} color={theme.iconColor} />
            </View>
          ) : (
            <Ionicons name={chevronForward as never} size={isTabletLandscape ? 24 : isTablet ? 20 : 18} color={theme.iconColor} />
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

function BentoRegularTile({
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

  const theme = MODULE_THEMES[item.id] || {
    iconName: 'grid-outline' as const,
    tagKu: 'مۆدیول',
    subtitleKu: 'ڕێکخستن',
    iconColor: colors.primary,
    circleBg: colors.softBlue,
  };

  const title = isKurdish ? theme.tagKu : t(item.labelKey);
  const sub = isKurdish ? theme.subtitleKu : t(item.descriptionKey);

  const pressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredHoldRef = useRef(false);

  useEffect(() => {
    if (isSelected) {
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
      outputRange: [1, 0.97],
    })
  );

  const tileWidth = isTabletLandscape ? '23.8%' : isTablet ? '31.5%' : '48.5%';
  const tileIconBoxSize = isTabletLandscape ? 62 : isTablet ? 54 : 38;
  const tileIconSize = isTabletLandscape ? 34 : isTablet ? 28 : 20;

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
      style={{ width: tileWidth }}
    >
      <Animated.View
        style={[
          styles.gridTile,
          {
            backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
            borderRadius: isTablet ? 22 : 16,
            borderColor: isSelected
              ? colors.primary
              : isDark
              ? colors.gray200
              : '#E2E8F0',
            borderWidth: isSelected ? 3 : 1,
            transform: [{ scale }],
            shadowColor: isSelected ? colors.primary : '#000',
            shadowOpacity: isSelected ? 0.35 : 0.05,
            shadowRadius: isSelected ? 10 : 4,
            elevation: isSelected ? 6 : 2,
            padding: isTabletLandscape ? 22 : isTablet ? 18 : 14,
          },
        ]}
      >
        <View style={[styles.tileHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.tileIconBox,
              {
                width: tileIconBoxSize,
                height: tileIconBoxSize,
                borderRadius: isTabletLandscape ? 18 : isTablet ? 16 : 12,
                backgroundColor: isDark ? theme.iconColor + '20' : theme.circleBg,
              },
            ]}
          >
            <Ionicons name={theme.iconName} size={tileIconSize} color={theme.iconColor} />
          </View>

          {isSelected ? (
            <View style={[styles.swapBadgePill, { backgroundColor: colors.primary, width: isTabletLandscape ? 30 : isTablet ? 26 : 20, height: isTabletLandscape ? 30 : isTablet ? 26 : 20, borderRadius: isTabletLandscape ? 15 : isTablet ? 13 : 10 }]}>
              <Ionicons name="swap-horizontal" size={isTablet ? 16 : 11} color="#FFFFFF" />
            </View>
          ) : isCustomizing ? (
            <View style={[styles.swapTargetCircle, { borderColor: theme.iconColor + '80', width: isTabletLandscape ? 30 : isTablet ? 26 : 20, height: isTabletLandscape ? 30 : isTablet ? 26 : 20, borderRadius: isTabletLandscape ? 15 : isTablet ? 13 : 10 }]}>
              <Ionicons name="swap-vertical-outline" size={isTablet ? 16 : 11} color={theme.iconColor} />
            </View>
          ) : (
            <View style={[styles.miniDot, { backgroundColor: theme.iconColor, width: isTabletLandscape ? 10 : isTablet ? 8 : 7, height: isTabletLandscape ? 10 : isTablet ? 8 : 7 }]} />
          )}
        </View>

        <Text
          style={[
            styles.tileTitle,
            {
              color: colors.black,
              textAlign,
              fontSize: isTabletLandscape ? 19.5 : isTablet ? 17.5 : 14,
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
            styles.tileSub,
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
      </Animated.View>
    </Pressable>
  );
}

export function BentoModuleGrid({
  modules,
  isCustomizing = false,
  selectedIdForSwap = null,
  onStartCustomize,
  onSelectForSwap,
}: Props) {
  const { isTablet, isTabletLandscape } = useResponsive();

  // Bento hierarchy: First 2 modules are hero cards, rest are regular
  const heroModules = modules.slice(0, 2);
  const regularModules = modules.slice(2);

  return (
    <View style={[styles.container, isTablet && { gap: isTabletLandscape ? 18 : 16 }]}>
      {/* 1. Hero Bento Cards */}
      <View style={[styles.heroRow, isTablet && { gap: isTabletLandscape ? 18 : 16 }]}>
        {heroModules.map((item) => (
          <BentoHeroCard
            key={item.id}
            item={item}
            isCustomizing={isCustomizing}
            isSelected={selectedIdForSwap === item.id}
            onStartCustomize={onStartCustomize}
            onSelectForSwap={onSelectForSwap}
          />
        ))}
      </View>

      {/* 2. Secondary Bento Grid */}
      <View
        style={[
          styles.gridRow,
          {
            rowGap: isTabletLandscape ? 18 : isTablet ? 16 : 10,
          },
        ]}
      >
        {regularModules.map((item) => (
          <BentoRegularTile
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
  container: {
    width: '100%',
    gap: 12,
  },
  heroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  heroCard: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
  },
  heroGradient: {
    alignItems: 'center',
    gap: 14,
  },
  heroIconBox: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: {
    flex: 1,
  },
  heroBadgeRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  heroTitle: {
    fontWeight: '800',
  },
  quickBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  quickBadgeText: {
    fontWeight: '700',
  },
  heroSub: {},
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  gridTile: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
  },
  tileHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tileIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniDot: {
    borderRadius: 4,
  },
  tileTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  tileSub: {},
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
