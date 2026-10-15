import React, { useState, useEffect, useCallback } from 'react';
import {
  View, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { KeyboardAwareScrollView, useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsBackground } from '@/components/settings/SettingsBackground';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettingsStore, BaseCurrency } from '@/store/settingsStore';
import { getExchangeRateHistory } from '@/lib/sqlite';
import type { ExchangeRateEntry } from '@/lib/sqlite';
import { fmtExchangeRate, formatDateTimeUI } from '@/utils/formatters';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish } from '@/lib/settingsFont';
import { CurrencyLargeToggleSwitch } from '@/components/settings/CurrencyLargeToggleSwitch';
import { CurrencySwitchConfirmModal } from '@/components/settings/CurrencySwitchConfirmModal';
import { CurrencyInfoGuideModal } from '@/components/settings/CurrencyInfoGuideModal';
import { hexToRgba } from '@/lib/colorUtils';

export default function CurrencyScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL } = useRTL();
  const textAlign = isRTL ? 'right' : 'left';
  const scrollIntoView = useKeyboardAwareFocus();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  const exchangeRate   = useSettingsStore((s) => s.exchangeRate);
  const rateUpdatedAt  = useSettingsStore((s) => s.rateUpdatedAt);
  const setExchangeRate = useSettingsStore((s) => s.setExchangeRate);
  const baseCurrency   = useSettingsStore((s) => s.baseCurrency);
  const setBaseCurrency= useSettingsStore((s) => s.setBaseCurrency);

  const [input, setInput]     = useState(String(exchangeRate * 100));
  const [saving, setSaving]   = useState(false);
  const [history, setHistory] = useState<ExchangeRateEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Modals state
  const [showGuideModal, setShowGuideModal]       = useState(false);
  const [showConfirmModal, setShowConfirmModal]   = useState(false);
  const [pendingCurrency, setPendingCurrency]     = useState<BaseCurrency>('USD');

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
    if (isNaN(parsed) || parsed < 10000 || parsed > 9999900) {
      Alert.alert(t('common.error'), t('settings.currencyScreen.invalidRate'));
      return;
    }
    const rateToStore = parsed / 100;
    if (rateToStore === exchangeRate) {
      Alert.alert(t('common.error'), t('settings.currencyScreen.noChange'));
      return;
    }
    setSaving(true);
    try {
      await setExchangeRate(rateToStore);
      await loadHistory();
      Alert.alert(t('settings.currencyScreen.title'), t('settings.currencyScreen.rateUpdated', { rate: fmtExchangeRate(rateToStore) }));
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  }

  const handleToggleRequest = (target: BaseCurrency) => {
    setPendingCurrency(target);
    setShowConfirmModal(true);
  };

  const handleConfirmSwitch = () => {
    setBaseCurrency(pendingCurrency);
    setShowConfirmModal(false);
  };

  const inputChanged = parseFloat(input.replace(/,/g, '')) / 100 !== exchangeRate;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <SettingsBackground />
        
        {/* Header with info guide button on the corner */}
        <AppHeader
          title={t('settings.currencyScreen.title')}
          showBack
          rightAction={
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowGuideModal(true)}
              style={styles.headerInfoBtn}
            >
              <Ionicons name="information-circle" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          }
        />

        <KeyboardAwareScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Info Guide Banner Trigger Button ── */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowGuideModal(true)}
            style={[
              styles.guideBanner,
              {
                backgroundColor: isDark ? hexToRgba(colors.primary, 0.12) : hexToRgba(colors.primary, 0.08),
                borderColor: isDark ? hexToRgba(colors.primary, 0.35) : hexToRgba(colors.primary, 0.25),
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={[styles.guideBannerIconWrap, { backgroundColor: hexToRgba(colors.primary, isDark ? 0.20 : 0.14) }]}>
              <Ionicons name="help-buoy" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.guideBannerText, { color: colors.black, textAlign }]}>
              ڕێبەری تەواوی گۆڕینی دراو و حیسابات بخوێنەرەوە
            </Text>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={16}
              color={colors.primary}
            />
          </TouchableOpacity>

          {/* ── Base Currency Toggle Switch Card ── */}
          <SettingsCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.black, textAlign }]}>
              دراوی بنەڕەتی سیستەم (Base Currency)
            </Text>
            <Text style={[styles.cardSub, { color: colors.gray400, textAlign }]}>
              دراوی سەرەکی هەڵبژێرە بۆ پیشاندان و تەواوی حیساباتی فرۆشگا و پسوولەکان
            </Text>

            <CurrencyLargeToggleSwitch
              value={baseCurrency}
              onToggle={handleToggleRequest}
            />

            <View style={[styles.currencyStatusPill, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
              <View style={[styles.statusDot, { backgroundColor: baseCurrency === 'USD' ? '#16A34A' : '#D97706' }]} />
              <Text style={[styles.currencyStatusText, { color: colors.black }]}>
                {baseCurrency === 'USD'
                  ? 'سیستەم ئێستا لەسەر دۆلاری ئەمریکی ($) چالاکە'
                  : 'سیستەم ئێستا لەسەر دیناری عێراقی (د.ع) چالاکە'}
              </Text>
            </View>
          </SettingsCard>

          {/* ── Current rate display ── */}
          <LinearGradient
            colors={[colors.primaryDark, colors.primary]}
            style={Platform.OS === 'ios' ? [styles.rateCard, styles.rateCardGlass] : styles.rateCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            {Platform.OS === 'ios' && (
              <LinearGradient
                colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.15)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
            )}
            <Text style={styles.rateLabel}>{t('settings.currencyScreen.currentRate')}</Text>
            <Text
              style={styles.rateValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              100 USD = {fmtExchangeRate(exchangeRate)} IQD
            </Text>
            {rateUpdatedAt ? (
              <Text style={styles.rateUpdated}>
                {formatDateTimeUI(rateUpdatedAt)}
              </Text>
            ) : (
              <Text style={styles.rateUpdated}>{t('settings.currencyScreen.defaultRate')}</Text>
            )}
          </LinearGradient>

          {/* ── Edit rate ── */}
          <SettingsCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.black, textAlign }]}>{t('settings.currencyScreen.updateRate')}</Text>
            <Text style={[styles.cardSub, { color: colors.gray400, textAlign }]}>
              {t('settings.currencyScreen.updateSub')}
            </Text>

            <View style={[
              styles.inputRow,
              Platform.OS === 'ios'
                ? {
                    borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.60)',
                  }
                : { borderColor: colors.gray200, backgroundColor: colors.gray50 },
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}>
              <Text style={[styles.inputPrefix, { color: colors.primary, backgroundColor: colors.softBlue }]}>
                {t('settings.currencyScreen.inputPrefix')}
              </Text>
              <TextInput
                style={[
                  styles.inputField,
                  { color: colors.black, textAlign: isRTL ? 'right' : 'left' },
                  isKuLanguage && applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: input, keyboardType: 'number-pad' }), {}),
                ]}
                value={input}
                onChangeText={(text) => {
                  const raw = text.replace(/[^0-9]/g, '');
                  setInput(raw ? parseInt(raw, 10).toLocaleString('en-US') : '');
                }}
                keyboardType="number-pad"
                placeholder="e.g. 150,000"
                placeholderTextColor={colors.gray400}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                onFocus={scrollIntoView}
              />
              <Text style={[styles.inputSuffix, { color: colors.gray500 }]}>{t('settings.currencyScreen.inputSuffix')}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: inputChanged ? colors.primary : colors.gray200, flexDirection: isRTL ? 'row-reverse' : 'row' },
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
          </SettingsCard>

          {/* ── Rate history ── */}
          <SettingsCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.black, textAlign }]}>{t('settings.currencyScreen.rateHistory')}</Text>

            {loadingHistory ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
            ) : history.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.gray400 }]}>{t('settings.currencyScreen.noHistory')}</Text>
            ) : (
              history.map((entry, i) => (
                <View
                  key={entry.id}
                  style={[
                    styles.historyRow,
                    { borderBottomColor: colors.gray100, flexDirection: isRTL ? 'row-reverse' : 'row' },
                    i === history.length - 1 && styles.historyRowLast,
                  ]}
                >
                  <View style={[styles.historyDot, { backgroundColor: i === 0 ? colors.primary : colors.gray300 }]} />
                  <View style={styles.historyContent}>
                    <Text style={[styles.historyRate, { color: colors.black, textAlign }]}>
                      100 USD = {fmtExchangeRate(entry.rate)} IQD
                    </Text>
                    <Text style={[styles.historyDate, { color: colors.gray400, textAlign }]}>
                      {formatDateTimeUI(entry.createdAt)}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </Text>
                  </View>
                  {i === 0 && (
                    <View style={[styles.currentBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.currentBadgeText, { color: colors.primary }]}>{t('settings.currencyScreen.current')}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </SettingsCard>

          <View style={{ height: 40 }} />
        </KeyboardAwareScrollView>

        {/* ── Confirmation Modal when switching Base Currency ── */}
        <CurrencySwitchConfirmModal
          visible={showConfirmModal}
          targetCurrency={pendingCurrency}
          currentRate={exchangeRate}
          onConfirm={handleConfirmSwitch}
          onCancel={() => setShowConfirmModal(false)}
        />

        {/* ── Full Informational Guide Modal ── */}
        <CurrencyInfoGuideModal
          visible={showGuideModal}
          onClose={() => setShowGuideModal(false)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  body:       { padding: 16, paddingTop: 12 },

  headerInfoBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  guideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  guideBannerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },

  currencyStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  currencyStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  rateCard: {
    borderRadius: 18,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  rateCardGlass: {
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.40)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
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
    paddingHorizontal: 14,
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
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentBadgeText: { fontSize: 10, fontWeight: '700' },

  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
});
