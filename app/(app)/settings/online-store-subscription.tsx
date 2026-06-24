import React, { useCallback, useEffect, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, Linking,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { SettingsTextInput as AppTextInput } from '@/components/settings/SettingsTextInput';
import { SettingsPrimaryButton as PrimaryButton } from '@/components/settings/SettingsPrimaryButton';
import { LTRNumber } from '@/components/ui/LTRNumber';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useOnlineStoreSubscriptionStore } from '@/store/onlineStoreSubscriptionStore';
import { SUPPORT_PHONE } from '@/constants/config';
import { useRTL } from '@/lib/rtl';
import { formatDateShort } from '@/utils/formatters';

const PLAN_LABEL_KEYS: Record<string, string> = {
  '1m': 'settings.onlineStoreSubscriptionScreen.planLabel1m',
  '3m': 'settings.onlineStoreSubscriptionScreen.planLabel3m',
  '6m': 'settings.onlineStoreSubscriptionScreen.planLabel6m',
  '12m': 'settings.onlineStoreSubscriptionScreen.planLabel12m',
  lifetime: 'settings.onlineStoreSubscriptionScreen.planLabelLifetime',
};

type ResultState = { type: 'success' | 'error'; message: string } | null;

export default function OnlineStoreSubscriptionScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { textAlign, flexDirection } = useRTL();

  const plan          = useOnlineStoreSubscriptionStore((s) => s.plan);
  const deviceId       = useOnlineStoreSubscriptionStore((s) => s.deviceId);
  const expiresAt      = useOnlineStoreSubscriptionStore((s) => s.expiresAt);
  const expired        = useOnlineStoreSubscriptionStore((s) => s.expired);
  const isActive        = useOnlineStoreSubscriptionStore((s) => s.isActive);
  const remainingDays  = useOnlineStoreSubscriptionStore((s) => s.remainingDays);
  const isLegacyActiveStore = useOnlineStoreSubscriptionStore((s) => s.isLegacyActiveStore);
  const activate       = useOnlineStoreSubscriptionStore((s) => s.activate);
  const loadSubscription = useOnlineStoreSubscriptionStore((s) => s.loadSubscription);

  const [code, setCode]             = useState('');
  const [activating, setActivating] = useState(false);
  const [result, setResult]         = useState<ResultState>(null);

  useEffect(() => { loadSubscription(); }, [loadSubscription]);

  const planLabel = plan ? t(PLAN_LABEL_KEYS[plan] ?? PLAN_LABEL_KEYS['1m']) : null;
  const statusLabel = expired
    ? t('settings.onlineStoreSubscriptionScreen.statusExpired')
    : isActive
    ? t('settings.onlineStoreSubscriptionScreen.statusActive')
    : t('settings.onlineStoreSubscriptionScreen.statusNotActive');

  async function handleActivate() {
    if (!code.trim() || activating) return;
    setActivating(true);
    setResult(null);
    try {
      const res = await activate(code);
      if (res.status === 'activated') {
        setResult({ type: 'success', message: t('settings.onlineStoreSubscriptionScreen.activated') });
        setCode('');
      } else if (res.status === 'already_activated') {
        setResult({ type: 'error', message: t('settings.onlineStoreSubscriptionScreen.alreadyActivated') });
      } else if (res.status === 'wrong_device') {
        setResult({ type: 'error', message: t('settings.onlineStoreSubscriptionScreen.wrongDevice') });
      } else if (res.status === 'expired') {
        setResult({
          type: 'error',
          message: res.expiresAt
            ? t('settings.onlineStoreSubscriptionScreen.codeExpiredOn', { date: formatDateShort(res.expiresAt) })
            : t('settings.onlineStoreSubscriptionScreen.codeExpired'),
        });
      } else if (res.status === 'not_an_extension') {
        setResult({ type: 'error', message: t('settings.onlineStoreSubscriptionScreen.notAnExtension') });
      } else {
        setResult({ type: 'error', message: t('settings.onlineStoreSubscriptionScreen.invalidCode') });
      }
    } catch {
      setResult({ type: 'error', message: t('common.tryAgain') });
    } finally {
      setActivating(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('settings.onlineStoreSubscriptionScreen.title')} showBack />

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Current status ── */}
          <LinearGradient
            colors={[colors.primaryDark, colors.primary]}
            style={styles.heroCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={styles.heroStatus}>{statusLabel}</Text>
            {planLabel && <Text style={styles.heroPlan}>{planLabel}</Text>}
            <Text style={styles.heroExpiry}>
              {isActive
                ? expiresAt
                  ? t('settings.onlineStoreSubscriptionScreen.expiresOn', { date: formatDateShort(expiresAt) })
                  : t('settings.onlineStoreSubscriptionScreen.neverExpires')
                : ''}
            </Text>
            {isActive && remainingDays !== null && (
              <Text style={styles.heroRemaining}>
                {remainingDays <= 0
                  ? t('settings.onlineStoreSubscriptionScreen.remainingDaysToday')
                  : t('settings.onlineStoreSubscriptionScreen.remainingDays', { count: remainingDays })}
              </Text>
            )}
          </LinearGradient>

          {/* ── Expired notice ── */}
          {expired && (
            <View style={[styles.noticeBox, { flexDirection, backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Ionicons name="time-outline" size={18} color={colors.error} />
              <Text style={[styles.noticeText, { color: colors.error, textAlign }]}>
                {t('settings.onlineStoreSubscriptionScreen.expiredNotice')}
              </Text>
            </View>
          )}

          {/* ── Legacy migration notice — informational only, never a bypass ── */}
          {isLegacyActiveStore && (
            <View style={[styles.noticeBox, { flexDirection, backgroundColor: colors.softBlue, borderColor: colors.lightBlue }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.noticeText, { color: colors.primaryDark, textAlign }]}>
                {t('settings.onlineStoreSubscriptionScreen.legacyNotice')}
              </Text>
            </View>
          )}

          {/* ── Device ID ── */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.black, textAlign }]}>
              {t('settings.onlineStoreSubscriptionScreen.deviceIdTitle')}
            </Text>
            <Text style={[styles.cardSub, { color: colors.gray400, textAlign }]}>
              {t('settings.onlineStoreSubscriptionScreen.deviceIdHint')}
            </Text>
            <LTRNumber selectable style={[styles.deviceIdText, { color: colors.black, backgroundColor: colors.gray50 }]}>
              {deviceId ?? '...'}
            </LTRNumber>
          </PremiumCard>

          {/* ── Activation ── */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.black, textAlign }]}>
              {t('settings.onlineStoreSubscriptionScreen.activateTitle')}
            </Text>
            <Text style={[styles.cardSub, { color: colors.gray400, textAlign }]}>
              {t('settings.onlineStoreSubscriptionScreen.activateHint')}
            </Text>

            <AppTextInput
              label={t('settings.onlineStoreSubscriptionScreen.codeLabel')}
              placeholder={t('settings.onlineStoreSubscriptionScreen.codePlaceholder')}
              value={code}
              onChangeText={(v) => { setCode(v); setResult(null); }}
              autoCorrect={false}
              autoComplete="off"
              multiline
              numberOfLines={3}
              style={styles.codeInput}
            />

            {result && (
              <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 220 }}
                style={[
                  styles.resultBox,
                  {
                    flexDirection,
                    backgroundColor: result.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                    borderColor:     result.type === 'success' ? '#A7F3D0' : '#FECACA',
                  },
                ]}
              >
                <Ionicons
                  name={result.type === 'success' ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={result.type === 'success' ? colors.success : colors.error}
                />
                <Text style={[styles.resultText, { color: result.type === 'success' ? colors.success : colors.error, textAlign }]}>
                  {result.message}
                </Text>
              </MotiView>
            )}

            <View style={styles.activateBtnWrap}>
              <PrimaryButton
                label={t(
                  isActive
                    ? 'settings.onlineStoreSubscriptionScreen.renewButton'
                    : 'settings.onlineStoreSubscriptionScreen.activateButton'
                )}
                onPress={handleActivate}
                loading={activating}
                disabled={!code.trim()}
              />
            </View>
          </PremiumCard>

          {/* ── Support ── */}
          <View style={[styles.infoBox, { backgroundColor: colors.softBlue, borderColor: colors.lightBlue }]}>
            <Text style={[styles.infoText, { color: colors.gray600, textAlign }]}>
              {t('settings.onlineStoreSubscriptionScreen.supportMessage')}
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
              style={[styles.supportRow, { flexDirection }]}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={16} color={colors.primary} />
              <LTRNumber style={[styles.supportPhone, { color: colors.primary }]}>
                {SUPPORT_PHONE}
              </LTRNumber>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
    fontSize: 14, fontWeight: '800', color: '#fff',
  },
  heroPlan: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2,
  },
  heroExpiry: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4, minHeight: 16 },
  heroRemaining: { fontSize: 12, fontWeight: '700', color: '#fff', marginTop: 2 },

  noticeBox: {
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 12,
    marginBottom: 12,
  },
  noticeText: { flex: 1, fontSize: 12.5, fontWeight: '600', lineHeight: 18 },

  card:      { marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardSub:   { fontSize: 12, lineHeight: 17, marginBottom: 14 },

  deviceIdText: {
    fontSize: 15, fontWeight: '700', letterSpacing: 0.5,
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14,
  },

  codeInput: { minHeight: 76, paddingTop: 12, textAlignVertical: 'top' },

  resultBox: {
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 12,
    marginTop: -2, marginBottom: 4,
  },
  resultText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },

  activateBtnWrap: { marginTop: 14 },

  infoBox: {
    borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 4, gap: 10,
  },
  infoText: { fontSize: 12.5, lineHeight: 18 },
  supportRow: { alignItems: 'center', gap: 8 },
  supportPhone: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
});
