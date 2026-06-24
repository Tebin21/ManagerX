import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { LTRNumber } from '@/components/ui/LTRNumber';
import { DateText } from '@/components/ui/DateText';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';
import { useOnlineStoreStore } from '@/store/onlineStoreStore';
import { useOnlineStoreSubscriptionStore } from '@/store/onlineStoreSubscriptionStore';
import { OnlineStoreLockedCard } from '@/components/dashboard/OnlineStoreLockedCard';
import { InfoModal } from '@/components/ui/InfoModal';
import { formatRelativeTime } from '@/utils/formatters';

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

export function OnlineStoreCard() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { flexDirection } = useRTL();
  const [infoVisible, setInfoVisible] = useState(false);

  const {
    enabled, storeUrl, lastSyncAt, pendingCount, isLoading, isSyncingNow,
    load, enable, disable, refreshPendingCount, copyLink, openWebsite, syncNow,
  } = useOnlineStoreStore();

  const {
    isActive: subscriptionActive, expired: subscriptionExpired, isLegacyActiveStore,
    expiresAt: subscriptionExpiresAt, remainingDays, loadSubscription,
  } = useOnlineStoreSubscriptionStore();

  useFocusEffect(
    useCallback(() => {
      load();
      refreshPendingCount();
      loadSubscription();
    }, [])
  );

  if (!subscriptionActive) {
    return <OnlineStoreLockedCard expired={subscriptionExpired} legacy={isLegacyActiveStore} />;
  }

  const handleToggle = async () => {
    if (enabled) {
      disable();
      return;
    }
    const result = await enable();
    if (result.status === 'locked') {
      Alert.alert(t('dashboard.onlineStore.title'), t('dashboard.onlineStore.subscriptionRequired'));
    }
  };

  const handleSyncNow = async () => {
    const result = await syncNow();
    if (result.status === 'locked') {
      Alert.alert(t('dashboard.onlineStore.title'), t('dashboard.onlineStore.subscriptionRequired'));
    }
  };

  const handleCopyLink = async () => {
    const copied = await copyLink();
    if (!copied && storeUrl) {
      // Clipboard unavailable (e.g. needs a native rebuild) — let the user grab the
      // link manually instead of silently doing nothing.
      Alert.alert(t('dashboard.onlineStore.title'), storeUrl);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.lightBlue }, Theme.shadow.card]}>
      {/* Header */}
      <View style={[styles.headerRow, { flexDirection }]}>
        <View style={[styles.headerLeft, { flexDirection }]}>
          <View style={[styles.iconWrapper, { backgroundColor: colors.softBlue }]}>
            <Ionicons name="storefront" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.darkBlue }]}>{t('dashboard.onlineStore.title')}</Text>
        </View>

        <View style={[styles.headerRight, { flexDirection }]}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: enabled ? '#DCFCE7' : colors.gray100 },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: enabled ? colors.success : colors.gray400 }]} />
            <Text style={[styles.statusText, { color: enabled ? colors.success : colors.gray500 }]}>
              {enabled ? t('dashboard.onlineStore.active') : t('dashboard.onlineStore.disabled')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setInfoVisible(true)}
            hitSlop={8}
            accessibilityLabel={t('dashboard.onlineStore.infoButtonA11y')}
          >
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Subscription status */}
      <View style={[styles.subRow, { backgroundColor: colors.gray50, flexDirection }]}>
        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
        <Text style={[styles.subText, { color: colors.gray600 }]} numberOfLines={1}>
          {t('dashboard.onlineStore.activeSubscriptionLabel')}
          {subscriptionExpiresAt ? <> · <DateText value={subscriptionExpiresAt} size="small" style={styles.subText} /></> : null}
          {remainingDays !== null ? ` · ${remainingDays}d` : ''}
        </Text>
      </View>

      {/* Store URL */}
      <View style={[styles.urlRow, { backgroundColor: colors.softBlue, borderColor: colors.lightBlue, flexDirection }]}>
        <Ionicons name="globe-outline" size={16} color={colors.primary} />
        <LTRNumber style={[styles.urlText, { color: colors.primaryDark }]} numberOfLines={1}>
          {storeUrl ? stripProtocol(storeUrl) : t('dashboard.onlineStore.registering')}
        </LTRNumber>
        <TouchableOpacity
          onPress={handleCopyLink}
          disabled={!storeUrl}
          hitSlop={8}
          style={styles.urlIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="copy-outline" size={18} color={storeUrl ? colors.primary : colors.gray300} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={openWebsite}
          disabled={!storeUrl}
          hitSlop={8}
          style={styles.urlIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="open-outline" size={18} color={storeUrl ? colors.primary : colors.gray300} />
        </TouchableOpacity>
        {enabled && (
          <TouchableOpacity
            onPress={handleSyncNow}
            disabled={isSyncingNow}
            hitSlop={8}
            style={styles.urlIconBtn}
            activeOpacity={0.7}
          >
            {isSyncingNow ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Ionicons name="sync-outline" size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { flexDirection }]}>
        <View style={[styles.statBlock, { backgroundColor: colors.gray50 }]}>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('dashboard.onlineStore.lastSync')}</Text>
          <Text style={[styles.statValue, { color: colors.darkBlue }]}>
            {lastSyncAt ? formatRelativeTime(lastSyncAt) : t('dashboard.onlineStore.never')}
          </Text>
        </View>
        <View style={[styles.statBlock, { backgroundColor: colors.gray50 }]}>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('settings.onlineStoreScreen.pendingChanges')}</Text>
          <Text style={[styles.statValue, { color: pendingCount > 0 ? colors.warning : colors.success }]}>
            {pendingCount > 0
              ? t('dashboard.onlineStore.changesWaiting', { count: pendingCount })
              : t('dashboard.onlineStore.allSynced')}
          </Text>
        </View>
      </View>

      {/* Action */}
      <TouchableOpacity
        onPress={handleToggle}
        disabled={isLoading}
        activeOpacity={0.85}
        style={[
          styles.actionBtn,
          { backgroundColor: enabled ? colors.gray100 : colors.primary },
          !enabled && Theme.shadow.button,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color={enabled ? colors.gray500 : colors.white} size="small" />
        ) : (
          <Text style={[styles.actionText, { color: enabled ? colors.gray600 : colors.white }]}>
            {enabled ? t('dashboard.onlineStore.disableStore') : t('dashboard.onlineStore.enableStore')}
          </Text>
        )}
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
    marginBottom:   14,
  },
  headerLeft: {
    alignItems: 'center',
    gap:        10,
  },
  headerRight: {
    alignItems: 'center',
    gap:        10,
  },
  subRow: {
    alignItems:        'center',
    gap:               6,
    borderRadius:      Theme.radius.md,
    paddingHorizontal: 10,
    paddingVertical:   7,
    marginBottom:      12,
  },
  subText: {
    flex:       1,
    fontSize:   11.5,
    fontWeight: '600',
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
  statusPill: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              6,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      Theme.radius.full,
  },
  statusDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  statusText: {
    fontSize:   12,
    fontWeight: '700',
  },
  urlRow: {
    alignItems:        'center',
    gap:               8,
    borderRadius:      Theme.radius.md,
    borderWidth:       1,
    paddingHorizontal: 12,
    paddingVertical:   10,
    marginBottom:      14,
  },
  urlText: {
    flex:       1,
    fontSize:   13,
    fontWeight: '600',
  },
  urlIconBtn: {
    padding: 2,
  },
  statsRow: {
    gap:          10,
    marginBottom: 16,
  },
  statBlock: {
    flex:              1,
    borderRadius:      Theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical:   10,
  },
  statLabel: {
    fontSize:     11,
    fontWeight:   '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize:   13,
    fontWeight: '700',
  },
  actionBtn: {
    height:         Theme.button.height,
    borderRadius:   Theme.button.borderRadius,
    alignItems:     'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize:   15,
    fontWeight: '700',
  },
});
