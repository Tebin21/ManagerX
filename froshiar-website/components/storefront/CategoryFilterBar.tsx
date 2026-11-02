'use client';

import { useStoreLanguage } from './StoreLanguageContext';

interface Props {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryFilterBar({ categories, selected, onSelect }: Props) {
  const { t } = useStoreLanguage();
  const allLabel = t('allCategories') || 'هەمووی';

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        onClick={() => onSelect('all')}
        className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
          selected === 'all'
            ? 'bg-[var(--brand-600,#2563eb)] text-white shadow-sm'
            : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
        }`}
      >
        {allLabel}
      </button>

      {categories.map((category) => {
        const isActive = selected === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
              isActive
                ? 'bg-[var(--brand-600,#2563eb)] text-white shadow-sm'
                : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
