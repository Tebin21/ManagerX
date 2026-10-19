import React from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/AppText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { useRTL } from '@/lib/rtl';
import { QUESTIONS_AMICO_SVG } from '@/constants/onboardingIllustrations';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT_REGULAR } from '@/lib/settingsFont';
import { DEV_FORCE_ONBOARDING_PREVIEW } from '@/constants/devPreview';
import { OnboardingTypewriterBadge } from '@/components/onboarding/OnboardingTypewriterBadge';
import { FloatingQuestionIllustration } from '@/components/onboarding/FloatingQuestionIllustration';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isTablet, isTabletLandscape } = useResponsive();
  const { isRTL } = useRTL();

  // Mobile vs Tablet layout breakpoint
  const isLargeScreen = isTablet || width >= 720;

  const handleNext = () => {
    router.push('/(onboarding)/features');
  };

  const handleBypassToDashboard = () => {
    router.replace('/(app)/dashboard');
  };

  // Dimensions for the illustration
  const phoneSvgWidth = Math.min(320, width * 0.82);
  const phoneSvgHeight = Math.min(270, height * 0.34);

  const tabletSvgWidth = isTabletLandscape ? 440 : 370;
  const tabletSvgHeight = isTabletLandscape ? 440 : 370;

  // Render Image 3 Layout for iPads & Large Screens
  if (isLargeScreen) {
    return (
      <View style={[styles.screen, { backgroundColor: isDark ? '#0B1120' : '#F8FAFC' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.tabletCenterWrapper}>
          {DEV_FORCE_ONBOARDING_PREVIEW && (
            <TouchableOpacity
              onPress={handleBypassToDashboard}
              style={[styles.devBypassBadge, { top: insets.top + 16, right: 24 }]}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={13} color="#F59E0B" />
              <Text style={styles.devBypassText}>چوونە داشبۆرد (تێست)</Text>
            </TouchableOpacity>
          )}

          <MotiView
            from={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 18, stiffness: 100 }}
            style={[
              styles.tabletMasterCard,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#E2E8F0',
                maxWidth: isTabletLandscape ? 1220 : 960,
                padding: isTabletLandscape ? 32 : 24,
                // In RTL, row puts Child 0 on the RIGHT and Child 1 on the LEFT
                // In LTR, row-reverse puts Child 0 on the RIGHT and Child 1 on the LEFT
                flexDirection: isRTL ? 'row' : 'row-reverse',
              },
            ]}
          >
            {/* Child 0: Illustration Box (ALWAYS on the LEFT side for Kurdish RTL) */}
            <View
              style={[
                styles.tabletIllustrationBox,
                {
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderColor: isDark ? '#1E293B' : '#F1F5F9',
                  minHeight: isTabletLandscape ? 520 : 450,
                  padding: isTabletLandscape ? 28 : 20,
                  borderRadius: 28,
                },
              ]}
            >
              <FloatingQuestionIllustration width={tabletSvgWidth} height={tabletSvgHeight} />
            </View>

            {/* Child 1: Content & Action Column (ALWAYS on the RIGHT side for Kurdish RTL) */}
            <View
              style={[
                styles.tabletContentBox,
                {
                  paddingHorizontal: isTabletLandscape ? 44 : 32,
                  paddingVertical: isTabletLandscape ? 28 : 20,
                },
              ]}
            >
              <View>
                {/* Title */}
                <Text
                  style={[
                    styles.tabletTitle,
                    {
                      fontSize: isTabletLandscape ? 44 : 36,
                      lineHeight: isTabletLandscape ? 56 : 46,
                      color: isDark ? '#F8FAFC' : '#0F172A',
                      textAlign: 'right',
                      marginBottom: 18,
                    },
                  ]}
                >
                  فرۆشیار چییە؟
                </Text>

                {/* Kurdish Description */}
                <Text
                  style={[
                    styles.tabletDescription,
                    {
                      fontSize: isTabletLandscape ? 20 : 18,
                      lineHeight: isTabletLandscape ? 36 : 32,
                      color: isDark ? '#94A3B8' : '#64748B',
                      textAlign: 'right',
                      marginBottom: 24,
                    },
                  ]}
                >
                  فرۆشیار سیستەمێکی پێشکەوتوو و سەردەمییانەی خاڵی فرۆشتن و بەڕێوەبردنی گشتگیری بازرگانییە؛ بە شێوازێکی ژیرانە سەرجەم کارەکانی فرۆشتنی ڕۆژانە، کۆگا و بارکۆد، پسوولە و کڕین، قەرز و دانەوە، خەرجییەکان، و ژمێریاریی ورد لە یەک پلاتفۆرمی خێرادا کۆدەکاتەوە تا هەمیشە کارەکەت لە ژێر چاودێری خۆتدا بێت بە پارێزراوی تەواو.
                </Text>

                {/* Animated Typewriter Pill Badge with 3 rotating phrases */}
                <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', marginVertical: 18 }}>
                  <OnboardingTypewriterBadge size="large" />
                </View>
              </View>

              {/* Bottom Elements: Dots + Green Button */}
              <View style={styles.tabletBottomArea}>
                {/* Pagination Dots (5 screens: Dot 1 active) */}
                <View style={styles.tabletDotsRow}>
                  <View style={styles.tabletActiveDot} />
                  <View
                    style={[
                      styles.tabletInactiveDot,
                      { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                    ]}
                  />
                  <View
                    style={[
                      styles.tabletInactiveDot,
                      { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                    ]}
                  />
                  <View
                    style={[
                      styles.tabletInactiveDot,
                      { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                    ]}
                  />
                  <View
                    style={[
                      styles.tabletInactiveDot,
                      { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                    ]}
                  />
                </View>

                {/* Gold Button */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={handleNext}
                  style={[
                    styles.tabletGoldButton,
                    { height: isTabletLandscape ? 64 : 58 },
                  ]}
                >
                  <Text style={[styles.tabletGoldButtonText, { fontSize: isTabletLandscape ? 21 : 18 }]}>دواتر</Text>
                  <Feather
                    name={isRTL ? "arrow-left" : "arrow-right"}
                    size={isTabletLandscape ? 24 : 20}
                    color="#0F172A"
                    style={{ marginHorizontal: 8 }}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </MotiView>
        </SafeAreaView>
      </View>
    );
  }

  // Render Image 2 Layout for Mobile Phones
  return (
    <View style={[styles.screen, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.mobileSafeContainer}>
        {DEV_FORCE_ONBOARDING_PREVIEW && (
          <TouchableOpacity
            onPress={handleBypassToDashboard}
            style={[styles.devBypassBadge, { top: insets.top + 8, right: 16 }]}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={12} color="#F59E0B" />
            <Text style={styles.devBypassText}>داشبۆرد</Text>
          </TouchableOpacity>
        )}
        <ScrollView
          contentContainerStyle={[
            styles.mobileScrollContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Illustration (Questions-amico.svg) */}
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 16, stiffness: 110, delay: 100 }}
            style={styles.mobileIllustrationBox}
          >
            <FloatingQuestionIllustration width={phoneSvgWidth} height={phoneSvgHeight} />
          </MotiView>

          {/* Center Info Block */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 120, delay: 250 }}
            style={styles.mobileInfoBox}
          >
            {/* Title */}
            <Text
              style={[
                styles.mobileTitle,
                { color: isDark ? '#F8FAFC' : '#0F172A' },
              ]}
            >
              فرۆشیار چییە؟
            </Text>

            {/* Description */}
            <Text
              style={[
                styles.mobileDescription,
                { color: isDark ? '#94A3B8' : '#64748B' },
              ]}
            >
              فرۆشیار سیستەمێکی پێشکەوتوو و سەردەمییانەی خاڵی فرۆشتن و بەڕێوەبردنی گشتگیری بازرگانییە. سەرجەم کارەکانی فرۆشتنی خێرا، کۆگا و بارکۆد، پسوولە، قەرز، خەرجی و ژمێریاری لە یەک پلاتفۆرمی ژیرانەدا بە زمانی شیرینی کوردی بۆ ئاسان دەکات تا کارەکانت خێراتر و ڕێکخراوتر بن.
            </Text>

            {/* Animated Typewriter Pill Badge with 3 rotating phrases */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <OnboardingTypewriterBadge />
            </View>
          </MotiView>

          {/* Bottom Area: Pagination Dots + Green Button */}
          <View style={styles.mobileBottomArea}>
            {/* Dots (5 screens: Dot 1 active) */}
            <View style={styles.dotsRow}>
              <View style={styles.activeDot} />
              <View
                style={[
                  styles.inactiveDot,
                  { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                ]}
              />
              <View
                style={[
                  styles.inactiveDot,
                  { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                ]}
              />
              <View
                style={[
                  styles.inactiveDot,
                  { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                ]}
              />
              <View
                style={[
                  styles.inactiveDot,
                  { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                ]}
              />
            </View>

            {/* Gold Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleNext}
              style={styles.goldButton}
            >
              <Text style={styles.goldButtonText}>دواتر</Text>
              <Feather name={isRTL ? "arrow-left" : "arrow-right"} size={20} color="#0F172A" style={{ marginHorizontal: 6 }} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // --- Tablet / Large Screen (Image 3) Styles ---
  tabletCenterWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tabletMasterCard: {
    width: '100%',
    borderRadius: 32,
    borderWidth: 1.5,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 8,
  },
  tabletIllustrationBox: {
    flex: 1.05,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    minHeight: 460,
  },
  tabletContentBox: {
    flex: 1.25,
    paddingHorizontal: 36,
    paddingVertical: 24,
    justifyContent: 'space-between',
  },
  tabletTitle: {
    fontSize: 32,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  tabletDescription: {
    fontSize: 16,
    lineHeight: 28,
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    marginBottom: 24,
  },
  tabletBottomArea: {
    marginTop: 24,
    gap: 16,
  },

  // --- Mobile Phone (Image 2) Styles ---
  mobileSafeContainer: {
    flex: 1,
  },
  mobileScrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  mobileIllustrationBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  mobileInfoBox: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  mobileTitle: {
    fontSize: 27,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    textAlign: 'center',
    marginBottom: 12,
  },
  mobileDescription: {
    fontSize: 15,
    lineHeight: 25,
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    textAlign: 'center',
    maxWidth: 380,
    marginBottom: 20,
  },
  mobileBottomArea: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
    marginTop: 12,
  },

  // --- Shared Dots & Button ---
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  activeDot: {
    width: 26,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F8C61E',
  },
  inactiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  goldButton: {
    width: '100%',
    maxWidth: 420,
    height: 54,
    backgroundColor: '#F8C61E',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F8C61E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
  goldButtonText: {
    color: '#0F172A',
    fontSize: 17,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  tabletDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabletActiveDot: {
    width: 38,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F8C61E',
  },
  tabletInactiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tabletGoldButton: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#F8C61E',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#F8C61E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 6,
  },
  tabletGoldButtonText: {
    color: '#0F172A',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  devBypassBadge: {
    position: 'absolute',
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  devBypassText: {
    fontSize: 12,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    color: '#D97706',
  },
});
