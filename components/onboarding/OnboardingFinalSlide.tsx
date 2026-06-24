import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/colors';
import type { OnboardingFinalSlide as OnboardingFinalSlideData } from '@/constants/onboardingSlides';

interface Props {
  slide: OnboardingFinalSlideData;
}

export function OnboardingFinalSlide({ slide }: Props) {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <View style={[styles.page, { width }]}>
      <MotiView
        from={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 100, delay: 100 }}
        style={[styles.heroWrapper, { backgroundColor: colors.softBlue }]}
      >
        <Ionicons name={slide.heroIcon} size={42} color={colors.primary} />
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 120, delay: 220 }}
      >
        <Text style={[styles.title, { color: colors.darkBlue }]}>
          {t(slide.titleKey)}
        </Text>
        <Text style={styles.description}>
          {t(slide.descriptionKey)}
        </Text>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  heroWrapper: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: Colors.gray600,
    lineHeight: 21,
    textAlign: 'center',
  },
});
