import React, { useMemo } from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  categories: string[];
  onScanPress?: () => void;
}

export function ProductSearchBar({
  query,
  onQueryChange,
  selectedCategory,
  onCategoryChange,
  categories,
  onScanPress,
}: Props) {
  const { t } = useTranslation();
  const { isRTL, textAlign, writingDirection, flexDirection } = useRTL();
  const { colors } = useAppTheme();
  const { isTablet } = useResponsive();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const isKurdish = resolveInputIsKurdish({ isKuLanguage, value: query });
  const styles = useMemo(() => getStyles(colors, isTablet), [colors, isTablet]);
  const allCategories = ['all', ...categories];

  return (
    <View style={styles.container}>
      <View style={[styles.searchBox, { flexDirection }]}>
        <Ionicons name="search" size={isTablet ? 22 : 18} color={colors.gray400} style={styles.icon} />
        <TextInput
          style={[styles.input, { textAlign, writingDirection }, isKuLanguage && applyKurdishFont(isKurdish, {})]}
          value={query}
          onChangeText={onQueryChange}
          placeholder={t('sales.searchProducts')}
          placeholderTextColor={colors.gray400}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {onScanPress && (
          <TouchableOpacity
            onPress={onScanPress}
            style={styles.scanBtn}
            hitSlop={10}
            activeOpacity={0.7}
          >
            <Ionicons name="barcode-outline" size={isTablet ? 24 : 20} color={colors.primary} />
          </TouchableOpacity>
        )}
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

function getStyles(colors: AppColors, isTablet: boolean) {
  return StyleSheet.create({
    container: {
      backgroundColor:   colors.white,
      paddingHorizontal: isTablet ? 20 : 16,
      paddingTop:        isTablet ? 16 : 12,
      paddingBottom:     6,
      borderBottomWidth: 1,
      borderBottomColor: colors.gray100,
    },
    searchBox: {
      flexDirection:     'row',
      alignItems:        'center',
      backgroundColor:   colors.gray50,
      borderRadius:      isTablet ? 16 : 12,
      borderWidth:       1,
      borderColor:       colors.gray200,
      paddingHorizontal: 14,
      height:            isTablet ? 54 : 44,
      marginBottom:      isTablet ? 12 : 10,
    },
    icon:  { marginEnd: 8 },
    input: { flex: 1, fontSize: isTablet ? 17 : 15, color: colors.black },
    scanBtn: {
      padding: 4,
      marginStart: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chips: { paddingBottom: 10, gap: 8 },
    chip: {
      paddingHorizontal: isTablet ? 18 : 14,
      paddingVertical:   isTablet ? 10 : 6,
      borderRadius:      isTablet ? 24 : 20,
      borderWidth:       1,
    },
    chipText: { fontSize: isTablet ? 15 : 13, fontWeight: '500' },
  });
}
