import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/settings/SettingsText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';

interface Props {
  title:    string;
  children: React.ReactNode;
}

const IS_IOS = Platform.OS === 'ios';

export function SettingSection({ title, children }: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const { isTablet } = useResponsive();

  const iconWidth = isTablet ? 44 : 34;
  const dividerOffset = iconWidth + (isRTL ? (isTablet ? 16 : RTL_SPACING.gapXl) : (isTablet ? 16 : 12));
  const cardPadding = isTablet ? 22 : (isRTL ? RTL_SPACING.cardPad : 16);

  // On iOS: Liquid Glass card (frosted specular highlight, translucent depth)
  // On Android: Classic opaque card layout exactly as original
  const cardStyle = IS_IOS
    ? [
        styles.glassCard,
        {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.68)' : 'rgba(255, 255, 255, 0.72)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.85)',
          shadowColor: isDark ? '#000000' : '#0F172A',
          paddingHorizontal: cardPadding,
          borderRadius: isTablet ? 24 : 20,
        },
      ]
    : [
        styles.card,
        {
          backgroundColor: colors.gray100,
          borderColor: colors.gray200,
          paddingHorizontal: cardPadding,
          borderRadius: isTablet ? 18 : 14,
        },
      ];

  const dividerColor = IS_IOS
    ? (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)')
    : colors.gray200;

  return (
    <View style={[styles.section, isTablet && styles.sectionTablet]}>
      <Text style={[styles.header, isTablet && styles.headerTablet, { color: colors.gray400, textAlign }]}>
        {title.toUpperCase()}
      </Text>
      <View style={cardStyle}>
        {/* Specular Liquid Glass sheen reflection (iOS only) */}
        {IS_IOS && (
          <LinearGradient
            colors={
              isDark
                ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.01)', 'rgba(255, 255, 255, 0.04)']
                : ['rgba(255, 255, 255, 0.60)', 'rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.22)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
        )}
        {React.Children.map(children, (child, i) => {
          const isLast = i === React.Children.count(children) - 1;
          return (
            <View key={i}>
              {child}
              {!isLast ? (
                <View style={[styles.divider, { backgroundColor: dividerColor, marginStart: dividerOffset }]} />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 12 },
  sectionTablet: { marginBottom: 20 },
  header: {
    fontSize:      12,
    fontWeight:    '700',
    letterSpacing: 0.5,
    marginBottom:  8,
    paddingStart:  4,
  },
  headerTablet: {
    fontSize:      14,
    marginBottom:  10,
  },
  card: {
    borderRadius: 14,
    borderWidth:  1,
    overflow: 'hidden',
  },
  glassCard: {
    borderRadius: 20,
    borderWidth: 1.2,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
  },
  divider: { height: 1 },
});
