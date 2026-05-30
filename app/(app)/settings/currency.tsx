import React, { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/common/AppHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { getExchangeRateHistory } from '@/lib/sqlite';
import type { ExchangeRateEntry } from '@/lib/sqlite';
import { Colors } from '@/constants/colors';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtRate(rate: number): string {
  return rate.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function CurrencyScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const exchangeRate   = useSettingsStore((s) => s.exchangeRate);
  const rateUpdatedAt  = useSettingsStore((s) => s.rateUpdatedAt);
  const setExchangeRate = useSettingsStore((s) => s.setExchangeRate);

  const [input, setInput]     = useState(String(exchangeRate));
  const [saving, setSaving]   = useState(false);
  const [history, setHistory] = useState<ExchangeRateEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const rows = await getExchangeRateHistory(15);
      setHistory(rows);
    } catch { /* non-critical */ }
    finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handleSave() {
    const parsed = parseFloat(input.replace(/,/g, ''));
    if (isNaN(parsed) || parsed < 100 || parsed > 99999) {
      Alert.alert(t('common.error'), t('settings.currencyScreen.invalidRate'));
      return;
    }
    if (parsed === exchangeRate) {
      Alert.alert(t('common.error'), t('settings.currencyScreen.noChange'));
      return;
    }
    setSaving(true);
    try {
      await setExchangeRate(parsed);
      await loadHistory();
      Alert.alert(t('settings.currencyScreen.title'), t('settings.currencyScreen.rateUpdated', { rate: fmtRate(parsed) }));
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  }

  const inputChanged = parseFloat(input.replace(/,/g, '')) !== exchangeRate;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('settings.currencyScreen.title')} showBack />

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Current rate display ── */}
          <LinearGradient
            colors={[Colors.primaryDark, Colors.primary]}
            style={styles.rateCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={styles.rateLabel}>{t('settings.currencyScreen.currentRate')}</Text>
            <Text style={styles.rateValue}>
              1 USD = {fmtRate(exchangeRate)} IQD
            </Text>
            {rateUpdatedAt ? (
              <Text style={styles.rateUpdated}>
                {formatDate(rateUpdatedAt)}
              </Text>
            ) : (
              <Text style={styles.rateUpdated}>{t('settings.currencyScreen.defaultRate')}</Text>
            )}
          </LinearGradient>

          {/* ── Edit rate ── */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.black }]}>{t('settings.currencyScreen.updateRate')}</Text>
            <Text style={[styles.cardSub, { color: colors.gray400 }]}>
              {t('settings.currencyScreen.updateSub')}
            </Text>

            <View style={[styles.inputRow, { borderColor: colors.gray200, backgroundColor: colors.gray50 }]}>
              <Text style={[styles.inputPrefix, { color: colors.primary, backgroundColor: colors.softBlue }]}>
                {t('settings.currencyScreen.inputPrefix')}
              </Text>
              <TextInput
                style={[styles.inputField, { color: colors.black }]}
                value={input}
                onChangeText={setInput}
                keyboardType="number-pad"
                placeholder="e.g. 1500"
                placeholderTextColor={colors.gray400}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              <Text style={[styles.inputSuffix, { color: colors.gray500 }]}>{t('settings.currencyScreen.inputSuffix')}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: inputChanged ? Colors.primary : colors.gray200 },
              ]}
              onPress={handleSave}
              disabled={saving || !inputChanged}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={inputChanged ? '#fff' : colors.gray400} />
                  <Text style={[styles.saveBtnText, { color: inputChanged ? '#fff' : colors.gray400 }]}>
                    {t('settings.currencyScreen.saveRate')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </PremiumCard>

          {/* ── Rate history ── */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.black }]}>{t('settings.currencyScreen.rateHistory')}</Text>

            {loadingHistory ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
            ) : history.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.gray400 }]}>{t('settings.currencyScreen.noHistory')}</Text>
            ) : (
              history.map((entry, i) => (
                <View
                  key={entry.id}
                  style={[
                    styles.historyRow,
                    { borderBottomColor: colors.gray100 },
                    i === history.length - 1 && styles.historyRowLast,
                  ]}
                >
                  <View style={[styles.historyDot, { backgroundColor: i === 0 ? Colors.primary : colors.gray300 }]} />
                  <View style={styles.historyContent}>
                    <Text style={[styles.historyRate, { color: colors.black }]}>
                      1 USD = {fmtRate(entry.rate)} IQD
                    </Text>
                    <Text style={[styles.historyDate, { color: colors.gray400 }]}>
                      {formatDate(entry.createdAt)}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </Text>
                  </View>
                  {i === 0 && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>{t('settings.currencyScreen.current')}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </PremiumCard>

          {/* ── Info note ── */}
          <View style={[styles.infoBox, { backgroundColor: colors.softBlue, borderColor: colors.lightBlue }]}>
            <Ionicons name="information-circle" size={16} color={Colors.primary} />
            <Text style={[styles.infoText, { color: colors.gray600 }]}>
              {t('settings.currencyScreen.infoNote')}
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  gradHeader: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  body:       { padding: 16, paddingTop: 12 },

  rateCard: {
    borderRadius: 18,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    gap: 6,
  },
  rateLabel:   { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.5 },
  rateValue:   { fontSize: 28, fontWeight: '800', color: '#fff' },
  rateUpdated: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },

  card:      { marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardSub:   { fontSize: 12, lineHeight: 17, marginBottom: 14 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  inputPrefix: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignSelf: 'stretch',
    textAlignVertical: 'center',
  },
  inputField: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  inputSuffix: {
    fontSize: 13,
    fontWeight: '600',
    paddingRight: 14,
  },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700' },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  historyRowLast: { borderBottomWidth: 0 },
  historyDot:     { width: 8, height: 8, borderRadius: 4 },
  historyContent: { flex: 1 },
  historyRate:    { fontSize: 14, fontWeight: '600' },
  historyDate:    { fontSize: 11, marginTop: 1 },

  currentBadge: {
    backgroundColor: Colors.primary + '20',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },

  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
