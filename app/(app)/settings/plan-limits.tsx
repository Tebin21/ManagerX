import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingsBackground } from '@/components/settings/SettingsBackground';
import { SettingsTextInput as AppTextInput } from '@/components/settings/SettingsTextInput';
import { AppleSubscriptionPaywall } from '@/components/settings/AppleSubscriptionPaywall';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLicenseStore } from '@/store/licenseStore';
import { useManagementStore } from '@/store/managementStore';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { getInventoryStats } from '@/lib/sqlite';
import { useRTL } from '@/lib/rtl';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT_REGULAR } from '@/lib/settingsFont';
import * as Haptics from 'expo-haptics';

type ResultState = { type: 'success' | 'error'; message: string } | null;

export default function PlanLimitsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { isRTL } = useRTL();
  const isKu = useLanguageStore((s) => s.language === 'ku');

  // Stores
  const currentUserAccount = useManagementStore((s) => s.currentUserAccount);
  const user = useAuthStore((s) => s.user);

  const plan = useLicenseStore((s) => s.plan);
  const licenseLimit = useLicenseStore((s) => s.limit);
  const licenseExpiresAt = useLicenseStore((s) => s.expiresAt);
  const activate = useLicenseStore((s) => s.activate);

  const [usedProducts, setUsedProducts] = useState(0);
  const [usedQuantity, setUsedQuantity] = useState(0);
  const [code, setCode] = useState('');
  const [activating, setActivating] = useState(false);
  const [result, setResult] = useState<ResultState>(null);
  const [showAppleIAP, setShowAppleIAP] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const stats = await getInventoryStats();
      setUsedProducts(stats.totalProducts || 0);
      setUsedQuantity(stats.totalQuantity || 0);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Determine active subscription & limits
  const upgradeReceipt = currentUserAccount?.upgradeReceipt;
  const cloudExpiresAt = currentUserAccount?.expiresAt || upgradeReceipt?.expiresAt;
  const effectiveExpiresAt = cloudExpiresAt || licenseExpiresAt;

  const limits = currentUserAccount?.limits || upgradeReceipt?.limits;
  const isOnlineStoreEnabled =
    currentUserAccount?.onlineStore?.enabled ??
    upgradeReceipt?.storeEnabled ??
    false;

  // Max limits
  const maxItems = limits?.maxItems ?? (Number.isFinite(licenseLimit) ? licenseLimit : 'unlimited');
  const maxQuantity = limits?.maxQuantity ?? 'unlimited';
  const maxSales = limits?.maxSales ?? 'unlimited';
  const maxInvoices = limits?.maxInvoices ?? 'unlimited';
  const maxQuotations = limits?.maxQuotations ?? 'unlimited';

  // Calculate Time Remaining
  let isUnlimitedDuration = false;
  let remainingDays = 0;
  let remainingHours = 0;
  let isExpired = false;
  let durationBadgeText = '';

  if (!effectiveExpiresAt || effectiveExpiresAt === 'unlimited' || effectiveExpiresAt === 'never') {
    isUnlimitedDuration = true;
    durationBadgeText = isKu ? 'بێ سنوور (هەمیشەیی)' : 'Unlimited (Lifetime)';
  } else {
    try {
      const expDate = new Date(effectiveExpiresAt);
      const diffMs = expDate.getTime() - Date.now();
      if (diffMs <= 0) {
        isExpired = true;
        durationBadgeText = isKu ? 'بەسەرچووە' : 'Expired';
      } else {
        remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        remainingHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (remainingDays > 0) {
          durationBadgeText = isKu ? `${remainingDays} ڕۆژ ماوە` : `${remainingDays} days left`;
        } else {
          durationBadgeText = isKu ? `${remainingHours} کاتژمێر ماوە` : `${remainingHours}h left`;
        }
      }
    } catch {
      isUnlimitedDuration = true;
      durationBadgeText = isKu ? 'بێ سنوور' : 'Unlimited';
    }
  }

  const formatLimit = (val: number | string | undefined) => {
    if (!val || val === 'unlimited') return isKu ? 'بێ سنوور' : 'Unlimited';
    return Number(val).toLocaleString();
  };

  const formattedExpiryDate = effectiveExpiresAt && !isUnlimitedDuration
    ? new Date(effectiveExpiresAt).toLocaleDateString(isKu ? 'ar-EG' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : isKu ? 'هەمیشەیی' : 'Lifetime';

  const planName = upgradeReceipt?.planDuration
    ? `${upgradeReceipt.planDuration}`
    : isUnlimitedDuration
    ? (isKu ? 'پلانی بێ سنوور (Lifetime Pro)' : 'Unlimited Lifetime Pro')
    : (isKu ? 'پلانی بەشداریکردن' : 'Active Plan');

  const handleActivate = async () => {
    if (!code.trim() || activating) return;
    setActivating(true);
    setResult(null);
    try {
      const res = await activate(code.trim());
      if (res.status === 'activated') {
        setResult({
          type: 'success',
          message: isKu ? 'کۆدەکە بە سەرکەوتوویی کارا کرا!' : 'Code activated successfully!',
        });
        setCode('');
        await loadStats();
      } else if (res.status === 'already_activated') {
        setResult({
          type: 'error',
          message: isKu ? 'ئەم کۆدە پێشتر بەکارهێنراوە.' : 'This code has already been activated.',
        });
      } else if (res.status === 'expired') {
        setResult({
          type: 'error',
          message: isKu ? 'ئەم کۆدە بەسەرچووە.' : 'This activation code has expired.',
        });
      } else {
        setResult({
          type: 'error',
          message: isKu ? 'کۆدی کاراکردن نادروستە.' : 'Invalid activation code.',
        });
      }
    } catch {
      setResult({
        type: 'error',
        message: isKu ? 'هەڵەیەک ڕوویدا لە کاراکردندا.' : 'Failed to activate code.',
      });
    } finally {
      setActivating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0B111E' : '#F8FAFC' }]}>
      <SettingsBackground />
      <AppHeader
        title={isKu ? 'پلانی بەشداریکردن و سنوورەکان' : 'Subscription & Limits'}
        showBack
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Account & Time Left Card */}
          <LinearGradient
            colors={isDark ? ['#1E293B', '#0F172A'] : ['#FFFFFF', '#F1F5F9']}
            style={[
              styles.mainCard,
              {
                borderColor: isExpired
                  ? 'rgba(239, 68, 68, 0.4)'
                  : isDark ? 'rgba(212, 175, 55, 0.35)' : '#E2E8F0',
              },
            ]}
          >
            {/* Top row: Plan Title & Status Badge */}
            <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.planTitleBox}>
                <View style={[styles.sparkleWrap, { backgroundColor: isExpired ? 'rgba(239,68,68,0.15)' : 'rgba(212, 175, 55, 0.15)' }]}>
                  <Ionicons
                    name={isExpired ? 'alert-circle' : 'ribbon'}
                    size={22}
                    color={isExpired ? '#EF4444' : '#D4AF37'}
                  />
                </View>
                <View style={{ marginHorizontal: 10 }}>
                  <Text style={[styles.planTitleText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {planName}
                  </Text>
                  <Text style={styles.planSubText}>
                    {user?.email || currentUserAccount?.email || (isKu ? 'ئەکاونتی تۆمارکراو' : 'Registered Account')}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isExpired
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(16, 185, 129, 0.15)',
                    borderColor: isExpired ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isExpired ? '#EF4444' : '#10B981' },
                  ]}
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: isExpired ? '#EF4444' : '#10B981' },
                  ]}
                >
                  {isExpired ? (isKu ? 'بەسەرچووە' : 'Expired') : (isKu ? 'چالاکە' : 'Active')}
                </Text>
              </View>
            </View>

            {/* Time Left Highlight Banner */}
            <View
              style={[
                styles.timeRemainingBox,
                {
                  backgroundColor: isExpired
                    ? 'rgba(239, 68, 68, 0.08)'
                    : isDark ? 'rgba(212, 175, 55, 0.08)' : '#FEF9C3',
                  borderColor: isExpired
                    ? 'rgba(239, 68, 68, 0.2)'
                    : isDark ? 'rgba(212, 175, 55, 0.25)' : '#FDE047',
                },
              ]}
            >
              <View style={[styles.timeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name={isUnlimitedDuration ? 'infinite' : 'hourglass-outline'}
                  size={24}
                  color={isExpired ? '#EF4444' : '#D4AF37'}
                />
                <View style={{ marginHorizontal: 12, flex: 1 }}>
                  <Text style={styles.timeLabel}>
                    {isKu ? 'کاتی ماوەی بەشداریکردن:' : 'Remaining Subscription Time:'}
                  </Text>
                  <Text
                    style={[
                      styles.timeValueText,
                      { color: isExpired ? '#EF4444' : isDark ? '#F1F5F9' : '#0F172A' },
                    ]}
                  >
                    {durationBadgeText}
                  </Text>
                </View>
              </View>

              <View style={[styles.expiryMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.expiryMetaText}>
                  {isKu ? 'کاتی بەسەرچوون:' : 'Expires On:'} {formattedExpiryDate}
                </Text>
                {upgradeReceipt?.upgradedAt && (
                  <Text style={styles.expiryMetaText}>
                    {isKu ? 'دەستپێک:' : 'Started:'}{' '}
                    {new Date(upgradeReceipt.upgradedAt).toLocaleDateString('en-GB')}
                  </Text>
                )}
              </View>
            </View>
          </LinearGradient>

          {/* Section: Usage Limits (سنوورەکانی بەکارهێنان) */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="speedometer-outline" size={18} color="#D4AF37" />
            <Text style={[styles.sectionHeaderText, { color: isDark ? '#E2E8F0' : '#1E293B', marginHorizontal: 8 }]}>
              {isKu ? 'سنوورەکانی بەکارهێنان (Usage Limits)' : 'Usage Limits'}
            </Text>
          </View>

          <View style={[styles.limitsGrid, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            {/* Limit Item: Products (کالاکان) */}
            <View style={styles.limitRow}>
              <View style={[styles.limitIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Ionicons name="cube-outline" size={18} color="#3B82F6" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={[styles.limitName, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                  {isKu ? 'ژمارەی کاڵاکان (تایتم)' : 'Total Products (Items)'}
                </Text>
                <Text style={styles.limitSub}>
                  {isKu
                    ? `بەکارهێنراو: ${usedProducts.toLocaleString()} دانە`
                    : `Currently used: ${usedProducts.toLocaleString()}`}
                </Text>
              </View>
              <View style={styles.limitValueBadge}>
                <Text style={styles.limitValueText}>{formatLimit(maxItems)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Limit Item: Total Stock Quantity (زۆرترین بڕ) */}
            <View style={styles.limitRow}>
              <View style={[styles.limitIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="layers-outline" size={18} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={[styles.limitName, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                  {isKu ? 'زۆرترین بڕی عەمبار (Quantity)' : 'Total Stock Quantity'}
                </Text>
                <Text style={styles.limitSub}>
                  {isKu
                    ? `کۆی گشتی ناو مەخزەن: ${usedQuantity.toLocaleString()}`
                    : `Total in warehouse: ${usedQuantity.toLocaleString()}`}
                </Text>
              </View>
              <View style={styles.limitValueBadge}>
                <Text style={styles.limitValueText}>{formatLimit(maxQuantity)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Limit Item: Sales (فرۆشتن) */}
            <View style={styles.limitRow}>
              <View style={[styles.limitIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="cart-outline" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={[styles.limitName, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                  {isKu ? 'تۆمارکردنی فرۆشتن (Sales)' : 'Sales Transactions'}
                </Text>
                <Text style={styles.limitSub}>
                  {isKu ? 'سنووری ئەنجامدانی پسولەی فرۆش' : 'Allowed sales records'}
                </Text>
              </View>
              <View style={styles.limitValueBadge}>
                <Text style={styles.limitValueText}>{formatLimit(maxSales)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Limit Item: Printed Invoices (وەسڵی چاپ) */}
            <View style={styles.limitRow}>
              <View style={[styles.limitIconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Ionicons name="print-outline" size={18} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={[styles.limitName, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                  {isKu ? 'چاپکردنی وەسڵ (Invoices)' : 'Print Receipts / Invoices'}
                </Text>
                <Text style={styles.limitSub}>
                  {isKu ? 'وەسڵی حەراری 80mm و 58mm و A4' : 'Thermal & PDF receipt outputs'}
                </Text>
              </View>
              <View style={styles.limitValueBadge}>
                <Text style={styles.limitValueText}>{formatLimit(maxInvoices)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Limit Item: Quotations (عەرز و ئۆفەر) */}
            <View style={styles.limitRow}>
              <View style={[styles.limitIconWrap, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                <Ionicons name="document-text-outline" size={18} color="#EC4899" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={[styles.limitName, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                  {isKu ? 'عەرز و ئۆفەری نرخ (Quotations)' : 'Quotations & Price Offers'}
                </Text>
                <Text style={styles.limitSub}>
                  {isKu ? 'دروستکردن و هاوبەشکردنی عەرزی نرخ' : 'Create & share price offers'}
                </Text>
              </View>
              <View style={styles.limitValueBadge}>
                <Text style={styles.limitValueText}>{formatLimit(maxQuotations)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Online Store status */}
            <View style={styles.limitRow}>
              <View style={[styles.limitIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="globe-outline" size={18} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={[styles.limitName, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                  {isKu ? 'ستۆری ئۆنلاین (Online Store)' : 'Online Storefront'}
                </Text>
                <Text style={styles.limitSub}>
                  {isKu ? 'بەستنەوە بە فرۆشگای ئۆنلاین' : 'Cloud storefront connection'}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: isOnlineStoreEnabled
                      ? 'rgba(16, 185, 129, 0.18)'
                      : 'rgba(148, 163, 184, 0.18)',
                  },
                ]}
              >
                <Ionicons
                  name={isOnlineStoreEnabled ? 'checkmark-circle' : 'lock-closed'}
                  size={14}
                  color={isOnlineStoreEnabled ? '#10B981' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    { color: isOnlineStoreEnabled ? '#10B981' : '#94A3B8', marginStart: 4 },
                  ]}
                >
                  {isOnlineStoreEnabled
                    ? (isKu ? 'چالاککراوە' : 'Enabled')
                    : (isKu ? 'ناچالاکە' : 'Disabled')}
                </Text>
              </View>
            </View>
          </View>

          {/* Activation Code Box (کۆدی کاراکردنی فەرمی) */}
          <View style={[styles.activationCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={[styles.activationHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="key-outline" size={18} color="#D4AF37" />
              <Text style={[styles.activationTitle, { color: isDark ? '#FFFFFF' : '#0F172A', marginHorizontal: 8 }]}>
                {isKu ? 'کاراکردن بە کۆد (Activation Code)' : 'Activate with License Key'}
              </Text>
            </View>
            <Text style={styles.activationDesc}>
              {isKu
                ? 'ئەگەر کۆدی بەشداریکردنی فەرمیت هەیە، لێرەدا دەتوانیت داخڵی بکەیت بۆ چالاککردن:'
                : 'If you have an official activation code, enter it below to activate your plan:'}
            </Text>

            <View style={styles.inputRow}>
              <AppTextInput
                value={code}
                onChangeText={setCode}
                placeholder={isKu ? 'کۆدی کاراکردن (وەک: FROSHIAR-XXXX)' : 'Activation code'}
                placeholderTextColor={colors.gray400}
                autoCapitalize="characters"
                style={styles.inputField}
              />
            </View>

            {result && (
              <View
                style={[
                  styles.resultBox,
                  {
                    backgroundColor: result.type === 'success'
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'rgba(239, 68, 68, 0.12)',
                    borderColor: result.type === 'success' ? '#10B981' : '#EF4444',
                  },
                ]}
              >
                <Ionicons
                  name={result.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={result.type === 'success' ? '#10B981' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.resultText,
                    { color: result.type === 'success' ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {result.message}
                </Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleActivate}
              disabled={activating || !code.trim()}
              style={[
                styles.activateButton,
                {
                  backgroundColor: !code.trim() || activating
                    ? (isDark ? '#334155' : '#E2E8F0')
                    : '#D4AF37',
                },
              ]}
            >
              {activating ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="checkmark-done" size={18} color="#0F172A" />
                  <Text style={styles.activateButtonText}>
                    {isKu ? 'کاراکردنی پلان' : 'Activate Plan'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* iOS In-App Purchase Options (Toggleable button) */}
          {Platform.OS === 'ios' && (
            <View style={styles.appleSectionWrap}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowAppleIAP((prev) => !prev)}
                style={[
                  styles.appleToggleBtn,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                  <Ionicons name="logo-apple" size={18} color={isDark ? '#FFFFFF' : '#0F172A'} />
                  <Text style={[styles.appleToggleText, { color: isDark ? '#FFFFFF' : '#0F172A', marginHorizontal: 8 }]}>
                    {isKu ? 'نوێکردنەوە لە ڕێگەی Apple In-App Purchase' : 'Apple In-App Purchase Options'}
                  </Text>
                </View>
                <Ionicons
                  name={showAppleIAP ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.gray400}
                />
              </TouchableOpacity>

              {showAppleIAP && (
                <View style={styles.applePaywallContainer}>
                  <AppleSubscriptionPaywall group="pro" />
                </View>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  mainCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sparkleWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planTitleText: {
    fontSize: 18,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  planSubText: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  timeRemainingBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  timeRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
  },
  timeValueText: {
    fontSize: 20,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    marginTop: 2,
  },
  expiryMetaRow: {
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 8,
    marginTop: 4,
  },
  expiryMetaText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  limitsGrid: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  limitIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitName: {
    fontSize: 14,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  limitSub: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    marginTop: 2,
  },
  limitValueBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  limitValueText: {
    fontSize: 13,
    color: '#D4AF37',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 12,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 4,
  },
  activationCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  activationHeader: {
    alignItems: 'center',
    marginBottom: 6,
  },
  activationTitle: {
    fontSize: 15,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  activationDesc: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    marginBottom: 12,
    lineHeight: 18,
  },
  inputRow: {
    marginBottom: 12,
  },
  inputField: {
    fontSize: 14,
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    borderRadius: 12,
  },
  activateButton: {
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activateButtonText: {
    fontSize: 14,
    color: '#0F172A',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    marginStart: 6,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 12.5,
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    marginStart: 8,
    flex: 1,
  },
  appleSectionWrap: {
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  appleToggleBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
  },
  appleToggleText: {
    fontSize: 13.5,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  applePaywallContainer: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
