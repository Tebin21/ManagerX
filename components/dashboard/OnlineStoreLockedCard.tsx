import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';
import { InfoModal } from '@/components/ui/InfoModal';

interface Props {
  /** Was previously subscribed and the subscription has since lapsed — distinct copy
   *  ("Subscription Expired") from a device that's never subscribed at all. */
  expired: boolean;
  /** Store was already enabled before this gate shipped — informational banner only,
   *  never changes what's locked. */
  legacy: boolean;
}

// Shown in place of the normal OnlineStoreCard body whenever there's no active Online
// Store Subscription — covers both "never subscribed" and "expired", same shell,
// different headline/CTA copy.
export function OnlineStoreLockedCard({ expired, legacy }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { flexDirection, textAlign, writingDirection } = useRTL();
  const router = useRouter();
  const [infoVisible, setInfoVisible] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.lightBlue }, Theme.shadow.card]}>
      <View style={[styles.headerRow, { flexDirection }]}>
        <View style={[styles.headerLeft, { flexDirection }]}>
          <View style={[styles.iconWrapper, { backgroundColor: colors.gray100 }]}>
            <Ionicons name="storefront" size={22} color={colors.gray400} />
            <View style={[styles.lockBadge, { backgroundColor: colors.gray200 }]}>
              <Ionicons name="lock-closed" size={10} color={colors.gray500} />
            </View>
          </View>
          <Text style={[styles.title, { color: colors.darkBlue }]}>
            {expired ? t('dashboard.onlineStore.expiredTitle') : t('dashboard.onlineStore.lockedTitle')}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setInfoVisible(true)}
          hitSlop={8}
          accessibilityLabel={t('dashboard.onlineStore.infoButtonA11y')}
        >
          <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.pitch, { color: colors.gray500, textAlign, writingDirection }]}>
        {expired ? t('dashboard.onlineStore.subscriptionRequired') : t('dashboard.onlineStore.lockedPitch')}
      </Text>

      {legacy && (
        <View style={[styles.legacyBox, { backgroundColor: colors.softBlue, borderColor: colors.lightBlue, flexDirection }]}>
          <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
          <Text style={[styles.legacyText, { color: colors.primaryDark }]}>
            {t('dashboard.onlineStore.legacyNotice')}
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={() => router.push('/(app)/settings/online-store-subscription' as never)}
        activeOpacity={0.85}
        style={[styles.actionBtn, { backgroundColor: colors.primary }, Theme.shadow.button]}
      >
        <Ionicons name="lock-open-outline" size={16} color={colors.white} />
        <Text style={styles.actionText}>
          {expired ? t('dashboard.onlineStore.expiredCta') : t('dashboard.onlineStore.activateCta')}
        </Text>
      </TouchableOpacity>

      <InfoModal
        visible={infoVisible}
        onClose={() => setInfoVisible(false)}
        title={t('dashboard.onlineStoreInfoModal.title')}
        description={t('dashboard.onlineStoreInfoModal.description')}
        bullets={[
          t('dashboard.onlineStoreInfoModal.bullet1'),
          t('dashboard.onlineStoreInfoModal.bullet2'),
          t('dashboard.onlineStoreInfoModal.bullet3'),
          t('dashboard.onlineStoreInfoModal.bullet4'),
          t('dashboard.onlineStoreInfoModal.bullet5'),
          t('dashboard.onlineStoreInfoModal.bullet6'),
          t('dashboard.onlineStoreInfoModal.bullet7'),
        ]}
        footerNote={t('dashboard.onlineStoreInfoModal.footerNote')}
      />
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
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   10,
  },
  headerLeft: {
    alignItems: 'center',
    gap:        10,
  },
  iconWrapper: {
    width:          40,
    height:         40,
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
  },
  lockBadge: {
    position:       'absolute',
    bottom:         -4,
    right:          -4,
    width:          18,
    height:         18,
    borderRadius:   9,
    alignItems:     'center',
    justifyContent: 'center',
  },
  title: {
    fontSize:   16,
    fontWeight: '700',
  },
  pitch: {
    fontSize:     13,
    lineHeight:   19,
    marginBottom: 12,
  },
  legacyBox: {
    alignItems:   'center',
    gap:          6,
    borderWidth:  1,
    borderRadius: 10,
    padding:      10,
    marginBottom: 12,
  },
  legacyText: {
    flex:       1,
    fontSize:   11.5,
    lineHeight: 16,
    fontWeight: '600',
  },
  actionBtn: {
    height:         Theme.button.height,
    borderRadius:   Theme.button.borderRadius,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
  },
  actionText: {
    fontSize:   15,
    fontWeight: '700',
    color:      '#fff',
  },
});
