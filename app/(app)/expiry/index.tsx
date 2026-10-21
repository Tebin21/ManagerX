import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/common/AppHeader';
import { InventoryExpiryView } from '@/components/inventory/InventoryExpiryView';
import { useInventoryStore } from '@/store/inventoryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { Text } from '@/components/ui/AppText';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';

export default function ExpiryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const isKu = useLanguageStore((s) => s.language !== 'en');
  const { isTablet, isTabletLandscape } = useResponsive();

  const products = useInventoryStore((s) => s.products);
  const isLoading = useInventoryStore((s) => s.isLoading);
  const loadInventory = useInventoryStore((s) => s.loadInventory);

  const expiryTrackingEnabled = useSettingsStore((s) => s.expiryTrackingEnabled);

  // Reload inventory data on screen focus
  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [loadInventory])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <AppHeader
        title={isKu ? 'بەسەرچوون' : 'Expiry Tracking'}
        showBack
        rightAction={
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/(app)/settings/expiry' as never)}
            style={[
              styles.headerActionBtn,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.70)' : 'rgba(255, 255, 255, 0.20)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.35)',
              },
            ]}
            hitSlop={8}
          >
            <Ionicons name="information-circle-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      {!expiryTrackingEnabled ? (
        /* Disabled Prompt Banner */
        <View style={styles.disabledContainer}>
          <View
            style={[
              styles.disabledCard,
              {
                backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                borderColor: isDark ? colors.gray200 : '#E2E8F0',
              },
              isTablet && { maxWidth: isTabletLandscape ? 640 : 540 },
            ]}
          >
            <View
              style={[
                styles.disabledIconWrap,
                {
                  backgroundColor: hexToRgba(colors.primary, isDark ? 0.22 : 0.12),
                  borderColor: hexToRgba(colors.primary, isDark ? 0.40 : 0.25),
                },
              ]}
            >
              <Ionicons name="time" size={36} color={colors.primary} />
            </View>

            <Text
              style={[
                styles.disabledTitle,
                { color: colors.black },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKu ? 'سیستەمی بەرواری بەسەرچوون ناچالاکە' : 'Expiry Tracking is Disabled'}
            </Text>

            <Text
              style={[
                styles.disabledDesc,
                { color: colors.gray400, textAlign: 'center' },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT },
              ]}
            >
              {isKu
                ? 'بۆ چاودێریکردنی تەمەنی کاڵاکان، ئاگاداری پێشوەختە و پاراستنی سەرمایەکەت لە زەرەری ماوەبەسەرچوون، تکایە سەرەتا سیستەمەکە چالاک بکە.'
                : 'Enable shelf-life tracking, early warning countdowns, and stock loss protection to safeguard your perishable inventory.'}
            </Text>

            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => router.push('/(app)/settings/expiry' as never)}
              style={[styles.enableBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="shield-checkmark" size={18} color="#0F172A" />
              <Text
                style={[
                  styles.enableBtnText,
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKu ? 'خوێندنەوەی ڕێنمایی و چالاککردن' : 'View Guidelines & Enable'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Full Expiry Audit View */
        <InventoryExpiryView
          products={products}
          onRefresh={loadInventory}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  disabledCard: {
    width: '100%',
    padding: 24,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    gap: 14,
  },
  disabledIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  disabledTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabledDesc: {
    fontSize: 13.5,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  enableBtnText: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
