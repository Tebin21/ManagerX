import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  Keyboard,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/AppText';
import { AppHeader } from '@/components/common/AppHeader';
import { CheckPriceRow } from '@/components/sales/CheckPriceRow';
import { ProductSearchBar } from '@/components/sales/ProductSearchBar';
import { BarcodeScannerModal } from '@/components/shared/BarcodeScannerModal';
import { PriceCheckModal } from '@/components/sales/PriceCheckModal';
import { useInventoryStore } from '@/store/inventoryStore';
import { useLanguageStore } from '@/store/languageStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { applyKurdishFont } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import type { Product } from '@/types/sales';

export default function CheckPriceScreen() {
  const { t } = useTranslation();
  const { textAlign } = useRTL();
  const { colors } = useAppTheme();
  const { isTablet, cardColumns, contentContainerStyle } = useResponsive();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const { products, categories, loadInventory, isLoading } = useInventoryStore();

  const [query, setQuery]                         = useState('');
  const [selectedCategory, setSelectedCategory]   = useState('all');
  const [scannerOpen, setScannerOpen]             = useState(false);
  const [inspectedProduct, setInspectedProduct]   = useState<Product | null>(null);

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = query.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCategory =
        !selectedCategory || selectedCategory === 'all' || p.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!q) return true;

      return (
        p.name.toLowerCase().includes(q) ||
        (p.itemId?.toLowerCase().includes(q) ?? false) ||
        (p.itemDescription?.toLowerCase().includes(q) ?? false) ||
        String(p.id) === q
      );
    });
  }, [products, query, selectedCategory]);

  const handleBarcodeScanned = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;
    const lowerCode = cleanCode.toLowerCase();

    // 1. Exact match on itemId
    // 2. Exact match on id
    // 3. Exact match on name
    // 4. Partial match on itemId
    // 5. Partial match on name
    const found =
      products.find(
        (p) => p.itemId && p.itemId.trim().toLowerCase() === lowerCode
      ) ||
      products.find(
        (p) => String(p.id) === cleanCode
      ) ||
      products.find(
        (p) => p.name.trim().toLowerCase() === lowerCode
      ) ||
      products.find(
        (p) => p.itemId && p.itemId.toLowerCase().includes(lowerCode)
      ) ||
      products.find(
        (p) => p.name.toLowerCase().includes(lowerCode)
      );

    if (found) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setScannerOpen(false);
      setInspectedProduct(found);
    } else {
      setScannerOpen(false);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
      Alert.alert(
        isKuLanguage ? 'نەدۆزرایەوە' : 'Not Found',
        isKuLanguage
          ? `هیچ کاڵایەک نەدۆزرایەوە بەم بارکۆدە: ${cleanCode}`
          : `No product found for barcode: ${cleanCode}`,
        [
          {
            text: isKuLanguage ? 'دووبارە سکانکردنەوە' : 'Scan Again',
            onPress: () => setScannerOpen(true),
          },
          {
            text: isKuLanguage ? 'داخستن' : 'Close',
            style: 'cancel',
          },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('sales.checkPrice')}
        rightAction={
          <TouchableOpacity
            onPress={() => setScannerOpen(true)}
            style={styles.headerScanBtn}
            activeOpacity={0.8}
            hitSlop={6}
          >
            <Ionicons name="barcode-outline" size={19} color="#FFFFFF" />
            <Text
              style={[
                styles.headerScanBtnText,
                isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
              ]}
            >
              {isKuLanguage ? 'سکان' : 'Scan'}
            </Text>
          </TouchableOpacity>
        }
      />

      <ProductSearchBar
        query={query}
        onQueryChange={setQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        onScanPress={() => setScannerOpen(true)}
      />

      <FlatList
        key={`check-price-grid-${cardColumns}`}
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        numColumns={cardColumns}
        columnWrapperStyle={isTablet ? { gap: 12 } : undefined}
        renderItem={({ item }) => (
          <CheckPriceRow
            product={item}
            onPress={() => setInspectedProduct(item)}
          />
        )}
        contentContainerStyle={[styles.list, isTablet && contentContainerStyle]}
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

      {/* Barcode Scanner Camera Modal */}
      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        mode="single"
        title={isKuLanguage ? 'سکانی بەرهەم بۆ پشکنینی نرخ' : 'Scan Product to Check Price'}
        subtitle={
          isKuLanguage
            ? 'بارکۆدەکە بخەرە بەرامبەر کامێرا بۆ دەرکەوتنی نرخ و زانیاری'
            : 'Point camera at barcode to inspect price and details'
        }
        onScanSingle={handleBarcodeScanned}
      />

      {/* Detailed Price & Profit Inspection Modal */}
      <PriceCheckModal
        visible={!!inspectedProduct}
        product={inspectedProduct}
        onClose={() => setInspectedProduct(null)}
        onScanAnother={() => {
          setInspectedProduct(null);
          setScannerOpen(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.24)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
  },
  headerScanBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
  },
});
