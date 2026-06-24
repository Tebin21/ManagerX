import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { ONBOARDING_SLIDES, type OnboardingSlideData } from '@/constants/onboardingSlides';
import { OnboardingSlide } from '@/components/onboarding/OnboardingSlide';
import { OnboardingFinalSlide } from '@/components/onboarding/OnboardingFinalSlide';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';

export default function AboutScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { completeOnboarding } = useOnboardingStore();
  const { isRTL } = useRTL();
  const { width: pageWidth } = useWindowDimensions();

  const flatListRef = useRef<Animated.FlatList<OnboardingSlideData>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const isFinalSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  const handleFinish = () => {
    completeOnboarding();
    router.replace('/(onboarding)/login');
  };

  const handleNext = () => {
    const nextIndex = Math.min(currentIndex + 1, ONBOARDING_SLIDES.length - 1);
    flatListRef.current?.scrollToOffset({ offset: nextIndex * pageWidth, animated: true });
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCurrentIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.gray50 }]}>
      <StatusBar barStyle="dark-content" />

      <Animated.FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          item.type === 'final' ? (
            <OnboardingFinalSlide slide={item} />
          ) : (
            <OnboardingSlide slide={item} />
          )
        }
        horizontal
        pagingEnabled
        bounces={false}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={styles.list}
      />

      {!isFinalSlide && (
        <View style={[styles.skipWrapper, isRTL ? styles.skipLeft : styles.skipRight]}>
          <PrimaryButton
            variant="ghost"
            fullWidth={false}
            label={t('onboarding.skip')}
            onPress={handleFinish}
          />
        </View>
      )}

      <OnboardingFooter
        slideCount={ONBOARDING_SLIDES.length}
        scrollX={scrollX}
        pageWidth={pageWidth}
        isFinalSlide={isFinalSlide}
        onNext={handleNext}
        onGetStarted={handleFinish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  skipWrapper: {
    position: 'absolute',
    top: 56,
  },
  skipRight: {
    right: 16,
  },
  skipLeft: {
    left: 16,
  },
});
