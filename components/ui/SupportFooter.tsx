import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, useWindowDimensions } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { LTRNumber } from '@/components/ui/LTRNumber';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SUPPORT_PHONE, SUPPORT_WEBSITE, SUPPORT_WEBSITE_DISPLAY } from '@/constants/config';
import { useAppTheme } from '@/contexts/ThemeContext';

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
  const { colors } = useAppTheme();
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
      <View style={[styles.hairline, { backgroundColor: colors.gray200 }]} />

      <Text style={[styles.description, { color: colors.gray500 }]}>
        {t('support.description')}
      </Text>

      <View style={styles.contactRow}>
        <TouchableOpacity
          onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
          style={styles.contactItem}
          activeOpacity={0.7}
        >
          <Ionicons name="call" size={14} color={colors.primary} />
          <LTRNumber style={[styles.contactText, { color: colors.primary }]}>
            {SUPPORT_PHONE}
          </LTRNumber>
        </TouchableOpacity>

        <View style={[styles.separator, { backgroundColor: colors.gray300 }]} />

        <TouchableOpacity
          onPress={() => Linking.openURL(SUPPORT_WEBSITE)}
          style={styles.contactItem}
          activeOpacity={0.7}
        >
          <Ionicons name="globe-outline" size={14} color={colors.primary} />
          <LTRNumber style={[styles.contactText, { color: colors.primary }]}>
            {SUPPORT_WEBSITE_DISPLAY}
          </LTRNumber>
        </TouchableOpacity>
      </View>
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
  hairline: {
    width:        '45%',
    height:       1,
    marginBottom: 20,
    opacity:      0.6,
  },
  description: {
    fontSize:    12.5,
    lineHeight:  19,
    textAlign:   'center',
    maxWidth:    300,
  },
  contactRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    flexWrap:       'wrap',
    marginTop:      16,
  },
  contactItem: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    paddingVertical: 4,
  },
  separator: {
    width:         1,
    height:        14,
    marginHorizontal: 14,
  },
  contactText: {
    fontSize:      13.5,
    fontWeight:    '600',
    letterSpacing: 0.2,
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
