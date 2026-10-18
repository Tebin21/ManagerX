import React, { type ComponentProps } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { fmtEnNumber } from '@/utils/formatters';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';

interface Props {
  title: string;
  value: number;
  isCurrency?: boolean;
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
  subtitle?: string;
  isAlert?: boolean;
  delay?: number;
  containerStyle?: StyleProp<ViewStyle>;
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
  containerStyle,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const { isTablet, isTabletLandscape } = useResponsive();

  const cardBg = isDark ? colors.gray100 : colors.white;
  const borderColor = isAlert
    ? colors.error + '50'
    : isDark
    ? colors.gray200
    : colors.gray100;

  const widthStyle: ViewStyle = {
    width: isTabletLandscape ? '23.8%' : isTablet ? '31.8%' : '48.5%',
    marginBottom: isTablet ? 12 : 10,
  };

  const iconBoxDim = isTabletLandscape ? 46 : isTablet ? 42 : 38;
  const iconSize = isTabletLandscape ? 24 : isTablet ? 22 : 20;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95, translateY: 10 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 320, delay }}
      style={[styles.container, widthStyle, containerStyle]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor,
            minHeight: isTabletLandscape ? 148 : isTablet ? 134 : 120,
            padding: isTabletLandscape ? 16 : isTablet ? 15 : 14,
          },
        ]}
      >
        {/* Top row with icon & subtitle badge */}
        <View style={[styles.topRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.iconBox,
              {
                width: iconBoxDim,
                height: iconBoxDim,
                borderRadius: isTabletLandscape ? 14 : 12,
                backgroundColor: color + '15',
                borderColor: color + '30',
              },
            ]}
          >
            <Ionicons name={icon} size={iconSize} color={color} />
          </View>

          {subtitle ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: color + '12',
                  paddingHorizontal: isTabletLandscape ? 10 : 8,
                  paddingVertical: isTabletLandscape ? 4 : 3,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color, fontSize: isTabletLandscape ? 12 : 10.5 },
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
            {
              color: colors.gray400,
              textAlign,
              fontSize: isTabletLandscape ? 14.5 : isTablet ? 13.5 : 12.5,
            },
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
                  fontSize: isTabletLandscape ? 24 : isTablet ? 21 : 19,
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
                  fontSize: isTabletLandscape ? 24 : isTablet ? 21 : 19,
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
