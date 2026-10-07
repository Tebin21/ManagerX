import React, { useRef, useMemo } from 'react';
import { Pressable, View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import i18n from '@/lib/i18n';
import { darken } from '@/lib/colorUtils';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';

interface Props {
  onPress?: () => void;
}

export function ExpensesBannerButton({ onPress }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { isTablet, isLargeTablet } = useResponsive();
  const lang = useLanguageStore((s) => s.language);
  const isKurdish = lang === 'ku' || (!lang && (i18n.language === 'ku' || !i18n.language));

  const DEPTH = isTablet ? 7 : 5;
  const bannerHeight = isLargeTablet ? 84 : isTablet ? 76 : 64;
  const iconSize = isTablet ? 30 : 24;

  const pressAnim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/(app)/reports/expenses' as never);
    }
  };

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 280,
      friction: 18,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 280,
      friction: 18,
    }).start();
  };

  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, DEPTH - 1],
  });

  const gradColors: [string, string] = [colors.gradientStart, colors.gradientMid];
  const baseBg = darken(colors.gradientStart, 0.16);

  const styles = useMemo(
    () => getStyles(isTablet, DEPTH, bannerHeight),
    [isTablet, DEPTH, bannerHeight]
  );

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <View style={styles.cardWrapper}>
          {/* 3D Base Card Shadow */}
          <View
            style={[
              styles.baseCard,
              {
                backgroundColor: baseBg,
                shadowColor: baseBg,
              },
            ]}
          />

          {/* Top Surface that sinks down on press */}
          <Animated.View
            style={[
              styles.surfaceWrapper,
              {
                transform: [{ translateY }],
              },
            ]}
          >
            <LinearGradient
              colors={gradColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.surface}
            >
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
                      {t('dashboard.expensesCard')}
                    </Text>
                    <Ionicons
                      name="cash"
                      size={iconSize}
                      color="#FFFFFF"
                      style={styles.iconKurdish}
                    />
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="cash"
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
                      {t('dashboard.expensesCard')}
                    </Text>
                  </>
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Pressable>
    </View>
  );
}

function getStyles(isTablet: boolean, depth: number, bannerHeight: number) {
  return StyleSheet.create({
    container: {
      marginHorizontal: isTablet ? 17 : 15,
      marginTop: isTablet ? 6 : 4,
      marginBottom: isTablet ? 8 : 6,
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
      top: isTablet ? 18 : 14,
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
      minHeight: bannerHeight,
      borderRadius: isTablet ? 24 : 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: isTablet ? 20 : 14,
      paddingVertical: isTablet ? 16 : 14,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.16)',
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    label: {
      fontSize: isTablet ? 26 : 22,
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
  });
}
