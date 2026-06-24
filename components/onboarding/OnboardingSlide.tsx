import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { OnboardingItemRow } from './OnboardingItemRow';
import type { OnboardingContentSlide } from '@/constants/onboardingSlides';

interface Props {
  slide: OnboardingContentSlide;
}

export function OnboardingSlide({ slide }: Props) {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { textAlign } = useRTL();

  return (
    <View style={[styles.page, { width }]}>
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, delay: 80 }}
        style={[styles.heroWrapper, { backgroundColor: colors.softBlue }]}
      >
        <Ionicons name={slide.heroIcon} size={36} color={colors.primary} />
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 120, delay: 140 }}
      >
        <Text style={[styles.title, { color: colors.darkBlue, textAlign }]}>
          {t(slide.titleKey)}
        </Text>
        <Text style={[styles.description, { textAlign }]}>
          {t(slide.descriptionKey)}
        </Text>
      </MotiView>

      {slide.groups.map((group, groupIndex) => (
        <MotiView
          key={groupIndex}
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 120, delay: 180 + groupIndex * 80 }}
          style={styles.group}
        >
          {group.labelKey && (
            <Text style={[styles.groupLabel, { textAlign }]}>{t(group.labelKey)}</Text>
          )}
          <View style={styles.itemsWrap}>
            {group.items.map((item) => (
              <OnboardingItemRow key={item.labelKey} item={item} />
            ))}
          </View>
        </MotiView>
      ))}

      {slide.closingKeys.map((closingKey) => (
        <Text key={closingKey} style={[styles.closing, { color: colors.primary, textAlign }]}>
          {t(closingKey)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  heroWrapper: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.gray600,
    lineHeight: 20,
    marginBottom: 18,
  },
  group: {
    marginBottom: 8,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  itemsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Theme.spacing.xs,
  },
  closing: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 19,
  },
});
