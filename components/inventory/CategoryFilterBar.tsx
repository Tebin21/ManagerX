import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import i18n from '@/lib/i18n';

interface Props {
  categories: string[];
  selected: string;
  onSelect: (cat: string) => void;
}

export function CategoryFilterBar({ categories, selected, onSelect }: Props) {
  const { colors } = useAppTheme();
  const { flexDirection } = useRTL();
  const all = ['all', ...categories];

  function categoryLabel(cat: string): string {
    if (cat === 'all') return i18n.t('inventory.filterAll');
    return i18n.t(`purchases.categories.${cat}`, { defaultValue: cat });
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { flexDirection }]}
    >
      {all.map((cat) => {
        const active = selected === cat;
        return (
          <TouchableOpacity
            key={cat}
            onPress={() => onSelect(cat)}
            style={[
              styles.chip,
              active
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: Colors.white, borderColor: Colors.gray200 },
            ]}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, { color: active ? '#FFFFFF' : Colors.gray600 }]}>
              {categoryLabel(cat)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    gap:               8,
    paddingVertical:   2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      Theme.radius.full,
    borderWidth:       1.5,
  },
  chipText: {
    fontSize:   13,
    fontWeight: '600',
  },
});
