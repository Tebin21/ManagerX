import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, Keyboard, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { SaleHistoryItem } from '@/components/sales/SaleHistoryItem';
import { useTranslation } from 'react-i18next';
import { useSalesStore } from '@/store/salesStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';
import { useLanguageStore } from '@/store/languageStore';
import { containsKurdishScript, applyKurdishFont } from '@/lib/settingsFont';
import type { Sale } from '@/types/sales';

export default function SalesHistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { isRTL, flexDirection } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const { sales, searchSales, loadSales, isLoading } = useSalesStore();

  const [query, setQuery] = useState('');

  useEffect(() => { loadSales(); }, []);

  // The search input's own text direction follows what's actually being
  // typed (Kurdish -> RTL, English/numbers -> LTR) rather than the app's
  // language setting, so it works correctly for mixed-language searches.
  // The surrounding row (icon/clear button position) stays anchored to the
  // app language so the bar itself doesn't jump around while typing.
  const queryIsKurdish = useMemo(() => containsKurdishScript(query), [query]);
  const searchIsRTL = query.length > 0 ? queryIsKurdish : isRTL;
  // Font follows the typed content once there's a query; with an empty
  // field it follows the app language instead, so the (Kurdish) placeholder
  // renders in the app's standard Kurdish font like every other label.
  const inputFontIsKurdish = query.length > 0 ? queryIsKurdish : isKuLanguage;

  const results = useMemo(
    () => (query.trim() ? searchSales(query) : sales),
    [query, sales, searchSales]
  );

  const renderItem = useCallback(
    ({ item }: { item: Sale }) => (
      <SaleHistoryItem sale={item} onPress={() => router.push(`/(app)/sales/${item.id}` as never)} />
    ),
    [router]
  );

  const hasQuery = query.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('sales.history')} />

      <View style={[styles.searchWrap, { backgroundColor: colors.white, flexDirection }]}>
        <Ionicons name="search" size={16} color={colors.gray400} style={styles.searchIcon} />
        <TextInput
          style={[
            styles.searchInput,
            {
              color: colors.black,
              textAlign: searchIsRTL ? 'right' : 'left',
              writingDirection: searchIsRTL ? 'rtl' : 'ltr',
            },
            applyKurdishFont(inputFontIsKurdish, {}),
          ]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('sales.searchHistoryPlaceholder')}
          placeholderTextColor={colors.gray400}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, results.length === 0 && styles.listEmpty]}
        removeClippedSubviews
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
        ListEmptyComponent={
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 250 }}
            style={styles.empty}
          >
            <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
              <Ionicons name={hasQuery ? 'search-outline' : 'receipt-outline'} size={40} color={colors.gray300} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.black, textAlign: 'center' }]}>
              {isLoading ? t('common.loading') : hasQuery ? t('inventory.noResults') : t('sales.noHistory')}
            </Text>
            {!isLoading && (
              <Text style={[styles.emptySub, { color: colors.gray400 }]}>
                {hasQuery ? t('inventory.noResultsSub') : t('sales.noHistoryDetail')}
              </Text>
            )}
          </MotiView>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  searchWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    borderRadius:      Theme.radius.lg,
    marginHorizontal:  16,
    marginTop:         8,
    marginBottom:      Theme.spacing.sm,
    paddingHorizontal: 12,
    height:            44,
    gap:               8,
    ...Theme.shadow.soft,
  },
  searchIcon:  { flexShrink: 0 },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },

  list:      { padding: 16, paddingBottom: 24 },
  listEmpty: { flex: 1 },

  empty: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingTop:        60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width:          88,
    height:         88,
    borderRadius:   24,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
