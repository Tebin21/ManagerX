import React, { useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/common/AppHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { LTRNumber } from '@/components/ui/LTRNumber';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useOnlineStoreStore } from '@/store/onlineStoreStore';
import { formatRelativeTime } from '@/utils/formatters';

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

export default function OnlineStoreScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { textAlign, flexDirection } = useRTL();

  const {
    enabled, storeUrl, lastSyncAt, pendingCount, isLoading,
    load, enable, disable, refreshPendingCount, copyLink, openWebsite,
  } = useOnlineStoreStore();

  useEffect(() => {
    load();
    refreshPendingCount();
  }, []);

  const handleCopyLink = async () => {
    const copied = await copyLink();
    if (!copied && storeUrl) {
      // Clipboard unavailable (e.g. needs a native rebuild) — let the user grab the
      // link manually instead of silently doing nothing.
      Alert.alert(t('settings.onlineStoreScreen.title'), storeUrl);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('settings.onlineStoreScreen.title')} showBack />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[colors.primaryDark, colors.primary]}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Text style={styles.heroStatus}>
            {enabled ? t('settings.onlineStoreScreen.active') : t('settings.onlineStoreScreen.disabled')}
          </Text>
          <LTRNumber style={styles.heroUrl} numberOfLines={1}>
            {storeUrl ? stripProtocol(storeUrl) : t('dashboard.onlineStore.registering')}
          </LTRNumber>
        </LinearGradient>

        <PremiumCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.black, textAlign }]}>
            {t('settings.onlineStoreScreen.section')}
          </Text>

          <View style={[styles.statsRow, { flexDirection }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.gray400 }]}>
                {t('settings.onlineStoreScreen.lastSync')}
              </Text>
              <Text style={[styles.statValue, { color: colors.black }]}>
                {lastSyncAt ? formatRelativeTime(lastSyncAt) : t('dashboard.onlineStore.never')}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.gray100 }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.gray400 }]}>
                {t('settings.onlineStoreScreen.pendingChanges')}
              </Text>
              <Text style={[styles.statValue, { color: pendingCount > 0 ? colors.warning : colors.success }]}>
                {pendingCount}
              </Text>
            </View>
          </View>

          <View style={[styles.linkActions, { flexDirection }]}>
            <TouchableOpacity
              onPress={handleCopyLink}
              disabled={!storeUrl}
              style={[styles.linkBtn, { borderColor: colors.lightBlue, flexDirection }]}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={16} color={storeUrl ? colors.primary : colors.gray300} />
              <Text style={[styles.linkBtnText, { color: storeUrl ? colors.primary : colors.gray300 }]}>
                {t('settings.onlineStoreScreen.copyLink')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openWebsite}
              disabled={!storeUrl}
              style={[styles.linkBtn, { borderColor: colors.lightBlue, flexDirection }]}
              activeOpacity={0.7}
            >
              <Ionicons name="open-outline" size={16} color={storeUrl ? colors.primary : colors.gray300} />
              <Text style={[styles.linkBtnText, { color: storeUrl ? colors.primary : colors.gray300 }]}>
                {t('settings.onlineStoreScreen.openWebsite')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toggleBtnWrap}>
            <PrimaryButton
              label={enabled ? t('settings.onlineStoreScreen.disableStore') : t('settings.onlineStoreScreen.enableStore')}
              onPress={enabled ? disable : enable}
              loading={isLoading}
              variant={enabled ? 'outline' : 'primary'}
            />
          </View>
        </PremiumCard>

        <View style={[styles.infoBox, { backgroundColor: colors.softBlue, borderColor: colors.lightBlue }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.gray600, textAlign }]}>
            {t('settings.onlineStoreScreen.publishHint')}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body:      { padding: 16, paddingTop: 12 },

  heroCard: {
    borderRadius: 18,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    gap: 6,
  },
  heroStatus: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  heroUrl: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 2, maxWidth: '100%' },

  card:      { marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },

  statsRow:    { gap: 12, marginBottom: 16 },
  statItem:    { flex: 1, alignItems: 'center' },
  statDivider: { width: 1 },
  statLabel:   { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  statValue:   { fontSize: 16, fontWeight: '700' },

  linkActions: { gap: 10, marginBottom: 16 },
  linkBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: 12, paddingVertical: 12,
  },
  linkBtnText: { fontSize: 13, fontWeight: '700' },

  toggleBtnWrap: { marginTop: 4 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1, borderRadius: 12, padding: 14,
  },
  infoText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
});
