import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import { useRTL } from '@/lib/rtl';
import i18n from '@/lib/i18n';
import { ModuleDefinition, ModuleId } from '@/constants/config';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import type { ModuleLayout } from '@/store/moduleStore';

interface Props {
  module: ModuleDefinition;
  enabled: boolean;
  disabled?: boolean;
  label: string;
  layout?: ModuleLayout;
  isCustomizing?: boolean;
  isSelectedForSwap?: boolean;
  onPress?: () => void;
  onStartCustomize?: (id: ModuleId) => void;
  onToggleLayout?: (id: ModuleId) => void;
  onSelectForSwap?: (id: ModuleId) => void;
  isLastRowPair?: boolean;
  isSingleLastItem?: boolean;
}

export interface ModuleVisualTheme {
  iconName: keyof typeof Ionicons.glyphMap;
  tagKu: string;
  tagEn: string;
  tagAr?: string;
  subtitleKu: string;
  subtitleEn: string;
  subtitleAr?: string;
  iconColor: string;
  circleBg: string;
  circleBorder: string;
  glowColor: string;
}

export const MODULE_THEMES: Record<string, ModuleVisualTheme> = {
  sales: {
    iconName: 'storefront-outline',
    tagKu: 'فرۆشتن',
    tagEn: 'Sales',
    tagAr: 'المبيعات',
    subtitleKu: 'تۆمارکردنی فرۆشتنی نوێ',
    subtitleEn: 'Create sale invoice',
    subtitleAr: 'تسجيل فاتورة بيع جديدة',
    iconColor: '#059669',
    circleBg: '#ECFDF5',
    circleBorder: '#A7F3D0',
    glowColor: 'rgba(16, 185, 129, 0.28)',
  },
  purchases: {
    iconName: 'cart-outline',
    tagKu: 'کڕین',
    tagEn: 'Purchases',
    tagAr: 'المشتريات',
    subtitleKu: 'تۆمارکردنی پسوولەی کڕین',
    subtitleEn: 'Record purchases',
    subtitleAr: 'تسجيل فواتير الشراء والتوريد',
    iconColor: '#EA580C',
    circleBg: '#FFF7ED',
    circleBorder: '#FED7AA',
    glowColor: 'rgba(234, 88, 12, 0.28)',
  },
  inventory: {
    iconName: 'cube-outline',
    tagKu: 'کۆگا',
    tagEn: 'Stock',
    tagAr: 'المخزن',
    subtitleKu: 'بەڕێوەبردنی کاڵا و کۆگا',
    subtitleEn: 'Stock & catalog',
    subtitleAr: 'إدارة المنتجات والمخزون',
    iconColor: '#0284C7',
    circleBg: '#F0F9FF',
    circleBorder: '#BAE6FD',
    glowColor: 'rgba(2, 132, 199, 0.28)',
  },
  reports: {
    iconName: 'bar-chart-outline',
    tagKu: 'شیکاری',
    tagEn: 'Analytics',
    tagAr: 'التقارير',
    subtitleKu: 'بینینی ڕاپۆرت و شیکاری',
    subtitleEn: 'Analytics & profit',
    subtitleAr: 'عرض التقارير والأرباح',
    iconColor: '#6366F1',
    circleBg: '#EEF2FF',
    circleBorder: '#C7D2FE',
    glowColor: 'rgba(99, 102, 241, 0.28)',
  },
  debt: {
    iconName: 'wallet-outline',
    tagKu: 'دارایی',
    tagEn: 'Finance',
    tagAr: 'الديون',
    subtitleKu: 'قەرزی کڕیار و دابینکەر',
    subtitleEn: 'Clients & suppliers debt',
    subtitleAr: 'ديون الزبائن والموردين',
    iconColor: '#D97706',
    circleBg: '#FEF3C7',
    circleBorder: '#FDE68A',
    glowColor: 'rgba(217, 119, 6, 0.28)',
  },
  history: {
    iconName: 'time-outline',
    tagKu: 'مێژوو',
    tagEn: 'History',
    tagAr: 'السجل',
    subtitleKu: 'مێژووی فرۆشتن و کڕین',
    subtitleEn: 'Timeline of sales',
    subtitleAr: 'سجل المبيعات والمشتريات',
    iconColor: '#0D9488',
    circleBg: '#F0FDFA',
    circleBorder: '#99F6E4',
    glowColor: 'rgba(13, 148, 136, 0.28)',
  },
  expenses: {
    iconName: 'cash-outline',
    tagKu: 'خەرجی',
    tagEn: 'Expenses',
    tagAr: 'المصاريف',
    subtitleKu: 'تۆمارکردن و بەڕێوەبردن',
    subtitleEn: 'Operating expenses',
    subtitleAr: 'تسجيل وإدارة مصاريف العمل',
    iconColor: '#E11D48',
    circleBg: '#FFF1F2',
    circleBorder: '#FECDD3',
    glowColor: 'rgba(225, 29, 72, 0.28)',
  },
  dashboard: {
    iconName: 'grid-outline',
    tagKu: 'داشبۆرد',
    tagEn: 'Overview',
    tagAr: 'لوحة التحكم',
    subtitleKu: 'ئاماری کار، چارت و شیکاری',
    subtitleEn: 'Business overview & charts',
    subtitleAr: 'نظرة عامة وإحصائيات العمل',
    iconColor: '#7C3AED',
    circleBg: '#F5F3FF',
    circleBorder: '#DDD6FE',
    glowColor: 'rgba(124, 58, 237, 0.28)',
  },
  expiry: {
    iconName: 'time-outline',
    tagKu: 'بەسەرچوون',
    tagEn: 'Expiry',
    tagAr: 'الصلاحية',
    subtitleKu: 'چاودێری بەرواری بەسەرچوون',
    subtitleEn: 'Track product expiry dates',
    subtitleAr: 'متابعة تواريخ انتهاء الصلاحية',
    iconColor: '#F59E0B',
    circleBg: '#FEF3C7',
    circleBorder: '#FDE68A',
    glowColor: 'rgba(245, 158, 11, 0.28)',
  },
  invoices: {
    iconName: 'receipt-outline',
    tagKu: 'پسوڵەکان',
    tagEn: 'Invoices',
    tagAr: 'الفواتير',
    subtitleKu: 'ئەرشیف، بینین و چاپکردنی پسوڵەکان',
    subtitleEn: 'Archive, view & print receipts',
    subtitleAr: 'أرشيف وطباعة الفواتير',
    iconColor: '#0284C7',
    circleBg: '#F0F9FF',
    circleBorder: '#BAE6FD',
    glowColor: 'rgba(2, 132, 199, 0.28)',
  },
  management: {
    iconName: 'shield-checkmark-outline',
    tagKu: 'بەڕێوەبردن',
    tagEn: 'Control',
    tagAr: 'الموظفين',
    subtitleKu: 'بەڕێوەبردنی کارمەند و دەسەڵاتەکان',
    subtitleEn: 'Employee & Access Control',
    subtitleAr: 'إدارة الموظفين والصلاحيات',
    iconColor: '#2563EB',
    circleBg: '#EFF6FF',
    circleBorder: '#BFDBFE',
    glowColor: 'rgba(37, 99, 235, 0.28)',
  },
};

const DEFAULT_THEME: ModuleVisualTheme = {
  iconName: 'grid-outline',
  tagKu: 'سیستەم',
  tagEn: 'Module',
  tagAr: 'النظام',
  subtitleKu: 'بەڕێوەبردنی کار',
  subtitleEn: 'Manage module',
  subtitleAr: 'إدارة القسم',
  iconColor: '#475569',
  circleBg: '#F1F5F9',
  circleBorder: '#E2E8F0',
  glowColor: 'rgba(71, 85, 105, 0.2)',
};

const stylesCache = new Map<string, any>();
function getCachedStyles(
  isTablet: boolean,
  isLargeTablet: boolean,
  isTabletLandscape: boolean,
  isFull: boolean,
  isDark: boolean,
  isLastRowPair: boolean,
  scale: number = 1.0
) {
  const key = `${isTablet}_${isLargeTablet}_${isTabletLandscape}_${isFull}_${isDark}_${isLastRowPair}_${scale}`;
  let cached = stylesCache.get(key);
  if (!cached) {
    cached = getStyles(isTablet, isLargeTablet, isTabletLandscape, isFull, isDark, isLastRowPair, scale);
    stylesCache.set(key, cached);
  }
  return cached;
}

function ModuleCardImpl({
  module,
  enabled,
  disabled = false,
  label,
  layout = 'half',
  isCustomizing = false,
  isSelectedForSwap = false,
  onPress,
  onStartCustomize,
  onToggleLayout,
  onSelectForSwap,
  isLastRowPair = false,
  isSingleLastItem = false,
}: Props) {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { isTablet, isLargeTablet, isTabletLandscape, uiScaleFactor } = useResponsive();
  const { isRTL } = useRTL();
  const lang = useLanguageStore((s) => s.language);
  const isKurdish = lang === 'ku' || (!lang && (i18n.language === 'ku' || !i18n.language));
  const isArabic = lang === 'ar' || (!lang && i18n.language === 'ar');

  const isFull = layout === 'full';
  const isEffectivelyFull = isFull || isSingleLastItem;
  const theme = MODULE_THEMES[module.id] || DEFAULT_THEME;
  const subtitle = isArabic
    ? (theme.subtitleAr || theme.subtitleEn)
    : isKurdish
    ? theme.subtitleKu
    : theme.subtitleEn;

  const pressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation when selected for swap
  useEffect(() => {
    if (isSelectedForSwap) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.035,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.985,
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
  }, [isSelectedForSwap, pulseAnim]);

  // Snappy native press animations (60ms down, 80ms up, zero JS re-render)
  const handlePressIn = useCallback(() => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 60,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  const handlePressOut = useCallback(() => {
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: 80,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  const handlePress = useCallback(() => {
    if (isCustomizing) {
      onSelectForSwap?.(module.id);
      return;
    }

    if (disabled) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
      } catch { }
      const { Alert } = require('react-native');
      Alert.alert(
        isArabic ? 'القسم معطل' : isKurdish ? 'ناچالاک کراوە' : 'Module Disabled',
        isArabic
          ? 'تم تعطيل هذا القسم من قبل الإدارة.'
          : isKurdish
          ? 'ئەم بەشە ناچالاک کراوە لەلایەن بەڕێوەبەرەوە.'
          : 'This module has been disabled by management.'
      );
      return;
    }

    if (!enabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    } catch { }

    if (onPress) {
      onPress();
    } else {
      router.push(module.route as any);
    }
  }, [isCustomizing, disabled, isKurdish, enabled, onPress, module.id, module.route, onSelectForSwap, router]);

  const handleLongPress = useCallback(() => {
    if (!isCustomizing) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
      } catch { }
      onStartCustomize?.(module.id);
    }
  }, [isCustomizing, onStartCustomize, module.id]);

  const scale = isSelectedForSwap
    ? pulseAnim
    : pressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.97],
    });

  const translateY = isSelectedForSwap
    ? -4
    : pressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 2.5],
    });

  const styles = useMemo(
    () =>
      getCachedStyles(
        isTablet,
        isLargeTablet,
        isTabletLandscape,
        isEffectivelyFull,
        isDark,
        isLastRowPair,
        uiScaleFactor
      ),
    [
      isTablet,
      isLargeTablet,
      isTabletLandscape,
      isEffectivelyFull,
      isDark,
      isLastRowPair,
      uiScaleFactor,
    ]
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: enabled ? (disabled ? 0.55 : 1) : 0.5,
          transform: [{ scale }, { translateY }],
          zIndex: isSelectedForSwap ? 999 : 1,
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={450}
        style={styles.pressable}
      >
        <View
          style={[
            styles.cardSurface,
            {
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              borderTopWidth: isSelectedForSwap ? 2 : 1,
              borderLeftWidth: isSelectedForSwap ? 2 : 1,
              borderRightWidth: isSelectedForSwap ? 2 : 1,
              borderBottomWidth: isSelectedForSwap ? 2 : 3.5,
              borderTopColor: isSelectedForSwap
                ? '#38BDF8'
                : isDark
                  ? '#334155'
                  : '#F1F5F9',
              borderLeftColor: isSelectedForSwap
                ? '#38BDF8'
                : isDark
                  ? '#334155'
                  : '#E2E8F0',
              borderRightColor: isSelectedForSwap
                ? '#38BDF8'
                : isDark
                  ? '#334155'
                  : '#E2E8F0',
              borderBottomColor: isSelectedForSwap
                ? '#38BDF8'
                : isDark
                  ? '#0F172A'
                  : '#CBD5E1',
            },
          ]}
        >
          {isEffectivelyFull ? (
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
                  size={Math.round((isTabletLandscape ? 36 : isTablet ? 30 : 22) * uiScaleFactor)}
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
                    (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.75}
                >
                  {label}
                </Text>
                <Text
                  style={[
                    styles.subtitleWide,
                    { color: '#94A3B8', textAlign: isRTL ? 'right' : 'left' },
                    (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.75}
                >
                  {subtitle}
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
            /* SQUARE LAYOUT */
            <View style={styles.squareContent}>
              {/* Leading Icon Circle */}
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
                  size={Math.round((isTabletLandscape ? 42 : isTablet ? (isLastRowPair ? 38 : 35) : 25) * uiScaleFactor)}
                  color={theme.iconColor}
                />
              </View>

              {/* Main Title */}
              <Text
                style={[
                  styles.titleSquare,
                  { color: isDark ? '#F8FAFC' : '#0F172A' },
                  (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
                numberOfLines={2}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
                maxFontSizeMultiplier={1.15}
              >
                {label}
              </Text>

              {/* Subtitle / Description */}
              <Text
                style={[
                  styles.subtitleSquare,
                  { color: '#94A3B8' },
                  (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.75}
              >
                {subtitle}
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
                onToggleLayout?.(module.id);
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

export const ModuleCard = React.memo(ModuleCardImpl);

function getStyles(
  isTablet: boolean,
  isLargeTablet: boolean,
  isTabletLandscape: boolean,
  isFull: boolean,
  isDark: boolean,
  isLastRowPair: boolean = false,
  scale: number = 1.0
) {
  const squareHeight = Math.round((isTabletLandscape ? 200 : isLargeTablet ? 188 : isTablet ? (isLastRowPair ? 176 : 172) : 142) * scale);
  const wideHeight = Math.round((isTabletLandscape ? 120 : isLargeTablet ? 110 : isTablet ? 98 : 78) * scale);

  return StyleSheet.create({
    container: {
      width: isFull
        ? '100%'
        : isTabletLandscape
          ? '23.8%'
          : isLastRowPair
            ? '48.5%'
            : isTablet
              ? '31.8%'
              : '48.5%',
      marginVertical: isTablet ? 6 : 5,
    },
    pressable: {
      width: '100%',
    },
    cardSurface: {
      width: '100%',
      minHeight: isFull ? wideHeight : squareHeight,
      borderRadius: Math.round((isTablet ? 24 : 22) * scale),
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
      width: Math.round((isTabletLandscape ? 82 : isTablet ? (isLastRowPair ? 76 : 70) : 52) * scale),
      height: Math.round((isTabletLandscape ? 82 : isTablet ? (isLastRowPair ? 76 : 70) : 52) * scale),
      borderRadius: Math.round((isTabletLandscape ? 41 : isTablet ? (isLastRowPair ? 38 : 35) : 26) * scale),
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
      fontSize: isTabletLandscape ? 21 : isTablet ? (isLastRowPair ? 20.5 : 19) : (Platform.OS === 'android' ? 12.8 : 13.5),
      lineHeight: isTabletLandscape ? 26 : isTablet ? (isLastRowPair ? 25 : 23) : 17,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 3,
      width: '100%',
      paddingHorizontal: 1,
    },
    subtitleSquare: {
      fontSize: isTabletLandscape ? 14.5 : isTablet ? (isLastRowPair ? 13.5 : 13) : 9.5,
      fontWeight: '500',
      textAlign: 'center',
      width: '100%',
      paddingHorizontal: 2,
    },

    /* WIDE LAYOUT STYLES */
    wideRow: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    circleContainerWide: {
      width: Math.round((isTabletLandscape ? 72 : isTablet ? 60 : 46) * scale),
      height: Math.round((isTabletLandscape ? 72 : isTablet ? 60 : 46) * scale),
      borderRadius: Math.round((isTabletLandscape ? 36 : isTablet ? 30 : 23) * scale),
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
      fontSize: isTabletLandscape ? 23 : isTablet ? 20 : 15,
      fontWeight: '700',
      marginBottom: 2,
    },
    subtitleWide: {
      fontSize: isTabletLandscape ? 15.5 : isTablet ? 14 : 10,
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
