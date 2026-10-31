import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/settings/SettingsText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { hexToRgba } from '@/lib/colorUtils';
import { fmtExchangeRate } from '@/utils/formatters';
import { KurdistanFlagIcon, UKFlagIcon, IraqFlagIcon } from '@/components/settings/LanguageToggleSwitch';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useSettingsStore } from '@/store/settingsStore';

interface SettingsGridProps {
  businessName?: string;
  itemLimit: number;
  exchangeRate: number;
  language?: 'ku' | 'en' | 'ar' | null;
  setLanguage: (lang: 'ku' | 'en' | 'ar') => void;
  isDark: boolean;
  toggleTheme: () => void;
  userEmail?: string | null;
  onLogoutPress: () => void;
  onDeleteAccountPress: () => void;
}

interface TileProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub?: string;
  onPress: () => void;
  color?: string;
  destructive?: boolean;
  badge?: React.ReactNode;
  cardWidth?: number;
}

function SettingsGridTile({
  icon,
  title,
  sub,
  onPress,
  color,
  destructive = false,
  badge,
}: TileProps) {
  const { colors, isDark } = useAppTheme();
  const { isRTL } = useRTL();
  const { isTablet, isTabletLandscape } = useResponsive();

  const baseColor = destructive ? colors.error : (color || colors.primary);

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.76}
      onPress={handlePress}
      style={[
        styles.tile,
        {
          flex: 1,
          borderRadius: isTablet ? 20 : 14,
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.72)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.06)',
          shadowColor: isDark ? '#000000' : baseColor,
          shadowOpacity: isDark ? 0.35 : 0.08,
          padding: isTabletLandscape ? 22 : isTablet ? 18 : 14,
          minHeight: isTabletLandscape ? 134 : isTablet ? 122 : 110,
        },
      ]}
    >
      {/* Top Header of Tile: Icon & Badge */}
      <View style={[styles.tileHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: hexToRgba(baseColor, isDark ? 0.20 : 0.12),
              borderColor: hexToRgba(baseColor, isDark ? 0.35 : 0.22),
              width: isTabletLandscape ? 52 : isTablet ? 46 : 36,
              height: isTabletLandscape ? 52 : isTablet ? 46 : 36,
              borderRadius: isTabletLandscape ? 16 : isTablet ? 14 : 11,
            },
          ]}
        >
          <Ionicons name={icon} size={isTabletLandscape ? 26 : isTablet ? 23 : 20} color={baseColor} />
        </View>

        {badge ? (
          <View style={styles.badgeWrap}>{badge}</View>
        ) : (
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={isTabletLandscape ? 20 : isTablet ? 18 : 14}
            color={isDark ? 'rgba(255,255,255,0.30)' : colors.gray300}
          />
        )}
      </View>

      {/* Title & Sub */}
      <View style={[styles.tileFooter, isTablet && { marginTop: isTabletLandscape ? 14 : 10 }]}>
        <Text
          style={[
            styles.tileTitle,
            {
              color: destructive ? colors.error : colors.black,
              textAlign: isRTL ? 'right' : 'left',
              fontSize: isTabletLandscape ? 18 : isTablet ? 16.5 : 14,
              fontFamily: SETTINGS_KURDISH_FONT_BOLD,
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {sub ? (
          <Text
            style={[
              styles.tileSub,
              {
                color: colors.gray400,
                textAlign: isRTL ? 'right' : 'left',
                fontSize: isTabletLandscape ? 14 : isTablet ? 13 : 11,
                fontFamily: SETTINGS_KURDISH_FONT,
              },
            ]}
            numberOfLines={1}
          >
            {sub}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export function getSettingsTileColors(isDark: boolean) {
  return {
    profile:      isDark ? '#60A5FA' : '#2563EB', // Royal Blue for Business
    design:       isDark ? '#C084FC' : '#9333EA', // Violet / Purple for Design & Customization
    license:      isDark ? '#FBBF24' : '#D97706', // Radiant Amber Gold for License & Limits
    storeSub:     isDark ? '#22D3EE' : '#0891B2', // Cyan / Teal for Web Store Subscription
    currency:     isDark ? '#34D399' : '#059669', // Emerald Green for Currency / Dollar
    language:     isDark ? '#F472B6' : '#DB2777', // Soft Rose Pink for Language
    appearance:   isDark ? '#818CF8' : '#F59E0B', // Indigo for Dark, Sun Gold for Light
    themeColors:  isDark ? '#E879F9' : '#C026D3', // Magenta / Fuchsia for Palette
    modules:      isDark ? '#38BDF8' : '#0284C7', // Sky Blue for Modules
    store:        isDark ? '#4ADE80' : '#16A34A', // Fresh Green for Online Storefront
    data:         isDark ? '#A5B4FC' : '#4F46E5', // Indigo Slate for Data & Backup
    cloudSync:    isDark ? '#38BDF8' : '#0284C7', // Cloud Sky for Live Cloud Sync
    about:        isDark ? '#60A5FA' : '#2563EB', // Info Blue for About
    tutorials:    isDark ? '#FB923C' : '#EA580C', // Guide Orange for Tutorials
    expiry:       isDark ? '#F59E0B' : '#D97706', // Radiant Amber for Expiry Tracking
  };
}

export function SettingsGrid({
  businessName,
  itemLimit,
  exchangeRate,
  language,
  setLanguage,
  isDark,
  toggleTheme,
  userEmail,
  onLogoutPress,
  onDeleteAccountPress,
}: SettingsGridProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { isRTL } = useRTL();
  const { isTablet, isTabletLandscape } = useResponsive();

  const isKu = language !== 'en';
  const tileColors = getSettingsTileColors(isDark);
  const expiryTrackingEnabled = useSettingsStore((s) => s.expiryTrackingEnabled);

  // Quick Language Toggle: ku -> ar -> en -> ku
  const handleToggleLanguage = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
    if (language === 'ku') setLanguage('ar');
    else if (language === 'ar') setLanguage('en');
    else setLanguage('ku');
  };

  // Quick Appearance (Theme) Toggle
  const handleToggleTheme = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
    toggleTheme();
  };

  // 1. Business Profile Section (Profile & Customization)
  const sectionBusinessAndSubs = (
    <View style={styles.sectionWrap}>
      <Text style={[styles.sectionTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
        {isKu ? 'پڕۆفایلی بازرگانی' : 'BUSINESS PROFILE'}
      </Text>
      <View style={{ gap: 12 }}>
        {/* Profile & Customization */}
        <View style={[styles.rowGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <SettingsGridTile
            icon="business"
            color={tileColors.profile}
            title={isKu ? 'پڕۆفایل' : 'Business'}
            sub={businessName || (isKu ? 'زانیاری کار' : 'Info')}
            onPress={() => router.push('/(app)/settings/profile' as never)}
          />
          <SettingsGridTile
            icon="color-palette"
            color={tileColors.design}
            title={isKu ? 'دیزاین' : 'Customization'}
            sub={isKu ? 'داشبۆرد و ڕووکار' : 'UI & Styles'}
            onPress={() => router.push('/(app)/settings/customization' as never)}
          />
        </View>
      </View>
    </View>
  );

  // 2. System & Preferences Section (Left Column - Rows 1 & 2)
  const sectionPreferences = (
    <View style={styles.sectionWrap}>
      <Text style={[styles.sectionTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
        {t('settings.preferences').toUpperCase()}
      </Text>
      <View style={{ gap: 12 }}>
        {/* Row 1: Exchange Rate & Language */}
        <View style={[styles.rowGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <SettingsGridTile
            icon="swap-horizontal"
            color={tileColors.currency}
            title={isKu ? 'نرخی دۆلار' : 'Exchange Rate'}
            sub={`100$ = ${fmtExchangeRate(exchangeRate)}`}
            onPress={() => router.push('/(app)/settings/currency' as never)}
            badge={
              <View style={[styles.statusBadge, { backgroundColor: hexToRgba(tileColors.currency, isDark ? 0.22 : 0.12) }]}>
                <Text style={[styles.statusBadgeText, { color: tileColors.currency }]}>IQD</Text>
              </View>
            }
          />

          <SettingsGridTile
            icon="language"
            color={tileColors.language}
            title={t('settings.language')}
            sub={
              language === 'ku'
                ? 'کلیک بکە بۆ گۆڕین'
                : language === 'ar'
                ? 'انقر للتبديل'
                : 'Tap to switch'
            }
            onPress={handleToggleLanguage}
            badge={
              <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}>
                {language === 'ku' ? (
                  <KurdistanFlagIcon size={16} />
                ) : language === 'ar' ? (
                  <IraqFlagIcon size={16} />
                ) : (
                  <UKFlagIcon size={16} />
                )}
                <Text style={[styles.statusBadgeText, { color: colors.black, marginStart: 4 }]}>
                  {language === 'ku' ? 'کوردی' : language === 'ar' ? 'العربية' : 'English'}
                </Text>
              </View>
            }
          />
        </View>

        {/* Row 2: Theme (Dark/Light) & Accent Colors */}
        <View style={[styles.rowGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <SettingsGridTile
            icon={isDark ? 'moon' : 'sunny'}
            color={tileColors.appearance}
            title={isKu ? 'ڕووکار' : 'Theme'}
            sub={isDark ? (isKu ? 'تاریک (Dark)' : 'Dark mode') : (isKu ? 'ڕووناک (Light)' : 'Light mode')}
            onPress={handleToggleTheme}
            badge={
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isDark ? 'rgba(129, 140, 248, 0.22)' : 'rgba(245, 158, 11, 0.18)',
                  },
                ]}
              >
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={12}
                  color={isDark ? '#818CF8' : '#D97706'}
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: isDark ? '#818CF8' : '#D97706', marginStart: 3 },
                  ]}
                >
                  {isDark ? 'Dark' : 'Light'}
                </Text>
              </View>
            }
          />

          <SettingsGridTile
            icon="color-filter"
            color={tileColors.themeColors}
            title={isKu ? 'ڕەنگەکان' : 'Theme Colors'}
            sub={isKu ? 'ئەکسێنت' : 'Accent Color'}
            onPress={() => router.push('/(app)/settings/theme' as never)}
            badge={
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: colors.primary, borderColor: isDark ? '#FFFFFF40' : '#00000020' },
                ]}
              />
            }
          />
        </View>
      </View>
    </View>
  );

  // 3. Modules & Store Section (Left Column - Row 3)
  const sectionModules = (
    <View style={styles.sectionWrap}>
      <Text style={[styles.sectionTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
        {t('settings.modules').toUpperCase()}
      </Text>
      <View style={[styles.rowGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <SettingsGridTile
          icon="grid"
          color={tileColors.modules}
          title={isKu ? 'مۆدیوڵەکان' : 'Modules'}
          sub={isKu ? 'بەشەکانی ئەپ' : 'Dashboard Grid'}
          onPress={() => router.push('/(app)/settings/modules' as never)}
        />
        <SettingsGridTile
          icon="storefront"
          color={tileColors.store}
          title={isKu ? 'فرۆشگا' : 'Online Store'}
          sub={isKu ? 'ڕێکخستنی وێب' : 'Web Storefront'}
          onPress={() => router.push('/(app)/settings/online-store' as never)}
        />
      </View>

      {/* Row 2: Expiry Date Tracking & Thermal Receipts */}
      <View style={[styles.rowGrid, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 12 }]}>
        <SettingsGridTile
          icon="time"
          color={tileColors.expiry}
          title={isKu ? 'بەسەرچوون' : 'Expiry Tracking'}
          sub={
            expiryTrackingEnabled
              ? (isKu ? 'سیستەمی بەروار چالاکە' : 'Active')
              : (isKu ? 'سیستەمی بەروار ناچالاکە' : 'Disabled')
          }
          onPress={() => router.push('/(app)/settings/expiry' as never)}
          badge={
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: expiryTrackingEnabled
                    ? hexToRgba(colors.success, isDark ? 0.22 : 0.12)
                    : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                },
              ]}
            >
              <Ionicons
                name={expiryTrackingEnabled ? 'checkmark-circle' : 'close-circle'}
                size={12}
                color={expiryTrackingEnabled ? colors.success : colors.gray400}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: expiryTrackingEnabled ? colors.success : colors.gray400, marginStart: 3 },
                ]}
              >
                {expiryTrackingEnabled ? (isKu ? 'چالاکە' : 'ON') : (isKu ? 'ناچالاکە' : 'OFF')}
              </Text>
            </View>
          }
        />
        <SettingsGridTile
          icon="receipt"
          color={colors.primary}
          title={isKu ? 'وەسڵی حەراری' : 'Thermal Receipt'}
          sub={isKu ? '58mm, 80mm, 110mm' : 'Sizes & Fields'}
          onPress={() => router.push('/(app)/settings/receipt-customization' as never)}
        />
      </View>
    </View>
  );

  // 4. Data & Backup Section (Right Column - Row 3)
  const sectionData = (
    <View style={styles.sectionWrap}>
      <Text style={[styles.sectionTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
        {isKu ? 'داتا و باکئەپ' : t('settings.data').toUpperCase()}
      </Text>
      <View style={[styles.rowGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <SettingsGridTile
          icon="server"
          color={tileColors.data}
          title={isKu ? 'داتا و باکئەپ' : 'Data & Backup'}
          sub={isKu ? 'هەڵگرتن و گەڕاندنەوەی داتا' : 'Backup & Restore Data'}
          onPress={() => router.push('/(app)/settings/data' as never)}
        />
      </View>
    </View>
  );

  // 5. About & Tutorials Section (Right Column - Row 4)
  const sectionAbout = (
    <View style={styles.sectionWrap}>
      <Text style={[styles.sectionTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
        {isKu ? 'دەربارە و فێرکارییەکان' : t('settings.about').toUpperCase()}
      </Text>
      <View style={[styles.rowGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <SettingsGridTile
          icon="information-circle"
          color={tileColors.about}
          title={isKu ? 'دەربارە' : 'About'}
          sub={isKu ? 'فرۆشیار v1.0' : 'Froshiar v1.0'}
          onPress={() => router.push('/(app)/settings/about' as never)}
        />
        <SettingsGridTile
          icon="play-circle"
          color={tileColors.tutorials}
          title={isKu ? 'فێرکارییەکان' : 'Tutorials'}
          sub={isKu ? 'ڕێبەری کارکردن' : 'User Guides'}
          onPress={() => router.push('/(app)/settings/tutorials' as never)}
        />
      </View>
    </View>
  );

  // 6. Account & Danger Zone Section (Left Column - Row 4)
  const sectionAccount = (
    <View style={styles.sectionWrap}>
      <Text style={[styles.sectionTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
        {t('settings.account').toUpperCase()}
      </Text>
      <View style={[styles.rowGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <SettingsGridTile
          icon="log-out"
          destructive
          title={isKu ? 'دەرچوون' : 'Logout'}
          sub={userEmail ? (isKu ? 'چوونەدەرەوە' : 'Sign out') : undefined}
          onPress={onLogoutPress}
        />
        <SettingsGridTile
          icon="trash"
          destructive
          title={isKu ? 'سڕینەوە' : 'Delete'}
          sub={isKu ? 'سڕینەوەی ئەژمێر' : 'Delete Account'}
          onPress={onDeleteAccountPress}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isTablet ? (
        /* Tablet: Balanced 2-Column Section Layout that eliminates all empty whitespace */
        <View
          style={[
            styles.tabletTwoColumns,
            { flexDirection: isRTL ? 'row-reverse' : 'row', gap: isTabletLandscape ? 24 : 18 },
          ]}
        >
          {/* Column 1 (Right in RTL - 4 Rows matching Left perfectly) */}
          <View style={styles.columnHalf}>
            {sectionBusinessAndSubs}
            {sectionData}
            {sectionAbout}
          </View>

          {/* Column 2 (Left in RTL - 4 Rows untouched) */}
          <View style={styles.columnHalf}>
            {sectionPreferences}
            {sectionModules}
            {sectionAccount}
          </View>
        </View>
      ) : (
        /* Phone: Single vertical column */
        <View style={{ gap: 4 }}>
          {sectionBusinessAndSubs}
          {sectionPreferences}
          {sectionModules}
          {sectionData}
          {sectionAbout}
          {sectionAccount}
        </View>
      )}

      <View style={{ height: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    marginTop: 4,
    width: '100%',
  },
  tabletTwoColumns: {
    width: '100%',
    alignItems: 'flex-start',
  },
  columnHalf: {
    flex: 1,
    gap: 4,
  },
  sectionWrap: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  rowGrid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  tile: {
    borderRadius: 18,
    padding: 14,
    minHeight: 110,
    justifyContent: 'space-between',
    borderWidth: 1.2,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
  },
  tileHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  tileFooter: {
    marginTop: 10,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  tileSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
