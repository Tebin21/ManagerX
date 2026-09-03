import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/settings/SettingsText';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useIapStore } from '@/store/iapStore';
import {
  FROSHIAR_PRO_PRODUCTS,
  FROSHIAR_STORE_PRODUCTS,
  EULA_URL,
  PRIVACY_POLICY_URL,
} from '@/lib/iap/iapConfig';
import { openSubscriptionManagement } from '@/lib/iap/iapService';
import { formatDateShort } from '@/utils/formatters';

interface AppleSubscriptionPaywallProps {
  group: 'pro' | 'store';
}

export function AppleSubscriptionPaywall({ group }: AppleSubscriptionPaywallProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();

  const isPurchasing = useIapStore((s) => s.isPurchasing);
  const isRestoring = useIapStore((s) => s.isRestoring);
  const products = useIapStore((s) => s.products);
  const proEntitlement = useIapStore((s) => s.proEntitlement);
  const storeEntitlement = useIapStore((s) => s.storeEntitlement);
  const purchase = useIapStore((s) => s.purchase);
  const restore = useIapStore((s) => s.restore);

  const entitlement = group === 'pro' ? proEntitlement : storeEntitlement;
  const isPro = group === 'pro';

  // Available options
  const defaultSku = isPro ? FROSHIAR_PRO_PRODUCTS.yearly : FROSHIAR_STORE_PRODUCTS.yearly;
  const [selectedSku, setSelectedSku] = useState<string>(defaultSku || (isPro ? FROSHIAR_PRO_PRODUCTS.monthly : ''));

  const subscriptionOptions = isPro
    ? [
        {
          sku: FROSHIAR_PRO_PRODUCTS.monthly,
          durationKey: 'iap.monthly',
          billingKey: 'iap.monthlySub',
          itemLimit: 200,
          isBestValue: false,
          isPopular: false,
        },
        {
          sku: FROSHIAR_PRO_PRODUCTS.sixMonths,
          durationKey: 'iap.sixMonths',
          billingKey: 'iap.sixMonthsSub',
          itemLimit: 400,
          isBestValue: false,
          isPopular: true,
        },
        {
          sku: FROSHIAR_PRO_PRODUCTS.yearly,
          durationKey: 'iap.yearly',
          billingKey: 'iap.yearlySub',
          itemLimit: 1000,
          isBestValue: true,
          isPopular: false,
        },
      ]
    : [
        {
          sku: FROSHIAR_STORE_PRODUCTS.monthly,
          durationKey: 'iap.monthly',
          billingKey: 'iap.monthlySub',
          itemLimit: null,
          isBestValue: false,
          isPopular: false,
        },
        {
          sku: FROSHIAR_STORE_PRODUCTS.sixMonths,
          durationKey: 'iap.sixMonths',
          billingKey: 'iap.sixMonthsSub',
          itemLimit: null,
          isBestValue: false,
          isPopular: true,
        },
        {
          sku: FROSHIAR_STORE_PRODUCTS.yearly,
          durationKey: 'iap.yearly',
          billingKey: 'iap.yearlySub',
          itemLimit: null,
          isBestValue: true,
          isPopular: false,
        },
      ].filter((opt) => Boolean(opt.sku && opt.sku.trim().length > 0));

  const hasConfiguredProducts = subscriptionOptions.length > 0;

  async function handlePurchase() {
    if (!selectedSku) return;
    try {
      await purchase(selectedSku);
    } catch {
      // Error message is stored in useIapStore and handled via listeners
    }
  }

  async function handleRestore() {
    const result = await restore();
    if (!result.success) {
      Alert.alert(t('common.error'), t('iap.restoreError'));
      return;
    }

    const hasActiveNow = isPro ? result.hasPro : result.hasStore;
    if (hasActiveNow) {
      Alert.alert(t('common.success'), t('iap.restoreSuccess'));
    } else {
      Alert.alert(t('iap.restorePurchases'), t('iap.restoreNoActive'));
    }
  }

  function handleOpenLink(url: string) {
    Linking.openURL(url).catch(() => {});
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Badge & Header */}
      <View style={styles.heroSection}>
        <LinearGradient
          colors={
            isPro
              ? [colors.gradientStart, colors.gradientMid]
              : [colors.primary, colors.primaryDark]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <Ionicons
            name={isPro ? 'sparkles' : 'globe'}
            size={36}
            color="#FFFFFF"
          />
        </LinearGradient>

        <Text style={[styles.title, { color: colors.black }]}>
          {isPro ? t('iap.proTitle') : t('iap.storeTitle')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.gray500 }]}>
          {isPro ? t('iap.proSubtitle') : t('iap.storeSubtitle')}
        </Text>
      </View>

      {/* Current Subscription Status */}
      <PremiumCard style={styles.statusCard}>
        <View style={[styles.statusRow, { flexDirection }]}>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: colors.gray500, textAlign }]}>
              {t('settings.account')}
            </Text>
            <Text style={[styles.statusValue, { color: entitlement.isActive ? '#10B981' : colors.black, textAlign }]}>
              {entitlement.isActive ? t('iap.statusActive') : t('iap.statusInactive')}
            </Text>
            {isPro && (
              <Text style={[styles.statusSubInfo, { color: colors.primary, textAlign }]}>
                {entitlement.isActive
                  ? t('iap.activeItemLimit', { limit: proEntitlement.itemLimit.toLocaleString() })
                  : t('iap.freePlanLimit', { limit: proEntitlement.itemLimit.toLocaleString() })}
              </Text>
            )}
            {entitlement.isActive && entitlement.expirationDate && (
              <Text style={[styles.statusExpiry, { color: colors.gray500, textAlign }]}>
                {t('iap.activeUntil', { date: formatDateShort(entitlement.expirationDate) })}
              </Text>
            )}
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: entitlement.isActive ? '#10B98120' : colors.gray200 }]}>
            <Ionicons
              name={entitlement.isActive ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={entitlement.isActive ? '#10B981' : colors.gray500}
            />
          </View>
        </View>
      </PremiumCard>

      {/* Products list or placeholder notice */}
      {hasConfiguredProducts ? (
        <View style={styles.plansSection}>
          <Text style={[styles.sectionTitle, { color: colors.black, textAlign }]}>
            {t('iap.selectPlan')}
          </Text>

          {subscriptionOptions.map((opt) => {
            const isSelected = selectedSku === opt.sku;
            const product = products[opt.sku];
            const displayPrice = product?.displayPrice;

            return (
              <TouchableOpacity
                key={opt.sku}
                activeOpacity={0.85}
                onPress={() => setSelectedSku(opt.sku)}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                    borderColor: isSelected ? colors.primary : colors.gray200,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                {opt.isBestValue && (
                  <View style={[styles.badgeContainer, { backgroundColor: colors.primaryDark }]}>
                    <Text style={styles.badgeText}>{t('iap.bestValue')}</Text>
                  </View>
                )}
                {opt.isPopular && (
                  <View style={[styles.badgeContainer, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>{t('iap.popular')}</Text>
                  </View>
                )}

                <View style={[styles.planRow, { flexDirection }]}>
                  {/* Radio Icon */}
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={isSelected ? colors.primary : colors.gray500}
                    style={isRTL ? { marginLeft: 12 } : { marginRight: 12 }}
                  />

                  {/* Plan details */}
                  <View style={styles.planDetails}>
                    <View style={[styles.planTitleRow, { flexDirection }]}>
                      <Text style={[styles.planTitle, { color: colors.black, textAlign }]}>
                        {t(opt.durationKey)}
                      </Text>
                      {opt.itemLimit !== null && (
                        <View
                          style={[
                            styles.limitBadge,
                            {
                              backgroundColor: isSelected
                                ? colors.primary + '18'
                                : colors.gray200,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.limitBadgeText,
                              { color: isSelected ? colors.primary : colors.gray700 },
                            ]}
                          >
                            {t('iap.itemsLimit', { count: opt.itemLimit })}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.planBilling, { color: colors.gray500, textAlign }]}>
                      {t(opt.billingKey)}
                    </Text>
                  </View>

                  {/* Price */}
                  <View style={styles.priceContainer}>
                    {displayPrice ? (
                      <Text style={[styles.priceText, { color: colors.primary }]}>
                        {displayPrice}
                      </Text>
                    ) : (
                      <ActivityIndicator size="small" color={colors.primary} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Subscribe CTA Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePurchase}
            disabled={isPurchasing || !selectedSku}
            style={[
              styles.subscribeButton,
              {
                backgroundColor: colors.primary,
                opacity: isPurchasing ? 0.7 : 1,
              },
            ]}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.subscribeButtonText}>
                {t('iap.subscribeNow')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <PremiumCard style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={28} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.gray500, textAlign }]}>
            {t('iap.storeComingSoonNotice')}
          </Text>
        </PremiumCard>
      )}

      {/* Secondary Actions: Restore Purchases & Manage Subscriptions */}
      <View style={styles.secondaryActions}>
        <TouchableOpacity
          onPress={handleRestore}
          disabled={isRestoring}
          style={[styles.secondaryButton, { borderColor: colors.gray200, flexDirection }]}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color={colors.black} />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={18} color={colors.black} />
              <Text style={[styles.secondaryButtonText, { color: colors.black }]}>
                {t('iap.restorePurchases')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={openSubscriptionManagement}
          style={[styles.secondaryButton, { borderColor: colors.gray200, flexDirection }]}
        >
          <Ionicons name="settings-outline" size={18} color={colors.black} />
          <Text style={[styles.secondaryButtonText, { color: colors.black }]}>
            {t('iap.manageSubscriptions')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Apple App Store Review Mandatory Disclosures */}
      <View style={styles.legalSection}>
        <Text style={[styles.disclosureText, { color: colors.gray500, textAlign }]}>
          {t('iap.termsDisclosure')}
        </Text>

        <View style={styles.linksRow}>
          <TouchableOpacity onPress={() => handleOpenLink(EULA_URL)}>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              {t('iap.termsOfUse')}
            </Text>
          </TouchableOpacity>

          <Text style={{ color: colors.gray400, marginHorizontal: 8 }}>•</Text>

          <TouchableOpacity onPress={() => handleOpenLink(PRIVACY_POLICY_URL)}>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              {t('iap.privacyPolicy')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  statusCard: {
    marginBottom: 20,
    padding: 16,
  },
  statusRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusSubInfo: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  statusExpiry: {
    fontSize: 12,
    marginTop: 2,
  },
  statusIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  plansSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  planCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  badgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  planRow: {
    alignItems: 'center',
  },
  planDetails: {
    flex: 1,
  },
  planTitleRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  limitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  limitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  planBilling: {
    fontSize: 12,
  },
  priceContainer: {
    paddingLeft: 12,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
  },
  subscribeButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  noticeCard: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  secondaryActions: {
    gap: 10,
    marginBottom: 24,
  },
  secondaryButton: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  legalSection: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#00000015',
    alignItems: 'center',
  },
  disclosureText: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
