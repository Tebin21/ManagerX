import React from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import { useResponsive } from '@/hooks/useResponsive';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';
import i18n from '@/lib/i18n';

interface LoadingViewProps {
  /** Optional custom message. Defaults to localized 'common.pleaseWait' ("چاوەڕێ بە...") */
  message?: string;
  /** Optional secondary subtitle */
  submessage?: string;
  /** Spinner size */
  size?: 'small' | 'large';
  /** Compact inline mode without wide container padding */
  compact?: boolean;
  /** Whether to show a frosted glass background card around the spinner */
  showCard?: boolean;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Custom text style */
  textStyle?: StyleProp<TextStyle>;
}

export function LoadingView({
  message,
  submessage,
  size = 'large',
  compact = false,
  showCard = true,
  style,
  textStyle,
}: LoadingViewProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const lang = useLanguageStore((s) => s.language);
  const isKurdish = lang === 'ku' || (!lang && (i18n.language === 'ku' || !i18n.language));
  const { isTablet } = useResponsive();

  const label = message ?? (t('common.pleaseWait') || 'چاوەڕێ بە...');

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <ActivityIndicator size={size} color={colors.primary} />
        <Text
          style={[
            styles.compactText,
            { color: isDark ? colors.gray300 : colors.gray700 },
            isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            textStyle,
          ]}
        >
          {label}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.fullContainer, style]}>
      {showCard ? (
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.82)' : 'rgba(255, 255, 255, 0.92)',
              borderColor: isDark ? hexToRgba(colors.primary, 0.28) : hexToRgba(colors.primary, 0.22),
              shadowColor: isDark ? '#000000' : colors.primary,
              paddingVertical: isTablet ? 36 : 28,
              paddingHorizontal: isTablet ? 44 : 32,
              minWidth: isTablet ? 260 : 200,
            },
          ]}
        >
          {/* Subtle gold ambient glow under spinner */}
          <View
            style={[
              styles.glowAura,
              { backgroundColor: hexToRgba(colors.primary, isDark ? 0.16 : 0.10) },
            ]}
          >
            <ActivityIndicator size={size} color={colors.primary} />
          </View>

          <Text
            style={[
              styles.messageText,
              {
                color: isDark ? '#F8FAFC' : '#0F172A',
                fontSize: isTablet ? 17 : 15,
              },
              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              textStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>

          {submessage ? (
            <Text
              style={[
                styles.submessageText,
                {
                  color: colors.gray400,
                  fontSize: isTablet ? 13.5 : 12,
                },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
              ]}
              numberOfLines={2}
            >
              {submessage}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.contentWrap}>
          <View
            style={[
              styles.glowAura,
              { backgroundColor: hexToRgba(colors.primary, isDark ? 0.16 : 0.10) },
            ]}
          >
            <ActivityIndicator size={size} color={colors.primary} />
          </View>

          <Text
            style={[
              styles.messageText,
              {
                color: isDark ? '#F8FAFC' : '#0F172A',
                fontSize: isTablet ? 17 : 15,
              },
              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              textStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>

          {submessage ? (
            <Text
              style={[
                styles.submessageText,
                {
                  color: colors.gray400,
                  fontSize: isTablet ? 13.5 : 12,
                },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
              ]}
              numberOfLines={2}
            >
              {submessage}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1.2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  contentWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowAura: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  messageText: {
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  submessageText: {
    marginTop: 6,
    textAlign: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  compactText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
});
