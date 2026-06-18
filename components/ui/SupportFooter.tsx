import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SUPPORT_PHONE, SUPPORT_WEBSITE, SUPPORT_WEBSITE_DISPLAY } from '@/constants/config';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';

export function SupportFooter() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { flexDirection } = useRTL();

  return (
    <View style={styles.container}>
      <View style={[styles.divider, { backgroundColor: colors.gray200 }]} />

      <Text style={[styles.description, { color: colors.gray400 }]}>
        {t('support.label')}
      </Text>

      <TouchableOpacity
        onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
        style={[styles.linkRow, { flexDirection }]}
        activeOpacity={0.7}
      >
        <Ionicons name="call" size={15} color={colors.primary} />
        <Text style={[styles.linkText, { color: colors.primary }]}>
          {SUPPORT_PHONE}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL(SUPPORT_WEBSITE)}
        style={[styles.linkRow, { flexDirection }]}
        activeOpacity={0.7}
      >
        <Ionicons name="globe-outline" size={15} color={colors.primary} />
        <Text style={[styles.linkText, { color: colors.primary }]}>
          {SUPPORT_WEBSITE_DISPLAY}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems:        'center',
    paddingVertical:   28,
    paddingHorizontal: 24,
  },
  divider: {
    width:        '60%',
    height:       1,
    marginBottom: 16,
    opacity:      0.6,
  },
  description: {
    fontSize:     12,
    letterSpacing: 0.2,
    marginBottom: 14,
    textAlign:    'center',
    lineHeight:   18,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingVertical: 2,
  },
  linkText: {
    fontSize:      14,
    letterSpacing: 0.3,
    fontWeight:    '600',
  },
});
