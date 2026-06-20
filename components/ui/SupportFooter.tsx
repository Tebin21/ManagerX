import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { LTRNumber } from '@/components/ui/LTRNumber';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SUPPORT_PHONE, SUPPORT_WEBSITE, SUPPORT_WEBSITE_DISPLAY } from '@/constants/config';
import { useAppTheme } from '@/contexts/ThemeContext';

export function SupportFooter() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

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
});
