import { useMemo, useState } from 'react';
import type { StoreProduct, StoreResponse } from '../lib/api';
import { ProductCard } from './ProductCard';
import { StoreHeader } from './StoreHeader';
import { SearchBar } from './SearchBar';
import { CategoryFilterBar } from './CategoryFilterBar';

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

// Pure presentational rendering of a ready-to-display store — no fetching, no loading
// states. Shared by StorefrontPage.tsx (real, API-backed stores) and
// DemoStorefrontPage.tsx (hardcoded preview data, no backend calls).
export function StorefrontView({ store }: { store: StoreResponse }) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Distinct categories in first-seen order — derived from products, no separate
  // category endpoint needed (matches the existing "no pagination, fetch everything"
  // architecture).
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const p of store.products) {
      if (!seen.has(p.category)) {
        seen.add(p.category);
        ordered.push(p.category);
      }
    }
    return ordered;
  }, [store]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.products.filter((p) => {
      const matchesQuery = !q || p.name.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [store, query, selectedCategory]);

  // Grouped sections only make sense for the unfiltered "All" browse view — a search
  // or a single selected category reads better as one flat grid.
  const groupedByCategory = useMemo(() => {
    if (selectedCategory !== 'all' || query.trim()) return null;
    const groups = new Map<string, StoreProduct[]>();
    for (const p of filteredProducts) {
      const list = groups.get(p.category) ?? [];
      list.push(p);
      groups.set(p.category, list);
    }
    return categories.map((c) => [c, groups.get(c) ?? []] as const).filter(([, list]) => list.length > 0);
  }, [filteredProducts, categories, selectedCategory, query]);

  return (
    <div className="min-h-screen bg-slate-50">
      <StoreHeader businessName={store.businessName} info={store.info} />

      <main className="mx-auto max-w-5xl px-4 py-6">
        {!store.enabled ? (
          <CenteredMessage>This store is currently unavailable. Please check back later.</CenteredMessage>
        ) : store.products.length === 0 ? (
          <CenteredMessage>No products published yet. Check back soon!</CenteredMessage>
        ) : (
          <>
            <div className="sticky top-0 z-20 -mx-4 mb-6 bg-slate-50/95 px-4 py-3 backdrop-blur-sm">
              <SearchBar value={query} onChange={setQuery} />
              {categories.length > 1 && (
                <div className="mt-3">
                  <CategoryFilterBar categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
                </div>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <CenteredMessage>No products match your search.</CenteredMessage>
            ) : groupedByCategory ? (
              <div className="space-y-10">
                {groupedByCategory.map(([category, products]) => (
                  <section key={category}>
                    <h2 className="mb-4 text-lg font-bold text-slate-800">{category}</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {products.map((p) => (
                        <ProductCard key={p.productId} product={p} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((p) => (
                  <ProductCard key={p.productId} product={p} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
