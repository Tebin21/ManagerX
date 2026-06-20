import React, { useCallback, useEffect, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, Linking,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/common/AppHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { LTRNumber } from '@/components/ui/LTRNumber';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLicenseStore } from '@/store/licenseStore';
import { getInventoryStats } from '@/lib/sqlite';
import { SUPPORT_PHONE } from '@/constants/config';
import { useRTL } from '@/lib/rtl';

const PLAN_LABEL_KEYS: Record<string, string> = {
  basic: 'settings.upgradeScreen.planBasic',
  plus: 'settings.upgradeScreen.planPlus',
  pro: 'settings.upgradeScreen.planPro',
  business: 'settings.upgradeScreen.planBusiness',
  unlimited: 'settings.upgradeScreen.planUnlimited',
};

type ResultState = { type: 'success' | 'error'; message: string } | null;

export default function PlanLimitsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { textAlign, flexDirection } = useRTL();

  const plan        = useLicenseStore((s) => s.plan);
  const limit       = useLicenseStore((s) => s.limit);
  const deviceId    = useLicenseStore((s) => s.deviceId);
  const activate    = useLicenseStore((s) => s.activate);

  const [used, setUsed]           = useState(0);
  const [code, setCode]           = useState('');
  const [activating, setActivating] = useState(false);
  const [result, setResult]       = useState<ResultState>(null);

  const loadUsed = useCallback(async () => {
    try {
      const stats = await getInventoryStats();
      setUsed(stats.totalProducts);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { loadUsed(); }, [loadUsed]);

  const planLabel = t(PLAN_LABEL_KEYS[plan] ?? PLAN_LABEL_KEYS.basic);
  const isUnlimited = !Number.isFinite(limit);
  const usedPct = isUnlimited ? 0 : limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const limitLabel = isUnlimited
    ? t('settings.upgradeScreen.limitUnlimited')
    : t('settings.upgradeScreen.limitValue', { limit });
  const usedLabel = isUnlimited
    ? t('settings.upgradeScreen.usedLabelUnlimited', { used })
    : t('settings.upgradeScreen.usedLabel', { used, limit });

  async function handleActivate() {
    if (!code.trim() || activating) return;
    setActivating(true);
    setResult(null);
    try {
      const res = await activate(code);
      if (res.status === 'activated') {
        setResult({ type: 'success', message: t('settings.upgradeScreen.activated', { limit: res.limit }) });
        setCode('');
        await loadUsed();
      } else if (res.status === 'already_activated') {
        setResult({ type: 'error', message: t('settings.upgradeScreen.alreadyActivated') });
      } else if (res.status === 'wrong_device') {
        setResult({ type: 'error', message: t('settings.upgradeScreen.wrongDevice') });
      } else if (res.status === 'no_upgrade') {
        setResult({ type: 'error', message: t('settings.upgradeScreen.noUpgrade') });
      } else {
        setResult({ type: 'error', message: t('settings.upgradeScreen.invalidCode') });
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
        <AppHeader title={t('settings.upgradeScreen.title')} showBack />

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Current plan / usage ── */}
          <LinearGradient
            colors={[colors.primaryDark, colors.primary]}
            style={styles.heroCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={styles.heroPlan}>{planLabel}</Text>
            <Text style={styles.heroLimit}>{limitLabel}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${usedPct}%` }]} />
            </View>
            <Text style={styles.heroUsed}>{usedLabel}</Text>
          </LinearGradient>

          {/* ── Device ID ── */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.black, textAlign }]}>
              {t('settings.upgradeScreen.deviceIdTitle')}
            </Text>
            <Text style={[styles.cardSub, { color: colors.gray400, textAlign }]}>
              {t('settings.upgradeScreen.deviceIdHint')}
            </Text>
            <LTRNumber selectable style={[styles.deviceIdText, { color: colors.black, backgroundColor: colors.gray50 }]}>
              {deviceId ?? '...'}
            </LTRNumber>
          </PremiumCard>

          {/* ── Activation ── */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.black, textAlign }]}>
              {t('settings.upgradeScreen.activateTitle')}
            </Text>
            <Text style={[styles.cardSub, { color: colors.gray400, textAlign }]}>
              {t('settings.upgradeScreen.activateHint')}
            </Text>

            <AppTextInput
              label={t('settings.upgradeScreen.codeLabel')}
              placeholder={t('settings.upgradeScreen.codePlaceholder')}
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
                label={t('settings.upgradeScreen.activateButton')}
                onPress={handleActivate}
                loading={activating}
                disabled={!code.trim()}
              />
            </View>
          </PremiumCard>

          {/* ── Support ── */}
          <View style={[styles.infoBox, { backgroundColor: colors.softBlue, borderColor: colors.lightBlue }]}>
            <Text style={[styles.infoText, { color: colors.gray600, textAlign }]}>
              {t('settings.upgradeScreen.supportMessage')}
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
  heroPlan: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  heroLimit: { fontSize: 30, fontWeight: '800', color: '#fff', marginTop: 2 },
  progressTrack: {
    width: '100%', height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 10,
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#fff' },
  heroUsed: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

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
