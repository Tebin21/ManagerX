import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { toEnglishDigits } from '@/utils/formatters';
import type { DashboardActivityItem } from '@/lib/sqlite';

interface Props {
  activities: DashboardActivityItem[];
  isLoading?: boolean;
  periodLabel?: string;
}

function formatActivityTime(dateStr: string, isKurdish: boolean): string {
  if (!dateStr) return '';
  const cleanStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  const d = new Date(cleanStr);
  if (isNaN(d.getTime())) return dateStr;

  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  let period = '';

  if (isKurdish) {
    period = hours >= 12 ? 'د.ن' : 'ب.ن';
  } else {
    period = hours >= 12 ? 'PM' : 'AM';
  }

  hours = hours % 12 || 12;
  const timeFormatted = `${toEnglishDigits(hours)}:${toEnglishDigits(minutes)} ${period}`;

  if (isToday) {
    return isKurdish ? `ئەمڕۆ ${timeFormatted}` : `Today ${timeFormatted}`;
  }
  if (isYesterday) {
    return isKurdish ? `دوێنێ ${timeFormatted}` : `Yesterday ${timeFormatted}`;
  }

  const day = toEnglishDigits(d.getDate().toString().padStart(2, '0'));
  const month = toEnglishDigits((d.getMonth() + 1).toString().padStart(2, '0'));
  return `${day}/${month} - ${timeFormatted}`;
}

export function DashboardActivityFeed({ activities, isLoading = false, periodLabel }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const getActivityConfig = (type: DashboardActivityItem['type']) => {
    switch (type) {
      case 'sale':
        return {
          icon: 'receipt-outline' as const,
          color: '#10B981',
          label: t('dashboard.saleActivity'),
          sign: '+',
        };
      case 'purchase':
        return {
          icon: 'cart-outline' as const,
          color: '#8B5CF6',
          label: t('dashboard.purchaseActivity'),
          sign: '-',
        };
      case 'customer_debt':
        return {
          icon: 'wallet-outline' as const,
          color: '#0D9488',
          label: t('dashboard.debtCollectedActivity'),
          sign: '+',
        };
      case 'supplier_debt':
        return {
          icon: 'card-outline' as const,
          color: '#EA580C',
          label: t('dashboard.debtPaidActivity'),
          sign: '-',
        };
      case 'expense':
        return {
          icon: 'arrow-down-circle-outline' as const,
          color: '#E11D48',
          label: t('dashboard.expenseActivity'),
          sign: '-',
        };
      case 'capital_deposit':
        return {
          icon: 'cash-outline' as const,
          color: '#D4AF37',
          label: isKurdish ? 'پارەدانان بۆ دەخیلە' : 'Till Deposit',
          sign: '+',
        };
      case 'capital_withdraw':
        return {
          icon: 'arrow-up-circle-outline' as const,
          color: '#F59E0B',
          label: isKurdish ? 'ڕاکێشانی دەخیلە' : 'Till Withdrawal',
          sign: '-',
        };
      case 'customer':
        return {
          icon: 'person-add-outline' as const,
          color: '#2563EB',
          label: t('dashboard.newCustomerActivity'),
          sign: '',
        };
      case 'supplier':
        return {
          icon: 'business-outline' as const,
          color: '#4F46E5',
          label: t('dashboard.newSupplierActivity'),
          sign: '',
        };
      default:
        return {
          icon: 'flash-outline' as const,
          color: colors.primary,
          label: '',
          sign: '',
        };
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Section Header */}
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.headerTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.headerIconBox, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
          </View>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.darkBlue, textAlign },
              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
            ]}
          >
            {t('dashboard.recentActivity')}
          </Text>
          {periodLabel ? (
            <View
              style={[
                styles.periodBadge,
                {
                  backgroundColor: colors.primary + '14',
                  borderColor: colors.primary + '30',
                },
              ]}
            >
              <Text
                style={[
                  styles.periodBadgeText,
                  { color: colors.primary },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {periodLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {activities.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.gray100 }]}>
            <Text style={[styles.countBadgeText, { color: colors.gray500, writingDirection: 'ltr' }]}>
              {toEnglishDigits(activities.length)}
            </Text>
          </View>
        )}
      </View>

      {/* Activities Card Container */}
      <View
        style={[
          styles.containerCard,
          {
            backgroundColor: isDark ? colors.gray100 : colors.white,
            borderColor: isDark ? colors.gray200 : colors.gray100,
          },
        ]}
      >
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : activities.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="hourglass-outline" size={32} color={colors.gray300} />
            <Text style={[styles.emptyText, { color: colors.gray400 }]}>
              {periodLabel && periodLabel !== 'هەموو کات' && periodLabel !== 'All Time'
                ? isKurdish
                  ? `هیچ چالاکییەک بۆ (${periodLabel}) تۆمار نەکراوە`
                  : `No activity found for (${periodLabel})`
                : t('dashboard.noActivity')}
            </Text>
          </View>
        ) : (
          activities.map((item, index) => {
            const config = getActivityConfig(item.type);
            const isLast = index === activities.length - 1;
            const timeStr = formatActivityTime(item.timestamp, isKurdish);

            return (
              <View key={`act_${item.id}_${index}`}>
                <View style={[styles.activityRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {/* Icon Box */}
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: config.color + '15',
                        borderColor: config.color + '30',
                      },
                    ]}
                  >
                    <Ionicons name={config.icon} size={18} color={config.color} />
                  </View>

                  {/* Middle Column: Title & Subtitle */}
                  <View style={styles.infoCol}>
                    <View style={[styles.typeBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text
                        style={[
                          styles.activityTitle,
                          { color: colors.darkBlue, textAlign },
                          isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                        ]}
                        numberOfLines={1}
                      >
                        {toEnglishDigits(item.title)}
                      </Text>
                      {item.discount && item.discount > 0 ? (
                        <View style={[styles.discountTag, { backgroundColor: '#A855F718' }]}>
                          <Text style={[styles.discountTagText, { writingDirection: 'ltr' }]}>
                            %{toEnglishDigits(Math.round((item.discount / (item.amount + item.discount)) * 100))}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text
                      style={[
                        styles.activitySubtitle,
                        { color: colors.gray400, textAlign },
                      ]}
                      numberOfLines={1}
                    >
                      {item.subtitle}
                    </Text>
                  </View>

                  {/* Left Column (in RTL): Amount & Time */}
                  <View style={styles.metaCol}>
                    {item.amount > 0 ? (
                      <View style={[styles.amountRow, { justifyContent: isRTL ? 'flex-start' : 'flex-end' }]}>
                        <AmountText
                          value={item.amount}
                          style={[
                            styles.amountText,
                            {
                              color:
                                config.sign === '+'
                                  ? colors.success
                                  : config.sign === '-'
                                  ? colors.error
                                  : colors.darkBlue,
                            },
                          ]}
                          variant="small"
                        />
                        <Text
                          style={[
                            styles.currencyMini,
                            {
                              color:
                                config.sign === '+'
                                  ? colors.success
                                  : config.sign === '-'
                                  ? colors.error
                                  : colors.darkBlue,
                            },
                          ]}
                        >
                          {' '}
                          د.ع
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, { backgroundColor: config.color + '18' }]}>
                        <Text style={[styles.statusBadgeText, { color: config.color }]}>
                          {config.label}
                        </Text>
                      </View>
                    )}

                    <View style={[styles.timeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons name="time-outline" size={10} color={colors.gray400} />
                      <Text style={[styles.timeText, { color: colors.gray400, writingDirection: 'ltr' }]}>
                        {timeStr}
                      </Text>
                    </View>
                  </View>
                </View>

                {!isLast && (
                  <View
                    style={[
                      styles.rowDivider,
                      { backgroundColor: isDark ? colors.gray200 : colors.gray100 },
                    ]}
                  />
                )}
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 36,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleGroup: {
    alignItems: 'center',
    gap: 8,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  periodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  containerCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  activityRow: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  typeBadgeRow: {
    alignItems: 'center',
    gap: 6,
  },
  activityTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  activitySubtitle: {
    fontSize: 11.5,
  },
  discountTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  discountTagText: {
    color: '#A855F7',
    fontSize: 10,
    fontWeight: '700',
  },
  metaCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  amountText: {
    fontSize: 13,
    fontWeight: '800',
  },
  currencyMini: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  timeRow: {
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 10.5,
  },
  rowDivider: {
    height: 1,
    marginHorizontal: 4,
  },
  centerBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12.5,
  },
});
