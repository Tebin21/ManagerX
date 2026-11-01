import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useResponsive } from '@/hooks/useResponsive';

const TOTAL_SPLASH_MS = 4000;      // 4.0 seconds total splash screen duration
const START_TYPING_MS = 600;       // Logo appears solo for 600ms; typing starts cleanly
const TYPING_DURATION_MS = 2000;   // All 3 lines type simultaneously across 2.0s
const FADE_OUT_DURATION_MS = 500;  // Soft, smooth 500ms fade transition to dashboard

const KURDISH_TEXT = 'لەگەڵ فرۆشیار، فرۆشتنەکەت ئاسانتر بکە';
const ENGLISH_TEXT = 'With Froshiar, make your selling easier';
const ARABIC_TEXT = 'مع فروشيار، اجعل مبيعاتك أسهل';

const LOGO_SOURCE = require('../../assets/images/logo.png');

// Global launch state: only marked true AFTER the splash has fully faded out
let hasCompletedAppSplash = false;
let splashGlobalStartTime = 0;

export function SplashScreenOverlay() {
  const { isTablet } = useResponsive();
  const [isMounted, setIsMounted] = useState(!hasCompletedAppSplash);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const [kurdish, setKurdish] = useState('');
  const [english, setEnglish] = useState('');
  const [arabic, setArabic] = useState('');

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (hasCompletedAppSplash) {
      setIsMounted(false);
      return;
    }

    if (!splashGlobalStartTime) {
      splashGlobalStartTime = Date.now();
    }

    // Seamlessly hide native splash screen as our overlay takes over
    if (Platform.OS !== 'web') {
      SplashScreen.hideAsync().catch(() => {});
    }

    let fadeTriggered = false;

    const interval = setInterval(() => {
      const elapsed = Date.now() - splashGlobalStartTime;

      if (elapsed < START_TYPING_MS) {
        setKurdish('');
        setEnglish('');
        setArabic('');
      } else if (elapsed < START_TYPING_MS + TYPING_DURATION_MS) {
        const progress = Math.min(1, (elapsed - START_TYPING_MS) / TYPING_DURATION_MS);
        const kCount = Math.min(
          KURDISH_TEXT.length,
          Math.max(1, Math.floor(progress * KURDISH_TEXT.length))
        );
        const eCount = Math.min(
          ENGLISH_TEXT.length,
          Math.max(1, Math.floor(progress * ENGLISH_TEXT.length))
        );
        const aCount = Math.min(
          ARABIC_TEXT.length,
          Math.max(1, Math.floor(progress * ARABIC_TEXT.length))
        );

        setKurdish(KURDISH_TEXT.slice(0, kCount));
        setEnglish(ENGLISH_TEXT.slice(0, eCount));
        setArabic(ARABIC_TEXT.slice(0, aCount));
      } else {
        setKurdish(KURDISH_TEXT);
        setEnglish(ENGLISH_TEXT);
        setArabic(ARABIC_TEXT);
      }

      // At 4.0s: trigger buttery-soft crossfade transition into dashboard
      if (elapsed >= TOTAL_SPLASH_MS && !fadeTriggered) {
        fadeTriggered = true;
        clearInterval(interval);
        setIsFadingOut(true);

        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: FADE_OUT_DURATION_MS,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }).start(() => {
          hasCompletedAppSplash = true;
          setIsMounted(false);
        });
      }
    }, 25);

    return () => {
      clearInterval(interval);
    };
  }, [fadeAnim]);

  if (!isMounted || hasCompletedAppSplash) return null;

  return (
    <Animated.View
      pointerEvents={isFadingOut ? 'none' : 'auto'}
      style={[
        StyleSheet.absoluteFillObject,
        styles.container,
        { opacity: fadeAnim },
      ]}
    >
      <StatusBar style="light" backgroundColor="#000000" />
      <View style={styles.centerContent}>
        {/* Large Froshiar 'F' Logo */}
        <Image
          source={LOGO_SOURCE}
          style={[
            styles.logo,
            {
              width: isTablet ? 280 : 205,
              height: isTablet ? 280 : 205,
            },
          ]}
          fadeDuration={0}
          resizeMode="contain"
        />

        {/* Centered 3-Language Typings with crisp Bahij Janna and Inter typography */}
        <View style={[styles.textBlock, { maxWidth: isTablet ? 640 : 400 }]}>
          {/* 1. Kurdish - Centered */}
          <View style={styles.lineSlot}>
            <Text
              style={[
                styles.kurdishText,
                isTablet && styles.kurdishTextTablet,
              ]}
              numberOfLines={1}
            >
              {kurdish}
            </Text>
          </View>

          {/* 2. English - Centered */}
          <View style={styles.lineSlot}>
            <Text
              style={[
                styles.englishText,
                isTablet && styles.englishTextTablet,
              ]}
              numberOfLines={1}
            >
              {english}
            </Text>
          </View>

          {/* 3. Arabic - Centered */}
          <View style={styles.lineSlot}>
            <Text
              style={[
                styles.arabicText,
                isTablet && styles.arabicTextTablet,
              ]}
              numberOfLines={1}
            >
              {arabic}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    zIndex: 999999,
    elevation: 999999,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 55,
    paddingHorizontal: 20,
  },
  logo: {
    marginBottom: 28,
  },
  textBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  lineSlot: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kurdishText: {
    color: '#FFFFFF',
    fontFamily: 'BahijJanna-Bold',
    fontSize: 19.5,
    lineHeight: 30,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  kurdishTextTablet: {
    fontSize: 26,
    lineHeight: 38,
  },
  englishText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 16.5,
    lineHeight: 26,
    textAlign: 'center',
    writingDirection: 'ltr',
    letterSpacing: 0.3,
  },
  englishTextTablet: {
    fontSize: 22,
    lineHeight: 32,
  },
  arabicText: {
    color: '#FFFFFF',
    fontFamily: 'BahijJanna-Bold',
    fontSize: 19.5,
    lineHeight: 30,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  arabicTextTablet: {
    fontSize: 26,
    lineHeight: 38,
  },
});
