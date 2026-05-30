import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';

interface Props {
  title:    string;
  children: React.ReactNode;
}

export function SettingSection({ title, children }: Props) {
  const { colors } = useAppTheme();
  const { textAlign } = useRTL();

  return (
    <View style={styles.section}>
      <Text style={[styles.header, { color: colors.gray400, textAlign }]}>
        {title.toUpperCase()}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.gray100, borderColor: colors.gray200 }]}>
        {React.Children.map(children, (child, i) => {
          const isLast = i === React.Children.count(children) - 1;
          return (
            <View key={i}>
              {child}
              {!isLast ? (
                <View style={[styles.divider, { backgroundColor: colors.gray200 }]} />
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
    paddingLeft:   4,
  },
  card: {
    borderRadius: 14,
    borderWidth:  1,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  divider: { height: 1, marginLeft: 46 },
});
