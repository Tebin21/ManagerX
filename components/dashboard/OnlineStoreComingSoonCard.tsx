import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';

// iOS-only dashboard card — temporary Apple 3.1.1 compliance measure. Replaces
// OnlineStoreLockedCard/OnlineStoreCard on iOS with no CTA, no demo link, no subscription
// wording: just an icon and a Coming Soon message, matching the existing card shell.
export function OnlineStoreComingSoonCard() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { flexDirection, textAlign, writingDirection } = useRTL();

  return (
    <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.lightBlue }, Theme.shadow.card]}>
      <View style={[styles.headerRow, { flexDirection }]}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.softBlue }]}>
          <Ionicons name="storefront" size={22} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.darkBlue }]}>
          {t('dashboard.onlineStore.title')}
        </Text>
      </View>

      <Text style={[styles.heading, { color: colors.darkBlue, textAlign, writingDirection }]}>
        {t('dashboard.onlineStore.comingSoonHeading')}
      </Text>
      <Text style={[styles.body, { color: colors.gray500, textAlign, writingDirection }]}>
        {t('dashboard.onlineStore.comingSoonBody')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop:        16,
    borderRadius:     Theme.radius.card,
    borderWidth:      1,
    padding:          18,
  },
  headerRow: {
    alignItems:   'center',
    gap:          10,
    marginBottom: 12,
  },
  iconWrapper: {
    width:          40,
    height:         40,
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
  },
  title: {
    fontSize:   16,
    fontWeight: '700',
  },
  heading: {
    fontSize:     14,
    fontWeight:   '700',
    marginBottom: 6,
  },
  body: {
    fontSize:   13,
    lineHeight: 19,
  },
});
