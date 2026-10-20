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
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { applyKurdishFont } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import type { Product } from '@/types/sales';

type ProductOrFiller = Product | { id: string; isFiller: true };

export default function CheckPriceScreen() {
  const { t } = useTranslation();
  const { textAlign, isRTL } = useRTL();
  const { colors } = useAppTheme();
  const { isTablet, isTabletLandscape, contentContainerStyle } = useResponsive();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const { products, categories, loadInventory, isLoading } = useInventoryStore();

  const checkPriceGridLayout = useSettingsStore((s) => s.checkPriceGridLayout);
  const setCheckPriceGridLayout = useSettingsStore((s) => s.setCheckPriceGridLayout);

  const [query, setQuery]                       = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [scannerOpen, setScannerOpen]           = useState(false);
  const [inspectedProduct, setInspectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadInventory();
  }, []);

  const isGridView = checkPriceGridLayout;
  const numColumns = isGridView
    ? (isTabletLandscape ? 4 : isTablet ? 3 : 2)
    : 1;

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

  // Balance out incomplete rows in grid view with transparent fillers
  const gridFormattedProducts: ProductOrFiller[] = useMemo(() => {
    if (!isGridView || numColumns <= 1 || filteredProducts.length === 0) {
      return filteredProducts;
    }
    const remainder = filteredProducts.length % numColumns;
    if (remainder === 0) return filteredProducts;
    const needed = numColumns - remainder;
    const fillers: ProductOrFiller[] = Array.from({ length: needed }, (_, i) => ({
      id: `__grid_filler_${i}`,
      isFiller: true as const,
    }));
    return [...filteredProducts, ...fillers];
  }, [filteredProducts, isGridView, numColumns]);

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: isTablet ? 10 : 8 }}>
            {/* Grid vs List Layout Toggle Button (گۆڕینی نێوان چوارگۆشە و درێژ) */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                } catch {}
                setCheckPriceGridLayout(!checkPriceGridLayout);
              }}
              style={[
                styles.layoutToggleBtn,
                isTablet && { width: 44, height: 44, borderRadius: 22 },
              ]}
              accessibilityLabel={checkPriceGridLayout ? 'List View' : 'Grid View'}
            >
              <Ionicons
                name={checkPriceGridLayout ? 'list' : 'grid'}
                size={isTablet ? 22 : 18}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {/* Scan Barcode Button */}
            <TouchableOpacity
              onPress={() => setScannerOpen(true)}
              style={[
                styles.headerScanBtn,
                isTablet && { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
              ]}
              activeOpacity={0.8}
              hitSlop={6}
            >
              <Ionicons name="barcode-outline" size={isTablet ? 22 : 19} color="#FFFFFF" />
              <Text
                style={[
                  styles.headerScanBtnText,
                  isTablet && { fontSize: 14 },
                  isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
                ]}
              >
                {isKuLanguage ? 'سکان' : 'Scan'}
              </Text>
            </TouchableOpacity>
          </View>
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
        key={`check-price-${isGridView ? 'grid' : 'list'}-${numColumns}-${isRTL ? 'rtl' : 'ltr'}`}
        data={gridFormattedProducts}
        keyExtractor={(item) => String(item.id)}
        numColumns={numColumns}
        columnWrapperStyle={
          numColumns > 1
            ? {
                gap: isTablet ? 12 : 10,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }
            : undefined
        }
        renderItem={({ item }) => {
          if ('isFiller' in item && item.isFiller) {
            return (
              <View
                style={{
                  flex: 1,
                  marginBottom: isTablet ? 12 : 10,
                  backgroundColor: 'transparent',
                }}
                pointerEvents="none"
              />
            );
          }
          const product = item as Product;
          return (
            <CheckPriceRow
              product={product}
              layout={isGridView ? 'grid' : 'list'}
              onPress={() => setInspectedProduct(product)}
            />
          );
        }}
        contentContainerStyle={[
          styles.list,
          isTablet && contentContainerStyle,
          { paddingBottom: isTablet ? 120 : 90 },
        ]}
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
  layoutToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
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
