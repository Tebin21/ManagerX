import React, { useRef, useMemo, useEffect } from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import i18n from '@/lib/i18n';
import { darken } from '@/lib/colorUtils';
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
  onLongPress?: () => void;
  onHold2Seconds?: () => void;
  onToggleLayout?: () => void;
  onSelectForSwap?: () => void;
  onMovePrev?: () => void;
  onMoveNext?: () => void;
  canMovePrev?: boolean;
  canMoveNext?: boolean;
}

function getModuleIcon(id: string): keyof typeof Ionicons.glyphMap {
  switch (id) {
    case 'purchases': return 'cart';
    case 'sales':     return 'receipt';
    case 'inventory': return 'cube';
    case 'reports':   return 'bar-chart';
    case 'history':   return 'time';
    case 'debt':      return 'wallet';
    case 'expenses':  return 'cash';
    default:          return 'grid';
  }
}

export function ModuleCard({
  module,
  enabled,
  label,
  layout = 'half',
  isCustomizing = false,
  isSelectedForSwap = false,
  onPress,
  onLongPress,
  onHold2Seconds,
  onToggleLayout,
  onSelectForSwap,
  onMovePrev,
  onMoveNext,
  canMovePrev = false,
  canMoveNext = false,
}: Props) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { isTablet, isLargeTablet, moduleCardHeight } = useResponsive();
  const lang = useLanguageStore((s) => s.language);
  const isKurdish = lang === 'ku' || (!lang && (i18n.language === 'ku' || !i18n.language));

  const isFull = layout === 'full';
  const DEPTH = isTablet ? 7 : 5;
  const bannerHeight = isLargeTablet ? 84 : isTablet ? 76 : 64;
  const currentHeight = isFull ? bannerHeight : moduleCardHeight;
  const iconSize = isFull ? (isTablet ? 30 : 24) : (isTablet ? 28 : 22);

  const pressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 2-second hold timer and recurring interval refs
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTriggeredHoldRef = useRef(false);

  // Pulse animation when selected for swap
  useEffect(() => {
    if (isSelectedForSwap) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.98,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSelectedForSwap, pulseAnim]);

  const clearTimers = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const safeHaptic = (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) => {
    try {
      Haptics.notificationAsync(type).catch(() => {});
    } catch {}
  };

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 280,
      friction: 18,
    }).start();

    hasTriggeredHoldRef.current = false;
    clearTimers();

    // Start 2-second hold detection
    holdTimerRef.current = setTimeout(() => {
      hasTriggeredHoldRef.current = true;
      safeHaptic(Haptics.NotificationFeedbackType.Success);
      onHold2Seconds?.();

      // If user continues holding, toggle every 2 seconds
      holdIntervalRef.current = setInterval(() => {
        safeHaptic(Haptics.NotificationFeedbackType.Success);
        onHold2Seconds?.();
      }, 2000);
    }, 2000);
  };

  const handlePressOut = () => {
    clearTimers();
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

  const handleLongPress = () => {
    if (hasTriggeredHoldRef.current) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
    onLongPress?.();
  };

  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, DEPTH - 1],
  });

  const gradColors: [string, string] = [colors.gradientStart, colors.gradientMid];
  const baseBg = darken(colors.gradientStart, 0.16);
  const iconName = getModuleIcon(module.id);

  const styles = useMemo(
    () => getStyles(isTablet, DEPTH, currentHeight, isFull),
    [isTablet, DEPTH, currentHeight, isFull]
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: enabled ? 1 : 0.5,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={550}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <View style={styles.cardWrapper}>
          {/* 3D Base Shadow */}
          <View
            style={[
              styles.baseCard,
              {
                backgroundColor: baseBg,
                shadowColor: baseBg,
              },
            ]}
          />

          {/* Top Surface */}
          <Animated.View
            style={[
              styles.surfaceWrapper,
              {
                transform: [{ translateY }],
                borderColor: isSelectedForSwap
                  ? '#38BDF8'
                  : isCustomizing
                  ? 'rgba(255, 255, 255, 0.45)'
                  : 'rgba(255, 255, 255, 0.16)',
                borderWidth: isSelectedForSwap ? 2.5 : isCustomizing ? 1.5 : 1,
              },
            ]}
          >
            <LinearGradient
              colors={gradColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.surface}
            >
              {/* Main Content */}
              <View style={styles.contentRow}>
                {isKurdish ? (
                  <>
                    <Text
                      style={[
                        styles.label,
                        { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.72}
                    >
                      {label}
                    </Text>
                    <Ionicons
                      name={iconName}
                      size={iconSize}
                      color="#FFFFFF"
                      style={styles.iconKurdish}
                    />
                  </>
                ) : (
                  <>
                    <Ionicons
                      name={iconName}
                      size={iconSize}
                      color="#FFFFFF"
                      style={styles.iconEnglish}
                    />
                    <Text
                      style={styles.label}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.72}
                    >
                      {label}
                    </Text>
                  </>
                )}
              </View>

              {/* Disabled Lock Badge */}
              {!enabled && (
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={isTablet ? 14 : 11} color="#FFFFFF" />
                </View>
              )}

              {/* Customize Mode Controls Overlay */}
              {isCustomizing && (
                <View style={styles.customizeBar}>
                  {/* Left / Prev Move button */}
                  {canMovePrev && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onMovePrev?.();
                      }}
                      hitSlop={8}
                      style={styles.miniCtrlBtn}
                    >
                      <Ionicons
                        name={isKurdish ? 'arrow-forward-outline' : 'arrow-back-outline'}
                        size={14}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  )}

                  {/* Size Toggle (Half <-> Full) button */}
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      onToggleLayout?.();
                    }}
                    hitSlop={8}
                    style={[styles.miniCtrlBtn, styles.sizeToggleBtn]}
                  >
                    <Ionicons
                      name={isFull ? 'contract-outline' : 'expand-outline'}
                      size={14}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>

                  {/* Right / Next Move button */}
                  {canMoveNext && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onMoveNext?.();
                      }}
                      hitSlop={8}
                      style={styles.miniCtrlBtn}
                    >
                      <Ionicons
                        name={isKurdish ? 'arrow-back-outline' : 'arrow-forward-outline'}
                        size={14}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Selection Tag when active for swap */}
              {isSelectedForSwap && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>
                    {isKurdish ? 'هەڵبژێردراو' : 'Selected'}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function getStyles(isTablet: boolean, depth: number, height: number, isFull: boolean) {
  return StyleSheet.create({
    container: {
      width: isFull ? '100%' : isTablet ? '31.8%' : '48.5%',
      marginVertical: isTablet ? 6 : 4,
    },
    pressable: {
      width: '100%',
    },
    cardWrapper: {
      position: 'relative',
      paddingBottom: depth,
    },
    baseCard: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      top: isTablet ? 16 : 12,
      borderRadius: isTablet ? 24 : 20,
      shadowOffset: { width: 0, height: isTablet ? 6 : 4 },
      shadowOpacity: 0.25,
      shadowRadius: isTablet ? 8 : 6,
      elevation: 5,
    },
    surfaceWrapper: {
      borderRadius: isTablet ? 24 : 20,
      overflow: 'hidden',
    },
    surface: {
      height,
      borderRadius: isTablet ? 24 : 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: isTablet ? 16 : 12,
      paddingVertical: isFull ? (isTablet ? 12 : 8) : isTablet ? 18 : 14,
      position: 'relative',
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    label: {
      fontSize: isFull ? (isTablet ? 22 : 18) : isTablet ? 26 : 22,
      fontWeight: '700',
      color: '#FFFFFF',
      textAlign: 'center',
    },
    iconKurdish: {
      marginLeft: isTablet ? 12 : 8,
    },
    iconEnglish: {
      marginRight: isTablet ? 12 : 8,
    },
    lockBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: isTablet ? 24 : 20,
      height: isTablet ? 24 : 20,
      borderRadius: isTablet ? 12 : 10,
      backgroundColor: 'rgba(0,0,0,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    customizeBar: {
      position: 'absolute',
      bottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    miniCtrlBtn: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sizeToggleBtn: {
      backgroundColor: 'rgba(212, 175, 55, 0.45)',
    },
    selectedBadge: {
      position: 'absolute',
      top: 6,
      backgroundColor: '#0284C7',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    selectedBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },
  });
}
