import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
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
import { KurdistanFlagIcon, UKFlagIcon } from '@/components/settings/LanguageToggleSwitch';

interface SettingsGridProps {
  businessName?: string;
  itemLimit: number;
  exchangeRate: number;
  language?: 'ku' | 'en' | null;
  setLanguage: (lang: 'ku' | 'en') => void;
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
  cardWidth: number;
}

const IS_IOS = Platform.OS === 'ios';

function SettingsGridTile({
  icon,
  title,
  sub,
  onPress,
  color,
  destructive = false,
  badge,
  cardWidth,
}: TileProps) {
  const { colors, isDark } = useAppTheme();
  const { isRTL } = useRTL();

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
          width: cardWidth,
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.72)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.06)',
          shadowColor: isDark ? '#000000' : baseColor,
          shadowOpacity: isDark ? 0.35 : 0.08,
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
            },
          ]}
        >
          <Ionicons name={icon} size={20} color={baseColor} />
        </View>

        {badge ? (
          <View style={styles.badgeWrap}>{badge}</View>
        ) : (
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={14}
            color={isDark ? 'rgba(255,255,255,0.30)' : colors.gray300}
          />
        )}
      </View>

      {/* Title & Sub */}
      <View style={styles.tileFooter}>
        <Text
          style={[
            styles.tileTitle,
            {
              color: destructive ? colors.error : colors.black,
              textAlign: isRTL ? 'right' : 'left',
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
  const { isTablet } = useResponsive();
  const { width: screenWidth } = useWindowDimensions();

  const isKu = language !== 'en';

  // Responsive column calculation: 3 columns on tablet, 2 on mobile
  const numColumns = isTablet ? 3 : 2;
  const horizontalPadding = 16 * 2;
  const gap = 12;
  const totalGap = gap * (numColumns - 1);
  const cardWidth = Math.floor((screenWidth - horizontalPadding - totalGap) / numColumns);

  // Quick Language Toggle
  const handleToggleLanguage = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
    setLanguage(isKu ? 'en' : 'ku');
  };

  // Quick Appearance (Theme) Toggle
  const handleToggleTheme = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
    toggleTheme();
  };

  return (
    <View style={styles.container}>
      {/* ── 1. Business Profile ── */}
      <Text style={[styles.sectionTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
        {t('settings.businessProfile').toUpperCase()}
      </Text>
      <View style={[styles.rowGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <SettingsGridTile
          cardWidth={cardWidth}
          icon="business"
          title={isKu ? 'پڕۆفایل' : 'Business'}
          sub={businessName || (isKu ? 'زانیاری کار' : 'Info')}
          onPress={() => router.push('/(app)/settings/profile' as never)}
        />
        <SettingsGridTile
          cardWidth={cardWidth}
          icon="color-palette"
          title={isKu ? 'دیزاین' : 'Customization'}
          sub={isKu ? 'داشبۆرد و ڕووکار' : 'UI & Styles'}
          onPress={() => router.push('/(app)/settings/customization' as never)}
        />
      </View>

      {/* ── 2. Subscriptions ── */}
      <Text style={[styles.sectionTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
        {t('settings.subscriptions').toUpperCase()}
      </Text>
      <View style={[styles.rowGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <SettingsGridTile
          cardWidth={cardWidth}
          icon="rocket"
          title={isKu ? 'مۆڵەت' : 'License'}
          sub={t('settings.managerXLicenseSub', { limit: itemLimit })}
          onPress={() => router.push('/(app)/settings/plan-limits' as never)}
        />
        <SettingsGridTile
          cardWidth={cardWidth}
          icon="globe"
          title={isKu ? 'ئابوونەی وێب' : 'Store Sub'}
          sub={isKu ? 'بەڕێوەبردن' : 'Manage'}
          onPress={() => router.push('/(app)/settings/online-store-subscription' as never)}
        />
      </View>

      {/* ── 3. Preferences (Includes Interactive Language & Dark/Light Toggles) ── */}
      <Text style={[styles.sectionTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
        {t('settings.preferences').toUpperCase()}
      </Text>
      <View style={[styles.rowGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Exchange Rate */}
        <SettingsGridTile
          cardWidth={cardWidth}
          icon="swap-horizontal"
          title={isKu ? 'نرخی دۆلار' : 'Exchange Rate'}
          sub={`100$ = ${fmtExchangeRate(exchangeRate)}`}
          onPress={() => router.push('/(app)/settings/currency' as never)}
          badge={
            <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.20)' : 'rgba(16, 185, 129, 0.12)' }]}>
              <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>IQD</Text>
            </View>
          }
        />

        {/* Interactive Language Quick-Toggle Square */}
        <SettingsGridTile
          cardWidth={cardWidth}
          icon="language"
          title={isKu ? 'زمان' : 'Language'}
          sub={isKu ? 'کلیک بکە بۆ ئینگلیزی' : 'Tap for Kurdish'}
          onPress={handleToggleLanguage}
          badge={
            <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}>
              {isKu ? <KurdistanFlagIcon size={16} /> : <UKFlagIcon size={16} />}
              <Text style={[styles.statusBadgeText, { color: colors.black, marginStart: 4 }]}>
                {isKu ? 'کوردی' : 'English'}
              </Text>
            </View>
          }
        />

        {/* Interactive Appearance (Dark / Light) Quick-Toggle Square */}
        <SettingsGridTile
          cardWidth={cardWidth}
          icon={isDark ? 'moon' : 'sunny'}
          color={isDark ? '#818CF8' : '#F59E0B'}
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

        {/* App Theme Colors */}
        <SettingsGridTile
          cardWidth={cardWidth}
          icon="color-palette"
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

      {/* ── 4. Modules & Online Store ── */}
      <Text style={[styles.sectionTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
        {t('settings.modules').toUpperCase()}
      </Text>
      <View style={[styles.rowGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <SettingsGridTile
          cardWidth={cardWidth}
          icon="grid"
          title={isKu ? 'مۆدیوڵەکان' : 'Modules'}
          sub={isKu ? 'بەشەکانی ئەپ' : 'Dashboard Grid'}
          onPress={() => router.push('/(app)/settings/modules' as never)}
        />
        <SettingsGridTile
          cardWidth={cardWidth}
          icon="storefront"
          title={isKu ? 'فرۆشگا' : 'Online Store'}
          sub={isKu ? 'ڕێکخستنی وێب' : 'Web Storefront'}
          onPress={() => router.push('/(app)/settings/online-store' as never)}
        />
      </View>

      {/* ── 5. Data & About ── */}
      <Text style={[styles.sectionTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
        {t('settings.data').toUpperCase()}
      </Text>
      <View style={[styles.rowGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <SettingsGridTile
          cardWidth={cardWidth}
          icon="server"
          title={isKu ? 'داتا و باکئەپ' : 'Data & Backup'}
          sub={isKu ? 'کلاود و باکئەپ' : 'Cloud Sync & Data'}
          onPress={() => router.push('/(app)/settings/data' as never)}
        />
        <SettingsGridTile
          cardWidth={cardWidth}
          icon="information-circle"
          title={isKu ? 'دەربارە' : 'About'}
          sub={isKu ? 'فرۆشیار v1.0' : 'Froshiar v1.0'}
          onPress={() => router.push('/(app)/settings/about' as never)}
        />
      </View>

      {/* ── 6. Account & Danger Zone ── */}
      <Text style={[styles.sectionTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
        {t('settings.account').toUpperCase()}
      </Text>
      <View style={[styles.rowGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <SettingsGridTile
          cardWidth={cardWidth}
          icon="log-out"
          destructive
          title={isKu ? 'دەرچوون' : 'Logout'}
          sub={userEmail ? (isKu ? 'چوونەدەرەوە' : 'Sign out') : undefined}
          onPress={onLogoutPress}
        />
        <SettingsGridTile
          cardWidth={cardWidth}
          icon="trash"
          destructive
          title={isKu ? 'سڕینەوە' : 'Delete'}
          sub={isKu ? 'سڕینەوەی ئەژمێر' : 'Delete Account'}
          onPress={onDeleteAccountPress}
        />
      </View>

      <View style={{ height: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  rowGrid: {
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    borderRadius: 18,
    padding: 14,
    minHeight: 112,
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
    marginTop: 12,
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
