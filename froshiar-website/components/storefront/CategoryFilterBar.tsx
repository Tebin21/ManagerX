'use client';

interface Props {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryFilterBar({ categories, selected, onSelect }: Props) {
  const chips = ['هەمووی', ...categories];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((chip) => {
        const value = chip === 'هەمووی' ? 'all' : chip;
        const isActive = selected === value;
        return (
          <button
            key={chip}
            type="button"
            onClick={() => onSelect(value)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
              isActive
                ? 'bg-[var(--brand-600,#2563eb)] text-white shadow-sm'
                : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            {chip}
          </button>
        );
      })}
    </div>
  );
}

