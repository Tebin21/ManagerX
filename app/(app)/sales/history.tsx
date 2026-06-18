import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';

import { AppHeader } from '@/components/common/AppHeader';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { SaleHistoryItem } from '@/components/sales/SaleHistoryItem';
import { useTranslation } from 'react-i18next';
import { useSalesStore } from '@/store/salesStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';

export default function SalesHistoryScreen() {
  const router  = useRouter();
  const { t } = useTranslation();
  const { textAlign } = useRTL();
  const { colors } = useAppTheme();
  const { searchSales, loadSales, isLoading } = useSalesStore();

  const [query, setQuery] = useState('');
  const results = searchSales(query);

  useEffect(() => { loadSales(); }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('sales.history')} />

      <View style={styles.searchBar}>
        <AppTextInput
          placeholder={t('sales.searchHistoryPlaceholder')}
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <SaleHistoryItem
            sale={item}
            onPress={() => router.push(`/(app)/sales/${item.id}` as never)}
          />
        )}
        contentContainerStyle={styles.list}
        removeClippedSubviews
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.gray500, textAlign }]}>
              {isLoading ? t('common.loading') : query ? t('sales.noProducts') : t('sales.noHistory')}
            </Text>
            {!isLoading && !query && (
              <Text style={[styles.emptySub, { color: colors.gray400 }]}>{t('sales.noHistoryDetail')}</Text>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  searchBar:   { paddingHorizontal: 16, paddingTop: 16 },
  searchInput: { marginBottom: 0 },
  list:        { padding: 16, paddingBottom: 24 },
  empty:       { paddingTop: 60, alignItems: 'center' },
  emptyTitle:  { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySub:    { fontSize: 13, textAlign: 'center' },
});
