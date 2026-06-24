import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { OnboardingDots } from './OnboardingDots';

interface Props {
  slideCount: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
  isFinalSlide: boolean;
  onNext: () => void;
  onGetStarted: () => void;
}

export function OnboardingFooter({
  slideCount,
  scrollX,
  pageWidth,
  isFinalSlide,
  onNext,
  onGetStarted,
}: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.footer}>
      <View style={styles.dotsWrapper}>
        <OnboardingDots count={slideCount} scrollX={scrollX} pageWidth={pageWidth} />
      </View>
      <PrimaryButton
        label={isFinalSlide ? t('common.getStarted') : t('common.next')}
        onPress={isFinalSlide ? onGetStarted : onNext}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
  },
  dotsWrapper: {
    marginBottom: 18,
  },
});
