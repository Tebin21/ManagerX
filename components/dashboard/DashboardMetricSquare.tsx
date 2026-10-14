import React, { type ComponentProps } from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { fmtEnNumber } from '@/utils/formatters';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

interface Props {
  title: string;
  value: number;
  isCurrency?: boolean;
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
  subtitle?: string;
  isAlert?: boolean;
  delay?: number;
}

export function DashboardMetricSquare({
  title,
  value,
  isCurrency = false,
  icon,
  color,
  subtitle,
  isAlert = false,
  delay = 0,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const cardBg = isDark ? colors.gray100 : colors.white;
  const borderColor = isAlert
    ? colors.error + '50'
    : isDark
    ? colors.gray200
    : colors.gray100;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95, translateY: 10 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 320, delay }}
      style={styles.container}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor,
          },
        ]}
      >
        {/* Top row with icon & subtitle badge */}
        <View style={[styles.topRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: color + '15',
                borderColor: color + '30',
              },
            ]}
          >
            <Ionicons name={icon} size={20} color={color} />
          </View>

          {subtitle ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: color + '12',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Metric Label */}
        <Text
          style={[
            styles.title,
            { color: colors.gray400, textAlign },
            isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Big Number / Value */}
        <View style={[styles.valueRow, { justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}>
          {isCurrency ? (
            <AmountText
              value={Math.abs(value)}
              style={[
                styles.valueText,
                {
                  color: isAlert
                    ? colors.error
                    : value < 0
                    ? colors.error
                    : colors.darkBlue,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            />
          ) : (
            <Text
              style={[
                styles.valueText,
                styles.enDigitText,
                {
                  color: isAlert && value > 0 ? colors.error : colors.darkBlue,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {fmtEnNumber(value)}
            </Text>
          )}
        </View>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48.5%',
    marginBottom: 10,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    minHeight: 120,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  topRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  title: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  valueText: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  currencyText: {
    fontSize: 11,
    fontWeight: '700',
    marginStart: 3,
  },
  enDigitText: {
    writingDirection: 'ltr',
    fontVariant: ['tabular-nums'],
  },
});
