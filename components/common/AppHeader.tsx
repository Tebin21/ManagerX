import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/AppText';
import { BackButton } from './BackButton';
import { useAppTheme } from '@/contexts/ThemeContext';

interface Props {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  onBack?: () => void;
  /** Optional content rendered inside the gradient below the title row (e.g. step indicators) */
  children?: React.ReactNode;
  /** Override gradient colours — defaults to the theme gradient */
  gradient?: [string, string];
}

/**
 * Unified header for ALL internal screens (everything except dashboard).
 *
 * Layout is ALWAYS physically left-to-right:
 *   [back button | centered title | right action]
 *
 * This never changes for RTL (Kurdish) mode — only text content is translated.
 * Equal-width side panels guarantee the title is always perfectly centered.
 */
export function AppHeader({
  title,
  showBack = true,
  rightAction,
  onBack,
  children,
  gradient,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const gradColors = gradient ?? [colors.gradientStart, colors.gradientMid];

  return (
    <LinearGradient
      colors={gradColors}
      style={[styles.gradient, { paddingTop: insets.top }]}
    >
      <View style={styles.row}>
        {/* Always physically LEFT — back button or empty spacer */}
        <View style={styles.side}>
          {showBack ? <BackButton onPress={onBack} /> : null}
        </View>

        {/* Center — title always centered between the two equal-width sides */}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {/* Always physically RIGHT — action button or empty spacer */}
        <View style={styles.side}>
          {rightAction ?? null}
        </View>
      </View>

      {/* Extra gradient content (e.g. step indicators, search bars) */}
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderBottomLeftRadius:  24,
    borderBottomRightRadius: 24,
  },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 12,
    paddingVertical:   14,
    minHeight:         56,
  },
  side: {
    width:          44,
    alignItems:     'center',
    justifyContent: 'center',
  },
  title: {
    flex:          1,
    textAlign:     'center',
    fontSize:      17,
    fontWeight:    '700',
    color:         '#FFFFFF',
    letterSpacing: 0.15,
  },
});
