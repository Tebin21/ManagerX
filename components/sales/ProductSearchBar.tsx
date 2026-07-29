import React, { useMemo } from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish } from '@/lib/settingsFont';

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
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const isKurdish = resolveInputIsKurdish({ isKuLanguage, value: query });
  const styles = useMemo(() => getStyles(colors), [colors]);
  const allCategories = ['all', ...categories];

  return (
    <View style={styles.container}>
      <View style={[styles.searchBox, { flexDirection }]}>
        <Ionicons name="search" size={18} color={colors.gray400} style={styles.icon} />
        <TextInput
          style={[styles.input, { textAlign, writingDirection }, isKuLanguage && applyKurdishFont(isKurdish, {})]}
          value={query}
          onChangeText={onQueryChange}
          placeholder={t('sales.searchProducts')}
          placeholderTextColor={colors.gray400}
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
                    : { backgroundColor: colors.gray100, borderColor: colors.gray200 },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? colors.white : colors.gray600 }]}>
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

function getStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      backgroundColor:   colors.white,
      paddingHorizontal: 16,
      paddingTop:        12,
      paddingBottom:     4,
      borderBottomWidth: 1,
      borderBottomColor: colors.gray100,
    },
    searchBox: {
      flexDirection:     'row',
      alignItems:        'center',
      backgroundColor:   colors.gray50,
      borderRadius:      12,
      borderWidth:       1,
      borderColor:       colors.gray200,
      paddingHorizontal: 12,
      height:            44,
      marginBottom:      10,
    },
    icon:  { marginEnd: 8 },
    input: { flex: 1, fontSize: 15, color: colors.black },
    chips: { paddingBottom: 10, gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical:   6,
      borderRadius:      20,
      borderWidth:       1,
    },
    chipText: { fontSize: 13, fontWeight: '500' },
  });
}
