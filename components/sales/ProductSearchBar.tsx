import React from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  categories: string[];
}

export function ProductSearchBar({
  query,
  onQueryChange,
  selectedCategory,
  onCategoryChange,
  categories,
}: Props) {
  const { t } = useTranslation();
  const { isRTL, textAlign, writingDirection, flexDirection } = useRTL();
  const { colors } = useAppTheme();
  const allCategories = ['all', ...categories];

  return (
    <View style={styles.container}>
      <View style={[styles.searchBox, { flexDirection }]}>
        <Ionicons name="search" size={18} color={Colors.gray400} style={styles.icon} />
        <TextInput
          style={[styles.input, { textAlign, writingDirection }]}
          value={query}
          onChangeText={onQueryChange}
          placeholder={t('sales.searchProducts')}
          placeholderTextColor={Colors.gray400}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
          contentContainerStyle={styles.chips}
        >
          {allCategories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => onCategoryChange(cat)}
                style={[
                  styles.chip,
                  isRTL && { transform: [{ scaleX: -1 }] },
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: Colors.gray100, borderColor: Colors.gray200 },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? '#FFFFFF' : Colors.gray600 }]}>
                  {cat === 'all' ? t('sales.allCategories') : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor:   '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop:        12,
    paddingBottom:     4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  searchBox: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   Colors.gray50,
    borderRadius:      12,
    borderWidth:       1,
    borderColor:       Colors.gray200,
    paddingHorizontal: 12,
    height:            44,
    marginBottom:      10,
  },
  icon:  { marginEnd: 8 },
  input: { flex: 1, fontSize: 15, color: Colors.black },
  chips: { paddingBottom: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical:   6,
    borderRadius:      20,
    borderWidth:       1,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
});
