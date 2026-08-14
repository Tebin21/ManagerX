import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';

// iOS-only placeholder shown in place of the Online Store subscription/activation UI —
// temporary Apple 3.1.1 compliance measure until Apple IAP is implemented. Modeled on the
// existing tutorials.tsx "coming soon" placeholder for visual consistency.
export function OnlineStoreComingSoon() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <View style={styles.placeholder}>
      <View style={[styles.iconWrap, { backgroundColor: colors.softBlue, borderColor: colors.lightBlue }]}>
        <Ionicons name="storefront" size={56} color={colors.primary} />
      </View>
      <Text style={[styles.heading, { color: colors.darkBlue }]}>
        {t('dashboard.onlineStore.comingSoonHeading')}
      </Text>
      <Text style={[styles.sub, { color: colors.gray500 }]}>
        {t('dashboard.onlineStore.comingSoonBody')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconWrap: {
    width: 110,
    height: 110,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  sub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
