import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import { useRTL } from '@/lib/rtl';
import i18n from '@/lib/i18n';
import { ModuleDefinition } from '@/constants/config';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import type { ModuleLayout } from '@/store/moduleStore';

interface Props {
  module: ModuleDefinition;
  enabled: boolean;
  label: string;
  layout?: ModuleLayout;
  isCustomizing?: boolean;
  isSelectedForSwap?: boolean;
  onPress?: () => void;
  onStartCustomize?: () => void;
  onToggleLayout?: () => void;
  onSelectForSwap?: () => void;
}

export interface ModuleVisualTheme {
  iconName: keyof typeof Ionicons.glyphMap;
  tagKu: string;
  tagEn: string;
  subtitleKu: string;
  subtitleEn: string;
  iconColor: string;
  circleBg: string;
  circleBorder: string;
  glowColor: string;
}

export const MODULE_THEMES: Record<string, ModuleVisualTheme> = {
  sales: {
    iconName: 'receipt-outline',
    tagKu: 'فرۆشتن',
    tagEn: 'Sales',
    subtitleKu: 'تۆمارکردنی فرۆشتنی نوێ',
    subtitleEn: 'Create sale invoice',
    iconColor: '#059669',
    circleBg: '#ECFDF5',
    circleBorder: '#A7F3D0',
    glowColor: 'rgba(16, 185, 129, 0.28)',
  },
  purchases: {
    iconName: 'cart-outline',
    tagKu: 'کڕین',
    tagEn: 'Purchases',
    subtitleKu: 'تۆمارکردنی پسوولەی کڕین',
    subtitleEn: 'Record purchases',
    iconColor: '#EA580C',
    circleBg: '#FFF7ED',
    circleBorder: '#FED7AA',
    glowColor: 'rgba(234, 88, 12, 0.28)',
  },
  inventory: {
    iconName: 'cube-outline',
    tagKu: 'کۆگا',
    tagEn: 'Stock',
    subtitleKu: 'بەڕێوەبردنی کاڵا و کۆگا',
    subtitleEn: 'Stock & catalog',
    iconColor: '#0284C7',
    circleBg: '#F0F9FF',
    circleBorder: '#BAE6FD',
    glowColor: 'rgba(2, 132, 199, 0.28)',
  },
  reports: {
    iconName: 'bar-chart-outline',
    tagKu: 'شیکاری',
    tagEn: 'Analytics',
    subtitleKu: 'بینینی ڕاپۆرت و شیکاری',
    subtitleEn: 'Analytics & profit',
    iconColor: '#6366F1',
    circleBg: '#EEF2FF',
    circleBorder: '#C7D2FE',
    glowColor: 'rgba(99, 102, 241, 0.28)',
  },
  debt: {
    iconName: 'wallet-outline',
    tagKu: 'دارایی',
    tagEn: 'Finance',
    subtitleKu: 'قەرزی کڕیار و دابینکەر',
    subtitleEn: 'Clients & suppliers debt',
    iconColor: '#D97706',
    circleBg: '#FEF3C7',
    circleBorder: '#FDE68A',
    glowColor: 'rgba(217, 119, 6, 0.28)',
  },
  history: {
    iconName: 'time-outline',
    tagKu: 'مێژوو',
    tagEn: 'History',
    subtitleKu: 'مێژووی فرۆشتن و کڕین',
    subtitleEn: 'Timeline of sales',
    iconColor: '#0D9488',
    circleBg: '#F0FDFA',
    circleBorder: '#99F6E4',
    glowColor: 'rgba(13, 148, 136, 0.28)',
  },
  expenses: {
    iconName: 'cash-outline',
    tagKu: 'خەرجی',
    tagEn: 'Expenses',
    subtitleKu: 'تۆمارکردن و بەڕێوەبردن',
    subtitleEn: 'Operating expenses',
    iconColor: '#E11D48',
    circleBg: '#FFF1F2',
    circleBorder: '#FECDD3',
    glowColor: 'rgba(225, 29, 72, 0.28)',
  },
  dashboard: {
    iconName: 'grid-outline',
    tagKu: 'داشبۆرد',
    tagEn: 'Overview',
    subtitleKu: 'ئاماری کار، چارت و شیکاری',
    subtitleEn: 'Business overview & charts',
    iconColor: '#7C3AED',
    circleBg: '#F5F3FF',
    circleBorder: '#DDD6FE',
    glowColor: 'rgba(124, 58, 237, 0.28)',
  },
};

const DEFAULT_THEME: ModuleVisualTheme = {
  iconName: 'grid-outline',
  tagKu: 'سیستەم',
  tagEn: 'Module',
  subtitleKu: 'بەڕێوەبردنی کار',
  subtitleEn: 'Manage module',
  iconColor: '#475569',
  circleBg: '#F1F5F9',
  circleBorder: '#E2E8F0',
  glowColor: 'rgba(71, 85, 105, 0.2)',
};

export function ModuleCard({
  module,
  enabled,
  label,
  layout = 'half',
  isCustomizing = false,
  isSelectedForSwap = false,
  onPress,
  onStartCustomize,
  onToggleLayout,
  onSelectForSwap,
}: Props) {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { isTablet, isLargeTablet } = useResponsive();
  const { isRTL } = useRTL();
  const lang = useLanguageStore((s) => s.language);
  const isKurdish = lang === 'ku' || (!lang && (i18n.language === 'ku' || !i18n.language));

  const isFull = layout === 'full';
  const theme = MODULE_THEMES[module.id] || DEFAULT_THEME;

  const [isLifted, setIsLifted] = useState(false);

  const pressAnim = useRef(new Animated.Value(0)).current;
  const liftAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Timers for hold detection and 2-second alternating shape cycle
  const liftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shapeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasTriggeredHoldRef = useRef(false);
  const hasToggledShapeRef = useRef(false);

  // Pulse animation when selected for swap
  useEffect(() => {
    if (isSelectedForSwap && !isLifted) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.98,
            duration: 450,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSelectedForSwap, isLifted, pulseAnim]);

  const clearTimers = () => {
    if (liftTimerRef.current) {
      clearTimeout(liftTimerRef.current);
      liftTimerRef.current = null;
    }
    if (shapeTimerRef.current) {
      clearTimeout(shapeTimerRef.current);
      shapeTimerRef.current = null;
    }
    if (shapeIntervalRef.current) {
      clearInterval(shapeIntervalRef.current);
      shapeIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const handlePressIn = () => {
    hasTriggeredHoldRef.current = false;
    hasToggledShapeRef.current = false;
    clearTimers();

    // 1. Initial downward press feedback
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 280,
      friction: 18,
    }).start();

    // 2. Lift Elevation Timer (~350ms):
    liftTimerRef.current = setTimeout(() => {
      hasTriggeredHoldRef.current = true;
      setIsLifted(true);

      Animated.spring(pressAnim, { toValue: 0, useNativeDriver: true }).start();
      Animated.spring(liftAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 320,
        friction: 18,
      }).start();

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } catch {}

      onStartCustomize?.();
    }, 350);

    // 3. 2-Second Alternating Shape Cycle:
    shapeTimerRef.current = setTimeout(() => {
      hasToggledShapeRef.current = true;
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}

      onToggleLayout?.();

      shapeIntervalRef.current = setInterval(() => {
        hasToggledShapeRef.current = true;
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } catch {}

        onToggleLayout?.();
      }, 2000);
    }, 2000);
  };

  const handlePressOut = () => {
    clearTimers();
    setIsLifted(false);

    Animated.spring(pressAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 280,
      friction: 18,
    }).start();

    Animated.spring(liftAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 280,
      friction: 18,
    }).start();

    if (hasToggledShapeRef.current) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } catch {}
    }
  };

  const handlePress = () => {
    if (hasTriggeredHoldRef.current) {
      hasTriggeredHoldRef.current = false;
      return;
    }

    if (isCustomizing) {
      onSelectForSwap?.();
      return;
    }

    if (!enabled) return;
    if (onPress) {
      onPress();
    } else {
      router.push(module.route as any);
    }
  };

  const normalPressTranslate = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3.5],
  });

  const liftTranslate = liftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const translateY = Animated.add(normalPressTranslate, liftTranslate);

  const pressScale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.985],
  });

  const liftScale = liftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  const totalScale = Animated.multiply(
    Animated.multiply(pulseAnim, liftScale),
    pressScale
  );

  const styles = useMemo(
    () => getStyles(isTablet, isLargeTablet, isFull, isDark),
    [isTablet, isLargeTablet, isFull, isDark]
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: enabled ? 1 : 0.5,
          transform: [{ scale: totalScale }, { translateY }],
          zIndex: isLifted || isSelectedForSwap ? 999 : 1,
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <View
          style={[
            styles.cardSurface,
            {
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              borderTopWidth: isLifted || isSelectedForSwap ? 2 : 1,
              borderLeftWidth: isLifted || isSelectedForSwap ? 2 : 1,
              borderRightWidth: isLifted || isSelectedForSwap ? 2 : 1,
              borderBottomWidth: isLifted || isSelectedForSwap ? 2 : 3.5,
              borderTopColor: isLifted
                ? colors.primary
                : isSelectedForSwap
                ? '#38BDF8'
                : isDark
                ? '#334155'
                : '#F1F5F9',
              borderLeftColor: isLifted
                ? colors.primary
                : isSelectedForSwap
                ? '#38BDF8'
                : isDark
                ? '#334155'
                : '#E2E8F0',
              borderRightColor: isLifted
                ? colors.primary
                : isSelectedForSwap
                ? '#38BDF8'
                : isDark
                ? '#334155'
                : '#E2E8F0',
              borderBottomColor: isLifted
                ? colors.primary
                : isSelectedForSwap
                ? '#38BDF8'
                : isDark
                ? '#0F172A'
                : '#CBD5E1',
            },
            isLifted && styles.cardLifted,
          ]}
        >
          {isFull ? (
            /* WIDE (DRÊZH) BANNER LAYOUT */
            <View style={[styles.wideRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* 1. Leading Colored Glow Circle */}
              <View
                style={[
                  styles.circleContainerWide,
                  {
                    backgroundColor: isDark ? theme.iconColor + '20' : theme.circleBg,
                    borderColor: isDark ? theme.iconColor + '40' : theme.circleBorder,
                    shadowColor: theme.glowColor,
                  },
                ]}
              >
                <Ionicons
                  name={theme.iconName}
                  size={isTablet ? 25 : 22}
                  color={theme.iconColor}
                />
              </View>

              {/* 2. Middle Title & Subtitle */}
              <View
                style={[
                  styles.wideTextGroup,
                  { alignItems: isRTL ? 'flex-end' : 'flex-start' },
                ]}
              >
                <Text
                  style={[
                    styles.titleWide,
                    { color: isDark ? '#F8FAFC' : '#0F172A', textAlign: isRTL ? 'right' : 'left' },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                <Text
                  style={[
                    styles.subtitleWide,
                    { color: '#94A3B8', textAlign: isRTL ? 'right' : 'left' },
                  ]}
                  numberOfLines={1}
                >
                  {isKurdish ? theme.subtitleKu : theme.subtitleEn}
                </Text>
              </View>

              {/* 3. Trailing Navigation Arrow */}
              <View style={[styles.wideTrailingGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name={isRTL ? 'chevron-back' : 'chevron-forward'}
                  size={16}
                  color={isDark ? '#64748B' : '#94A3B8'}
                  style={{ marginHorizontal: 2 }}
                />
              </View>
            </View>
          ) : (
            /* SQUARE (CHWARGÔSHE) CARD LAYOUT */
            <View style={styles.squareContent}>
              {/* Centered Glowing Pastel Circle Icon */}
              <View
                style={[
                  styles.circleContainerSquare,
                  {
                    backgroundColor: isDark ? theme.iconColor + '20' : theme.circleBg,
                    borderColor: isDark ? theme.iconColor + '40' : theme.circleBorder,
                    shadowColor: theme.glowColor,
                  },
                ]}
              >
                <Ionicons
                  name={theme.iconName}
                  size={isTablet ? 28 : 25}
                  color={theme.iconColor}
                />
              </View>

              {/* Main Title */}
              <Text
                style={[
                  styles.titleSquare,
                  { color: isDark ? '#F8FAFC' : '#0F172A' },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>

              {/* Subtitle / Description */}
              <Text
                style={[
                  styles.subtitleSquare,
                  { color: '#94A3B8' },
                ]}
                numberOfLines={1}
              >
                {isKurdish ? theme.subtitleKu : theme.subtitleEn}
              </Text>
            </View>
          )}

          {/* Disabled Lock Badge */}
          {!enabled && (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={isTablet ? 14 : 11} color="#64748B" />
            </View>
          )}

          {/* Customization Mini Toggle (Square <-> Wide) */}
          {isCustomizing && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onToggleLayout?.();
              }}
              style={[
                styles.customizeMiniToggle,
                {
                  backgroundColor: colors.primary,
                  left: isRTL ? 10 : undefined,
                  right: isRTL ? undefined : 10,
                },
              ]}
              hitSlop={8}
            >
              <Ionicons
                name={isFull ? 'grid-outline' : 'reorder-two-outline'}
                size={14}
                color="#FFFFFF"
              />
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function getStyles(isTablet: boolean, isLargeTablet: boolean, isFull: boolean, isDark: boolean) {
  const squareHeight = isLargeTablet ? 172 : isTablet ? 160 : 142;
  const wideHeight = isLargeTablet ? 94 : isTablet ? 88 : 78;

  return StyleSheet.create({
    container: {
      width: isFull ? '100%' : isTablet ? '31.8%' : '48.5%',
      marginVertical: isTablet ? 6 : 5,
    },
    pressable: {
      width: '100%',
    },
    cardSurface: {
      width: '100%',
      minHeight: isFull ? wideHeight : squareHeight,
      borderRadius: isTablet ? 24 : 22,
      paddingHorizontal: isFull ? (isTablet ? 18 : 14) : 10,
      paddingVertical: isFull ? 12 : 12,
      justifyContent: 'center',
      // Tactile 3D Grey Shadow (crisp depth in both light & dark mode)
      shadowColor: isDark ? '#000000' : '#475569',
      shadowOffset: { width: 0, height: 4.5 },
      shadowOpacity: isDark ? 0.45 : 0.16,
      shadowRadius: isDark ? 6.5 : 5.5,
      elevation: 5,
      position: 'relative',
    },
    cardLifted: {
      shadowColor: isDark ? '#000000' : '#334155',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: isDark ? 0.65 : 0.28,
      shadowRadius: 18,
      elevation: 16,
    },

    /* SQUARE LAYOUT STYLES */
    squareContent: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    circleContainerSquare: {
      width: isTablet ? 58 : 52,
      height: isTablet ? 58 : 52,
      borderRadius: isTablet ? 29 : 26,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      marginTop: 2,
      marginBottom: 9,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.38,
      shadowRadius: 9,
      elevation: 4,
    },
    titleSquare: {
      fontSize: isTablet ? 16.5 : 14.5,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: -0.2,
      marginBottom: 3,
    },
    subtitleSquare: {
      fontSize: isTablet ? 11 : 9.5,
      fontWeight: '500',
      textAlign: 'center',
      paddingHorizontal: 4,
    },

    /* WIDE LAYOUT STYLES */
    wideRow: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    circleContainerWide: {
      width: isTablet ? 50 : 46,
      height: isTablet ? 50 : 46,
      borderRadius: isTablet ? 25 : 23,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.32,
      shadowRadius: 7,
      elevation: 3,
    },
    wideTextGroup: {
      flex: 1,
      marginHorizontal: 12,
      justifyContent: 'center',
    },
    titleWide: {
      fontSize: isTablet ? 17 : 15,
      fontWeight: '700',
      letterSpacing: -0.2,
      marginBottom: 2,
    },
    subtitleWide: {
      fontSize: isTablet ? 11.5 : 10,
      fontWeight: '500',
    },
    wideTrailingGroup: {
      alignItems: 'center',
    },
    /* LOCK & TOGGLE */
    lockBadge: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(148, 163, 184, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    customizeMiniToggle: {
      position: 'absolute',
      bottom: 8,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
      zIndex: 10,
    },
  });
}
