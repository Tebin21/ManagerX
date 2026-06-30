import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Linking, useWindowDimensions } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { LTRNumber } from '@/components/ui/LTRNumber';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SUPPORT_PHONE, SUPPORT_WEBSITE, SUPPORT_WEBSITE_DISPLAY } from '@/constants/config';
import { useAppTheme } from '@/contexts/ThemeContext';

const BEXDRE_URL = 'https://bexdre.com';

// Below this width the contact pill stacks vertically instead of a row, so it
// never clips on the smallest phones or under large accessibility font scales.
const STACK_BREAKPOINT  = 340;
const TABLET_BREAKPOINT = 768;

interface SupportFooterProps {
  // Tighter, grouped layout used on the Dashboard. Login keeps the original
  // spacing below untouched when this is omitted.
  compact?: boolean;
}

export function SupportFooter({ compact = false }: SupportFooterProps) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  if (compact) {
    const isTablet = width >= TABLET_BREAKPOINT;
    const stacked  = width < STACK_BREAKPOINT;

    return (
      <View style={[styles.containerCompact, isTablet && styles.containerCompactTablet]}>
        <View style={[styles.hairlineCompact, { backgroundColor: colors.gray200 }]} />

        <Text
          style={[
            styles.descriptionCompact,
            isTablet && styles.descriptionCompactTablet,
            { color: colors.gray500, maxWidth: Math.min(width - 64, isTablet ? 440 : 300) },
          ]}
        >
          {t('support.description')}
        </Text>

        <View
          style={[
            styles.contactGroup,
            stacked && styles.contactGroupStacked,
          ]}
        >
          <TouchableOpacity
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
            style={styles.contactItem}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={13} color={colors.primary} />
            <LTRNumber
              style={[styles.contactTextCompact, isTablet && styles.contactTextCompactTablet, { color: colors.primary }]}
              numberOfLines={1}
            >
              {SUPPORT_PHONE}
            </LTRNumber>
          </TouchableOpacity>

          <View
            style={[
              stacked ? styles.dividerHorizontal : styles.dividerVertical,
              { backgroundColor: colors.gray300 },
            ]}
          />

          <TouchableOpacity
            onPress={() => Linking.openURL(SUPPORT_WEBSITE)}
            style={styles.contactItem}
            activeOpacity={0.7}
          >
            <Ionicons name="globe-outline" size={13} color={colors.primary} />
            <LTRNumber
              style={[styles.contactTextCompact, isTablet && styles.contactTextCompactTablet, { color: colors.primary }]}
              numberOfLines={1}
            >
              {SUPPORT_WEBSITE_DISPLAY}
            </LTRNumber>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => Linking.openURL(BEXDRE_URL)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="BexDre"
      >
        <Image
          source={isDark
            ? require('@/assets/images/bexdrelogo-light.png')
            : require('@/assets/images/bexdrelogo-dark.png')}
          style={styles.bexdreLogo}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems:        'center',
    paddingTop:        24,
    paddingBottom:     28,
    paddingHorizontal: 28,
  },
  bexdreLogo: {
    width:  180,
    height: 36,
  },
  contactItem: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    paddingVertical: 4,
  },

  // --- Compact (Dashboard) variant ---
  containerCompact: {
    alignItems:        'center',
    paddingTop:        14,
    paddingBottom:     16,
    paddingHorizontal: 20,
  },
  containerCompactTablet: {
    paddingTop:    18,
    paddingBottom: 20,
  },
  hairlineCompact: {
    width:        '32%',
    height:       1,
    marginBottom: 10,
    opacity:      0.6,
  },
  descriptionCompact: {
    fontSize:     11.5,
    lineHeight:   16,
    textAlign:    'center',
    marginBottom: 10,
  },
  descriptionCompactTablet: {
    fontSize:   13,
    lineHeight: 18,
  },
  contactGroup: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    alignSelf:      'center',
    gap:            14,
  },
  contactGroupStacked: {
    flexDirection: 'column',
    gap:           8,
  },
  dividerVertical: {
    width:  1,
    height: 14,
  },
  dividerHorizontal: {
    width:  '60%',
    height: 1,
  },
  contactTextCompact: {
    fontSize:      12,
    fontWeight:    '600',
    letterSpacing: 0.2,
  },
  contactTextCompactTablet: {
    fontSize: 13,
  },
});
