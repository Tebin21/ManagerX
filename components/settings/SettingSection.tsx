import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING } from '@/lib/rtl';

interface Props {
  title:    string;
  children: React.ReactNode;
}

// Must match SettingRow/SettingSwitch's iconWrap width (34) — the divider
// lines up under the row text, not the icon, in both LTR and RTL.
const ICON_WIDTH = 34;

export function SettingSection({ title, children }: Props) {
  const { colors } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const dividerOffset = ICON_WIDTH + (isRTL ? RTL_SPACING.gapXl : 12);
  const cardPadding = isRTL ? RTL_SPACING.cardPad : 16;

  return (
    <View style={styles.section}>
      <Text style={[styles.header, { color: colors.gray400, textAlign }]}>
        {title.toUpperCase()}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.gray100, borderColor: colors.gray200, paddingHorizontal: cardPadding }]}>
        {React.Children.map(children, (child, i) => {
          const isLast = i === React.Children.count(children) - 1;
          return (
            <View key={i}>
              {child}
              {!isLast ? (
                <View style={[styles.divider, { backgroundColor: colors.gray200, marginStart: dividerOffset }]} />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 8 },
  header: {
    fontSize:      12,
    fontWeight:    '700',
    letterSpacing: 0.5,
    marginBottom:  8,
    paddingStart:  4,
  },
  card: {
    borderRadius: 14,
    borderWidth:  1,
    overflow: 'hidden',
  },
  divider: { height: 1 },
});
