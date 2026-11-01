'use client';

import { useMemo, useState } from 'react';
import type { StoreResponse } from '@/lib/storefront/storeApi';
import { getBrandCssVars } from '@/lib/storefront/theme';
import { ProductCard } from './ProductCard';
import { StoreHeader } from './StoreHeader';
import { StoreContactBanner } from './StoreContactBanner';
import { CategoryFilterBar } from './CategoryFilterBar';
import { StorefrontFooter } from './StorefrontFooter';

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 text-center text-sm font-semibold text-slate-500">
      {children}
    </div>
  );
}

interface Props {
  store: StoreResponse;
  slug?: string;
}

export function StorefrontView({ store, slug }: Props) {
  const [query, setQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const brandStyle = useMemo(() => getBrandCssVars(store.info.themeColor), [store.info.themeColor]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const p of store.products) {
      if (p.category && !seen.has(p.category)) {
        seen.add(p.category);
        ordered.push(p.category);
      }
    }
    return ordered;
  }, [store]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.products.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [store, query, selectedCategory]);

  const isRTL = useMemo(() => {
    const sample = `${store.businessName} ${store.info.description || ''} ${store.info.address || ''}`;
    return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(sample);
  }, [store]);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`flex min-h-screen flex-col bg-slate-50 transition-colors duration-200 dark:bg-slate-900 ${
        isRTL ? 'font-kurdish' : 'font-sans'
      }`}
      style={brandStyle}
    >
      {/* 1. Main Cover Banner + Store Name & Actions (Aligned directly with Store Name) + Expandable Search + Compact Social Banner */}
      <StoreHeader
        businessName={store.businessName}
        info={store.info}
        isSearchOpen={isSearchOpen}
        onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
        searchQuery={query}
        onSearchChange={setQuery}
      />

      {/* 2. Product Catalog */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">
        {!store.enabled ? (
          <div className="mx-auto my-12 max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-xs dark:border-amber-500/30 dark:bg-slate-800">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500 ring-8 ring-amber-50/50 dark:bg-amber-950 dark:ring-amber-900/30">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              ناچالاک کراوە / Inactive
            </span>
            <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">
              ئەم فڕۆشگایە بۆ ماوەیەکی کاتی ناچالاک کراوە
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              خاوەنی فڕۆشگاکە لە ئێستادا پێشاندانی کاڵاکانی ڕاگرتووە. تکایە دواتر سەردان بکەرەوە.
            </p>
            {store.info.phone || store.info.whatsappNumber ? (
              <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                بۆ پەیوەندیکردن، دەتوانیت پەیوەندی بە ژمارەی فڕۆشگاکە بکەیت لە خوارەوە.
              </p>
            ) : null}
          </div>
        ) : store.products.length === 0 ? (
          <CenteredMessage>هیچ کاڵایەک لەم فڕۆشگایە دانەنراوە.</CenteredMessage>
        ) : (
          <>
            {categories.length > 1 && (
              <div className="sticky top-0 z-20 mb-6 bg-slate-50/95 py-2.5 backdrop-blur-sm dark:bg-slate-900/95">
                <CategoryFilterBar
                  categories={categories}
                  selected={selectedCategory}
                  onSelect={setSelectedCategory}
                />
              </div>
            )}

            {filteredProducts.length === 0 ? (
              <CenteredMessage>هیچ کاڵایەک نەدۆزرایەوە کە لەگەڵ گەڕانەکەت بگونجێت.</CenteredMessage>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.productId} product={product} slug={slug} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* 3. Bottom Centered Contact & Address Banner */}
      <StoreContactBanner info={store.info} />

      {/* 4. Footer */}
      <StorefrontFooter />
    </div>
  );
}
