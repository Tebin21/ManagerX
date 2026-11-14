import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/settings/SettingsText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { hexToRgba } from '@/lib/colorUtils';
import {
  SETTINGS_KURDISH_FONT_BOLD,
  SETTINGS_KURDISH_FONT_REGULAR,
} from '@/lib/settingsFont';
import type { GoogleDriveConfig, GoogleDriveBackupDetails } from '@/lib/googleDriveBackup';

interface GoogleDriveDataChartProps {
  config: GoogleDriveConfig;
  localStats?: {
    products: number;
    sales: number;
    purchases: number;
    customers: number;
    suppliers: number;
    debts: number;
    expenses: number;
    earliestDate?: string | null;
  };
  onBackupNow?: () => void;
  onRestoreNow?: () => void;
  isSyncing?: boolean;
  isRestoring?: boolean;
}

export function GoogleDriveDataChart({
  config,
  localStats,
  onBackupNow,
  onRestoreNow,
  isSyncing = false,
  isRestoring = false,
}: GoogleDriveDataChartProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, flexDirection } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  // Must only render when Google Drive is connected
  if (!config.isConnected) {
    return null;
  }

  const details: Partial<GoogleDriveBackupDetails> = config.backupDetails || {
    productsCount: localStats?.products || 0,
    salesCount: localStats?.sales || 0,
    purchasesCount: localStats?.purchases || 0,
    customersCount: localStats?.customers || 0,
    suppliersCount: localStats?.suppliers || 0,
    debtsCount: localStats?.debts || 0,
    expensesCount: localStats?.expenses || 0,
    mediaCount: 0,
    totalRecords:
      (localStats?.products || 0) +
      (localStats?.sales || 0) +
      (localStats?.purchases || 0) +
      (localStats?.customers || 0) +
      (localStats?.suppliers || 0) +
      (localStats?.debts || 0) +
      (localStats?.expenses || 0),
    dataStartDate: localStats?.earliestDate || null,
    platform: Platform.OS,
    appVersion: '1.0.44',
    modifiedAt: config.lastBackupAt,
    sizeBytes: config.lastBackupSize || 0,
  };

  const totalRecords =
    details.totalRecords && details.totalRecords > 0
      ? details.totalRecords
      : (details.salesCount || 0) +
        (details.productsCount || 0) +
        (details.purchasesCount || 0) +
        (details.debtsCount || 0) +
        ((details.customersCount || 0) + (details.suppliersCount || 0)) +
        (details.expensesCount || 0);

  const safeTotal = Math.max(totalRecords, 1);

  // Categories breakdown
  const segments = [
    {
      key: 'sales',
      label: t('settings.dataScreen.gdriveLegendSales'),
      count: details.salesCount || 0,
      color: '#3B82F6', // Blue
      icon: 'cart-outline',
    },
    {
      key: 'products',
      label: t('settings.dataScreen.gdriveLegendProducts'),
      count: details.productsCount || 0,
      color: '#10B981', // Emerald
      icon: 'cube-outline',
    },
    {
      key: 'purchases',
      label: t('settings.dataScreen.gdriveLegendPurchases'),
      count: details.purchasesCount || 0,
      color: '#F59E0B', // Amber
      icon: 'bag-handle-outline',
    },
    {
      key: 'debts',
      label: t('settings.dataScreen.gdriveLegendDebts'),
      count: details.debtsCount || 0,
      color: '#EF4444', // Red
      icon: 'card-outline',
    },
    {
      key: 'contacts',
      label: t('settings.dataScreen.gdriveLegendContacts'),
      count: (details.customersCount || 0) + (details.suppliersCount || 0),
      color: '#8B5CF6', // Purple
      icon: 'people-outline',
    },
    {
      key: 'expenses',
      label: t('settings.dataScreen.gdriveLegendExpenses'),
      count: details.expensesCount || 0,
      color: '#EC4899', // Pink
      icon: 'receipt-outline',
    },
  ];

  // Storage size format
  const sizeBytes = details.sizeBytes || config.lastBackupSize || 0;
  let formattedSize = '0 KB';
  if (sizeBytes > 1024 * 1024) {
    formattedSize = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (sizeBytes > 0) {
    formattedSize = `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  // Format dates
  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return t('settings.dataScreen.googleDriveNeverBackedUp');
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(isKuLanguage ? 'ckb' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatDateOnly = (isoString?: string | null) => {
    if (!isoString) return isKuLanguage ? 'سەرەتای کارکردن' : 'From start';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(isKuLanguage ? 'ckb' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  // Device icon & label
  const platform = (details.platform || Platform.OS).toLowerCase();
  let platformLabel = 'iOS (iPhone / iPad)';
  let platformIcon: 'logo-apple' | 'logo-android' | 'desktop-outline' = 'logo-apple';
  if (platform === 'android') {
    platformLabel = 'Android Phone / Tablet';
    platformIcon = 'logo-android';
  } else if (platform === 'web' || platform === 'windows' || platform === 'macos') {
    platformLabel = 'Web & Desktop';
    platformIcon = 'desktop-outline';
  }

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
          borderColor: isDark ? colors.gray200 : hexToRgba(colors.primary, 0.25),
        },
      ]}
    >
      {/* ── Top Header Banner ── */}
      <View style={[styles.headerBanner, { flexDirection }]}>
        <View style={[styles.iconBox, { backgroundColor: hexToRgba(colors.primary, 0.15) }]}>
          <Ionicons name="cloud-done" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <View style={{ flexDirection, alignItems: 'center', gap: 6 }}>
            <Text
              style={[
                styles.titleText,
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                { color: colors.black },
              ]}
            >
              {t('settings.dataScreen.gdriveChartTitle')}
            </Text>
            <View style={[styles.liveBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.20)' : '#ECFDF5' }]}>
              <View style={styles.liveDot} />
              <Text style={[styles.liveText, { color: '#10B981' }]}>
                {isKuLanguage ? 'چالاکە' : 'Active'}
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.subtitleText,
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
              { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {t('settings.dataScreen.gdriveChartSub')}
          </Text>
        </View>
      </View>

      {/* ── Top Storage & Count Highlights ── */}
      <View style={[styles.highlightRow, { flexDirection }]}>
        <View
          style={[
            styles.highlightCard,
            {
              backgroundColor: isDark ? hexToRgba(colors.primary, 0.12) : hexToRgba(colors.primary, 0.06),
              borderColor: isDark ? hexToRgba(colors.primary, 0.28) : hexToRgba(colors.primary, 0.18),
            },
          ]}
        >
          <View style={{ flexDirection, alignItems: 'center', gap: 6 }}>
            <Ionicons name="pie-chart" size={16} color={colors.primary} />
            <Text
              style={[
                styles.highlightLabel,
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                { color: colors.gray600 },
              ]}
            >
              {t('settings.dataScreen.gdriveStorageUsed')}
            </Text>
          </View>
          <Text
            style={[
              styles.highlightValue,
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: colors.primary },
            ]}
          >
            {formattedSize}
          </Text>
        </View>

        <View
          style={[
            styles.highlightCard,
            {
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.10)' : '#EFF6FF',
              borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#DBEAFE',
            },
          ]}
        >
          <View style={{ flexDirection, alignItems: 'center', gap: 6 }}>
            <Ionicons name="layers-outline" size={16} color="#3B82F6" />
            <Text
              style={[
                styles.highlightLabel,
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                { color: colors.gray600 },
              ]}
            >
              {t('settings.dataScreen.gdriveTotalRecords')}
            </Text>
          </View>
          <Text
            style={[
              styles.highlightValue,
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: '#3B82F6' },
            ]}
          >
            {totalRecords.toLocaleString()} {t('settings.dataScreen.records')}
          </Text>
        </View>
      </View>

      {/* ── Visual Distribution Bar (Chart / هێڵکاریی دابەشبوونی داتا) ── */}
      <View style={styles.chartSection}>
        <View style={{ flexDirection, justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text
            style={[
              styles.sectionMiniTitle,
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: colors.gray700 },
            ]}
          >
            {isKuLanguage ? 'هێڵکاریی دابەشبوونی داتاکان بەپێی بەشەکان' : 'Data Distribution by Category'}
          </Text>
          <Text style={[styles.sectionMiniSub, { color: colors.gray400 }]}>
            100%
          </Text>
        </View>

        {/* Multi-segment Colored Horizontal Bar */}
        <View
          style={[
            styles.distributionBar,
            { backgroundColor: isDark ? colors.gray200 : '#E2E8F0', flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {segments.map((seg) => {
            const pct = Math.max(0, Math.round((seg.count / safeTotal) * 100));
            if (pct <= 0 && seg.count === 0) return null;
            return (
              <View
                key={seg.key}
                style={{
                  flex: Math.max(seg.count, 0.1),
                  backgroundColor: seg.color,
                  height: '100%',
                }}
              />
            );
          })}
        </View>

        {/* Legend Grid */}
        <View style={[styles.legendGrid, { flexDirection, flexWrap: 'wrap' }]}>
          {segments.map((seg) => {
            const pct = Math.round((seg.count / safeTotal) * 100);
            return (
              <View
                key={seg.key}
                style={[
                  styles.legendItem,
                  { flexDirection, backgroundColor: isDark ? colors.gray50 : '#F8FAFC' },
                ]}
              >
                <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                <Text
                  style={[
                    styles.legendLabel,
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                    { color: colors.gray700 },
                  ]}
                  numberOfLines={1}
                >
                  {seg.label}:
                </Text>
                <Text
                  style={[
                    styles.legendValue,
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    { color: colors.black },
                  ]}
                >
                  {seg.count.toLocaleString()}
                </Text>
                <Text style={[styles.legendPct, { color: colors.gray400 }]}>
                  ({pct}%)
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── 6 Entity Metric Cards Grid ── */}
      <View style={[styles.metricsGrid, { flexDirection, flexWrap: 'wrap' }]}>
        {segments.map((seg) => (
          <View
            key={seg.key}
            style={[
              styles.metricCard,
              {
                backgroundColor: isDark ? colors.gray50 : '#F8FAFC',
                borderColor: isDark ? colors.gray200 : '#E2E8F0',
              },
            ]}
          >
            <View style={{ flexDirection, alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <View style={[styles.metricIconWrap, { backgroundColor: hexToRgba(seg.color, 0.15) }]}>
                <Ionicons name={seg.icon as any} size={16} color={seg.color} />
              </View>
              <Text
                style={[
                  styles.metricCount,
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  { color: colors.black },
                ]}
              >
                {seg.count.toLocaleString()}
              </Text>
            </View>
            <Text
              style={[
                styles.metricLabel,
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                { color: colors.gray600, textAlign: isRTL ? 'right' : 'left' },
              ]}
              numberOfLines={1}
            >
              {seg.label}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Detailed Info Table (خشتەی زانیارییە وردەکان) ── */}
      <View
        style={[
          styles.tableContainer,
          {
            backgroundColor: isDark ? colors.gray50 : '#F8FAFC',
            borderColor: isDark ? colors.gray200 : '#E2E8F0',
          },
        ]}
      >
        <Text
          style={[
            styles.tableTitle,
            isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            { color: colors.gray700, textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {isKuLanguage ? 'زانیارییە وردەکانی پاشەکەوتی هەور' : 'Cloud Backup Technical Details'}
        </Text>

        {/* Row 1: Account */}
        <View style={[styles.tableRow, { flexDirection }]}>
          <View style={{ flexDirection, alignItems: 'center', gap: 6 }}>
            <Ionicons name="logo-google" size={14} color="#4285F4" />
            <Text
              style={[
                styles.tableRowLabel,
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                { color: colors.gray500 },
              ]}
            >
              {t('settings.dataScreen.gdriveAccount')}
            </Text>
          </View>
          <Text
            style={[
              styles.tableRowValue,
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: colors.black },
            ]}
            numberOfLines={1}
          >
            {config.email || 'Google Drive'}
          </Text>
        </View>

        {/* Row 2: Origin Platform & Device */}
        <View style={[styles.tableRow, { flexDirection }]}>
          <View style={{ flexDirection, alignItems: 'center', gap: 6 }}>
            <Ionicons name={platformIcon} size={14} color={colors.primary} />
            <Text
              style={[
                styles.tableRowLabel,
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                { color: colors.gray500 },
              ]}
            >
              {t('settings.dataScreen.gdriveSourceDevice')}
            </Text>
          </View>
          <Text
            style={[
              styles.tableRowValue,
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: colors.black },
            ]}
          >
            {platformLabel}
          </Text>
        </View>

        {/* Row 3: App Version */}
        <View style={[styles.tableRow, { flexDirection }]}>
          <View style={{ flexDirection, alignItems: 'center', gap: 6 }}>
            <Ionicons name="code-working" size={14} color="#10B981" />
            <Text
              style={[
                styles.tableRowLabel,
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                { color: colors.gray500 },
              ]}
            >
              {t('settings.dataScreen.gdriveAppVersion')}
            </Text>
          </View>
          <Text
            style={[
              styles.tableRowValue,
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: colors.black },
            ]}
          >
            v{details.appVersion || '1.0.44'}
          </Text>
        </View>

        {/* Row 4: Earliest Recorded Date (لە کەیەوە سەڤ کراوە) */}
        <View style={[styles.tableRow, { flexDirection }]}>
          <View style={{ flexDirection, alignItems: 'center', gap: 6 }}>
            <Ionicons name="calendar-outline" size={14} color="#8B5CF6" />
            <Text
              style={[
                styles.tableRowLabel,
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                { color: colors.gray500 },
              ]}
            >
              {t('settings.dataScreen.gdriveStartDate')}
            </Text>
          </View>
          <Text
            style={[
              styles.tableRowValue,
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: colors.black },
            ]}
          >
            {formatDateOnly(details.dataStartDate)}
          </Text>
        </View>

        {/* Row 5: Upload Timestamp (کەی دانراوە) */}
        <View style={[styles.tableRow, { flexDirection }]}>
          <View style={{ flexDirection, alignItems: 'center', gap: 6 }}>
            <Ionicons name="time-outline" size={14} color="#F59E0B" />
            <Text
              style={[
                styles.tableRowLabel,
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                { color: colors.gray500 },
              ]}
            >
              {t('settings.dataScreen.gdriveLastUploaded')}
            </Text>
          </View>
          <Text
            style={[
              styles.tableRowValue,
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: colors.black },
            ]}
          >
            {formatDateTime(details.modifiedAt || config.lastBackupAt)}
          </Text>
        </View>

        {/* Row 6: File Name */}
        <View style={[styles.tableRow, { flexDirection }]}>
          <View style={{ flexDirection, alignItems: 'center', gap: 6 }}>
            <Ionicons name="document-text-outline" size={14} color={colors.primary} />
            <Text
              style={[
                styles.tableRowLabel,
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                { color: colors.gray500 },
              ]}
            >
              {t('settings.dataScreen.gdriveFileName')}
            </Text>
          </View>
          <Text
            style={[
              styles.tableRowValue,
              { color: colors.gray700, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
            ]}
          >
            froshiar_backup.json
          </Text>
        </View>

        {/* Row 7: Security & Encryption */}
        <View style={[styles.tableRow, { flexDirection, borderBottomWidth: 0, paddingBottom: 0 }]}>
          <View style={{ flexDirection, alignItems: 'center', gap: 6 }}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text
              style={[
                styles.tableRowLabel,
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                { color: colors.gray500 },
              ]}
            >
              {t('settings.dataScreen.gdriveSecurity')}
            </Text>
          </View>
          <Text
            style={[
              styles.tableRowValue,
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: '#10B981', fontSize: 12 },
            ]}
          >
            OAuth2 + TLS 1.3
          </Text>
        </View>
      </View>

      {/* ── Action Buttons (پاشەکەوتکردن لە درایڤ / گەڕاندنەوە لە درایڤ) ── */}
      <View style={[styles.actionButtonsRow, { flexDirection, gap: 10 }]}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.primary,
              flex: 1,
              flexDirection,
            },
          ]}
          onPress={onBackupNow}
          disabled={isSyncing || isRestoring}
          activeOpacity={0.8}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
              <Text
                style={[
                  styles.actionButtonText,
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {t('settings.dataScreen.gdriveSyncNow')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : '#EFF6FF',
              borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE',
              borderWidth: 1,
              flex: 1,
              flexDirection,
            },
          ]}
          onPress={onRestoreNow}
          disabled={isSyncing || isRestoring}
          activeOpacity={0.8}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <>
              <Ionicons name="cloud-download-outline" size={16} color="#3B82F6" />
              <Text
                style={[
                  styles.actionButtonText,
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  { color: isDark ? '#60A5FA' : '#2563EB' },
                ]}
              >
                {t('settings.dataScreen.gdriveRestoreData')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerBanner: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitleText: {
    fontSize: 12,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
  },
  highlightRow: {
    gap: 10,
    marginBottom: 14,
  },
  highlightCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  highlightLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  highlightValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  chartSection: {
    marginBottom: 14,
  },
  sectionMiniTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionMiniSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  distributionBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 10,
  },
  legendGrid: {
    gap: 6,
  },
  legendItem: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
  },
  legendValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  legendPct: {
    fontSize: 10,
  },
  metricsGrid: {
    gap: 8,
    marginBottom: 14,
  },
  metricCard: {
    width: '31%',
    flexGrow: 1,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  metricIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCount: {
    fontSize: 14,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  tableContainer: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  tableTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  tableRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  tableRowLabel: {
    fontSize: 12,
  },
  tableRowValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonsRow: {
    width: '100%',
  },
  actionButton: {
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
