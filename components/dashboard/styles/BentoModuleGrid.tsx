import React, { useRef, useEffect, useCallback } from 'react';
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
import { getResponsiveCardSpanWidth } from './dashboardLayoutHelper';

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
  tileWidth?: `${number}%`;
  isSingleLastItem?: boolean;
  heroCount?: number;
}

function BentoHeroCard({
  item,
  isCustomizing = false,
  isSelected = false,
  onStartCustomize,
  onSelectForSwap,
  heroCount = 2,
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
      onSelectForSwap?.(item.id);
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    router.push(item.route as never);
  }, [isCustomizing, onSelectForSwap, item.id, item.route, router]);

  const handleLongPress = useCallback(() => {
    if (!isCustomizing) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } catch {}
      onStartCustomize?.(item.id);
    }
  }, [isCustomizing, onStartCustomize, item.id]);

  const scale = isSelected
    ? pulseAnim
    : pressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.98],
      });

  const heroIconBoxSize = isTabletLandscape ? 80 : isTablet ? 68 : 52;
  const heroIconSize = isTabletLandscape ? 42 : isTablet ? 36 : 28;

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={450}
      style={{ width: (!isTablet || heroCount === 1) ? '100%' : '48.5%' }}
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
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.8}
              >
                {title}
              </Text>
              <View style={[styles.quickBadge, { backgroundColor: theme.iconColor + '18', paddingHorizontal: isTablet ? 10 : 8, paddingVertical: isTablet ? 3 : 2 }]}>
                <Text style={[styles.quickBadgeText, { color: theme.iconColor, fontSize: isTabletLandscape ? 14 : isTablet ? 13 : 11 }]}>
                  {isKurdish ? 'سەرەکی' : 'Main'}
                </Text>
              </View>
            </View>
            <Text
              style={[styles.heroSub, { color: colors.gray400, textAlign, fontSize: isTabletLandscape ? 15.5 : isTablet ? 14 : 12 }]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
            >
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
  tileWidth: tileWidthProp,
  isSingleLastItem = false,
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
      onSelectForSwap?.(item.id);
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    router.push(item.route as never);
  }, [isCustomizing, onSelectForSwap, item.id, item.route, router]);

  const handleLongPress = useCallback(() => {
    if (!isCustomizing) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } catch {}
      onStartCustomize?.(item.id);
    }
  }, [isCustomizing, onStartCustomize, item.id]);

  const scale = isSelected
    ? pulseAnim
    : pressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.97],
      });

  const fallbackWidth = isSingleLastItem ? '100%' : isTabletLandscape ? '23.8%' : isTablet ? '31.8%' : '48.5%';
  const tileWidth = tileWidthProp ?? fallbackWidth;
  const tileIconBoxSize = isTabletLandscape ? 62 : isTablet ? 54 : 38;
  const tileIconSize = isTabletLandscape ? 34 : isTablet ? 28 : 20;

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={450}
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
          adjustsFontSizeToFit={true}
          minimumFontScale={0.8}
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
          adjustsFontSizeToFit={true}
          minimumFontScale={0.8}
        >
          {sub}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const MemoizedBentoHeroCard = React.memo(BentoHeroCard);
const MemoizedBentoRegularTile = React.memo(BentoRegularTile);

function BentoModuleGridImpl({
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
          <MemoizedBentoHeroCard
            key={item.id}
            item={item}
            isCustomizing={isCustomizing}
            isSelected={selectedIdForSwap === item.id}
            onStartCustomize={onStartCustomize}
            onSelectForSwap={onSelectForSwap}
            heroCount={heroModules.length}
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
        {regularModules.map((item, index) => {
          const tileWidth = getResponsiveCardSpanWidth(
            index,
            regularModules.length,
            isTablet,
            isTabletLandscape
          );
          const isSingleLastItem = tileWidth === '100%';
          return (
            <MemoizedBentoRegularTile
              key={item.id}
              item={item}
              isCustomizing={isCustomizing}
              isSelected={selectedIdForSwap === item.id}
              onStartCustomize={onStartCustomize}
              onSelectForSwap={onSelectForSwap}
              tileWidth={tileWidth}
              isSingleLastItem={isSingleLastItem}
            />
          );
        })}
      </View>
    </View>
  );
}

export const BentoModuleGrid = React.memo(BentoModuleGridImpl);

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
