import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { MotiView } from 'moti';
import { Text } from '@/components/ui/AppText';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT } from '@/lib/settingsFont';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { useRTL } from '@/lib/rtl';
import { MOBILE_TESTING_PANA_SVG } from '@/constants/onboardingIllustrations';
import { OnboardingTypewriterBadge, SCREEN_FIVE_BADGE_THEMES } from '@/components/onboarding/OnboardingTypewriterBadge';
import { DEV_FORCE_ONBOARDING_PREVIEW } from '@/constants/devPreview';

export default function ExperienceScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isTablet, isTabletLandscape } = useResponsive();
  const { isRTL } = useRTL();

  // Mobile vs Tablet layout breakpoint
  const isLargeScreen = isTablet || width >= 720;

  const handleNext = () => {
    router.replace('/(onboarding)/login');
  };

  const handleBack = () => {
    router.back();
  };

  const handleBypassToDashboard = () => {
    router.replace('/(app)/dashboard');
  };

  // Dimensions for the 750x500 (1.5:1 aspect ratio) Mobile Testing illustration
  const phoneSvgWidth = Math.min(330, width * 0.86);
  const phoneSvgHeight = Math.min(220, phoneSvgWidth * (500 / 750));

  const tabletSvgWidth = isTabletLandscape ? 470 : 390;
  const tabletSvgHeight = isTabletLandscape ? 314 : 260;

  // Render Layout for iPads & Large Screens
  if (isLargeScreen) {
    return (
      <View style={[styles.screen, { backgroundColor: isDark ? '#0B1120' : '#F8FAFC' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.tabletCenterWrapper}>
          {DEV_FORCE_ONBOARDING_PREVIEW && (
            <TouchableOpacity
              onPress={handleBypassToDashboard}
              style={[
                styles.devBypassBtn,
                { backgroundColor: isDark ? 'rgba(51, 65, 85, 0.7)' : 'rgba(226, 232, 240, 0.8)' },
              ]}
            >
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
              <SvgXml xml={MOBILE_TESTING_PANA_SVG} width={tabletSvgWidth} height={tabletSvgHeight} />
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
                {/* Back Link Row */}
                <TouchableOpacity
                  onPress={handleBack}
                  activeOpacity={0.7}
                  style={styles.backRow}
                >
                  <Feather
                    name={isRTL ? "chevron-right" : "chevron-left"}
                    size={22}
                    color={isDark ? '#94A3B8' : '#64748B'}
                  />
                  <Text style={[styles.backText, { color: isDark ? '#94A3B8' : '#64748B' }]}>گەڕانەوە</Text>
                </TouchableOpacity>

                {/* Main Heading */}
                <Text
                  style={[
                    styles.tabletHeading,
                    {
                      fontSize: isTabletLandscape ? 34 : 28,
                      lineHeight: isTabletLandscape ? 48 : 40,
                      color: isDark ? '#FFFFFF' : '#0F172A',
                    },
                  ]}
                >
                  لەگەڵ فرۆشیار، فرۆشتنەکەت ئاسانتر بکە...
                </Text>

                {/* Subtitle / Description */}
                <Text
                  style={[
                    styles.tabletSubText,
                    {
                      fontSize: isTabletLandscape ? 18 : 16,
                      lineHeight: isTabletLandscape ? 32 : 28,
                      color: isDark ? '#94A3B8' : '#475569',
                    },
                  ]}
                >
                  ئەزموونی خۆت بە ئەکاونتی تایبەتی خۆت تاقی بکەرەوە، فرۆشتن و کڕین و کۆگا بە تەواوی تاقی بکەرەوە و لەگەڵ فرۆشیار کارەکانت خێراتر و ڕێکخراوتر بەڕێوەببە.
                </Text>

                {/* Animated Typewriter Pill Badge with Screen 5 themes */}
                <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', marginVertical: 14 }}>
                  <OnboardingTypewriterBadge themes={SCREEN_FIVE_BADGE_THEMES} size="large" />
                </View>
              </View>

              {/* Bottom Elements: Dots + Gold Button */}
              <View style={styles.tabletBottomArea}>
                {/* Pagination Dots (5 screens: Dot 1, 2, 3, 4 inactive, Dot 5 active) */}
                <View style={styles.tabletDotsRow}>
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
                  <View style={styles.tabletActiveDot} />
                </View>

                {/* Gold Button: Final Screen says "دەستپێبکە" */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={handleNext}
                  style={[
                    styles.tabletGoldButton,
                    { height: isTabletLandscape ? 64 : 58 },
                  ]}
                >
                  <Text style={[styles.tabletGoldButtonText, { fontSize: isTabletLandscape ? 21 : 18 }]}>دەستپێبکە</Text>
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

  // Render Layout for Mobile Phones
  return (
    <View style={[styles.screen, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.mobileSafeContainer}>
        {/* Top Header Row with Back and Dev Skip */}
        <View style={styles.mobileTopBar}>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            style={styles.mobileBackBtn}
          >
            <Feather
              name={isRTL ? "chevron-right" : "chevron-left"}
              size={24}
              color={isDark ? '#E2E8F0' : '#1E293B'}
            />
          </TouchableOpacity>

          {DEV_FORCE_ONBOARDING_PREVIEW && (
            <TouchableOpacity
              onPress={handleBypassToDashboard}
              style={[
                styles.mobileDevBypassBtn,
                { backgroundColor: isDark ? 'rgba(51, 65, 85, 0.7)' : 'rgba(241, 245, 249, 0.9)' },
              ]}
            >
              <Text style={styles.mobileDevBypassText}>چوونە داشبۆرد</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          contentContainerStyle={[styles.mobileScrollContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Mobile Illustration */}
          <MotiView
            from={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 400 }}
            style={styles.mobileIllustrationBox}
          >
            <SvgXml xml={MOBILE_TESTING_PANA_SVG} width={phoneSvgWidth} height={phoneSvgHeight} />
          </MotiView>

          {/* Texts Section */}
          <MotiView
            from={{ opacity: 0, translateY: 15 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 450, delay: 100 }}
            style={styles.mobileTextBox}
          >
            <Text
              style={[
                styles.mobileHeading,
                { color: isDark ? '#FFFFFF' : '#0F172A' },
              ]}
            >
              لەگەڵ فرۆشیار، فرۆشتنەکەت ئاسانتر بکە...
            </Text>

            <Text
              style={[
                styles.mobileSubText,
                { color: isDark ? '#94A3B8' : '#475569' },
              ]}
            >
              ئەزموونی خۆت بە ئەکاونتی تایبەتی خۆت تاقی بکەرەوە، فرۆشتن و کڕین و کۆگا بە تەواوی تاقی بکەرەوە و لەگەڵ فرۆشیار کارەکانت خێراتر بەڕێوەببە.
            </Text>

            {/* Animated Typewriter Pill Badge with Screen 5 themes */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <OnboardingTypewriterBadge themes={SCREEN_FIVE_BADGE_THEMES} />
            </View>
          </MotiView>

          {/* Bottom Area: Pagination Dots + Gold Button */}
          <View style={styles.mobileBottomArea}>
            {/* Dots (5 screens: Dot 1, 2, 3, 4 inactive, Dot 5 active) */}
            <View style={styles.dotsRow}>
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
              <View style={styles.activeDot} />
            </View>

            {/* Gold Button: Final Screen says "دەستپێبکە" */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleNext}
              style={styles.goldButton}
            >
              <Text style={styles.goldButtonText}>دەستپێبکە</Text>
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

  // --- Tablet / Large Screen Styles ---
  tabletCenterWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  devBypassBtn: {
    position: 'absolute',
    top: 24,
    left: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    zIndex: 99,
  },
  devBypassText: {
    fontSize: 13,
    color: '#D4AF37',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  tabletMasterCard: {
    width: '100%',
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 10,
  },
  tabletIllustrationBox: {
    flex: 1.15,
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabletContentBox: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 15,
    fontFamily: SETTINGS_KURDISH_FONT,
    marginHorizontal: 4,
  },
  tabletHeading: {
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 16,
  },
  tabletSubText: {
    fontFamily: SETTINGS_KURDISH_FONT,
    textAlign: 'right',
    marginBottom: 16,
  },
  tabletBottomArea: {
    marginTop: 24,
    gap: 20,
  },
  tabletDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  tabletActiveDot: {
    width: 28,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F8C61E',
  },
  tabletInactiveDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  tabletGoldButton: {
    width: '100%',
    backgroundColor: '#F8C61E',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F8C61E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  tabletGoldButtonText: {
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    fontWeight: 'bold',
    color: '#0F172A',
  },

  // --- Mobile Phone Styles ---
  mobileSafeContainer: {
    flex: 1,
  },
  mobileTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  mobileBackBtn: {
    padding: 8,
    borderRadius: 12,
  },
  mobileDevBypassBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  mobileDevBypassText: {
    fontSize: 12,
    color: '#D4AF37',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  mobileScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  mobileIllustrationBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  mobileTextBox: {
    alignItems: 'center',
    marginVertical: 8,
  },
  mobileHeading: {
    fontSize: 22,
    lineHeight: 34,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  mobileSubText: {
    fontSize: 14,
    lineHeight: 24,
    fontFamily: SETTINGS_KURDISH_FONT,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  mobileBottomArea: {
    marginTop: 'auto',
    paddingTop: 12,
    gap: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  activeDot: {
    width: 24,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F8C61E',
  },
  inactiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  goldButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#F8C61E',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F8C61E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  goldButtonText: {
    fontSize: 16,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    fontWeight: 'bold',
    color: '#0F172A',
  },
});
