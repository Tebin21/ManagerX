import React, { useState, useEffect } from 'react';
import { View, FlatList, Keyboard, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';

import { AppHeader } from '@/components/common/AppHeader';
import { CheckPriceRow } from '@/components/sales/CheckPriceRow';
import { ProductSearchBar } from '@/components/sales/ProductSearchBar';
import { useTranslation } from 'react-i18next';
import { useInventoryStore } from '@/store/inventoryStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import type { Product } from '@/types/sales';

export default function CheckPriceScreen() {
  const { t } = useTranslation();
  const { textAlign } = useRTL();
  const { colors } = useAppTheme();
  const { searchProducts, categories, loadInventory, isLoading } = useInventoryStore();

  const [query, setQuery]                     = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [results, setResults]                 = useState<Product[]>([]);

  useEffect(() => { loadInventory(); }, []);

  useEffect(() => {
    setResults(searchProducts(query, selectedCategory));
  }, [query, selectedCategory, searchProducts]);

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('sales.checkPrice')} />

      <ProductSearchBar
        query={query}
        onQueryChange={setQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
      />

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <CheckPriceRow product={item} />}
        contentContainerStyle={styles.list}
        onScrollBeginDrag={() => Keyboard.dismiss()}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.gray500, textAlign }]}>
              {isLoading ? t('common.loading') : query ? t('inventory.noResults') : t('sales.checkPrice')}
            </Text>
            {!isLoading && !query && (
              <Text style={[styles.emptySub, { color: colors.gray400 }]}>{t('sales.checkPriceSub')}</Text>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  header:     { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  list:       { padding: 16, paddingBottom: 24 },
  empty:      { paddingTop: 60, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySub:   { fontSize: 13, textAlign: 'center' },
});
