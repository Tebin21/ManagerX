import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/AppText';
import { BackButton } from './BackButton';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';

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
 * Layout in English (LTR):
 *   [back button | centered title | right action]
 *
 * Layout automatically mirrors in Kurdish (RTL):
 *   [right action | centered title | back button]
 *
 * Only the physical position of the back/action sides swaps — icons,
 * colours, spacing and styling stay exactly as designed. The title stays
 * centered in both directions since it's the flexible middle child.
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
  const { isRTL } = useRTL();
  const gradColors = gradient ?? [colors.gradientStart, colors.gradientMid];

  return (
    <LinearGradient
      colors={gradColors}
      style={[styles.gradient, { paddingTop: insets.top }]}
    >
      <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Physically LEFT in English, RIGHT in Kurdish — back button or empty spacer */}
        <View style={styles.side}>
          {showBack ? <BackButton onPress={onBack} /> : null}
        </View>

        {/* Center — title always centered between the two equal-width sides */}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {/* Physically RIGHT in English, LEFT in Kurdish — action button or empty spacer */}
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
    minWidth:       44,
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
