'use client';

import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="گەڕان بۆ کاڵاکان..."
        className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-700 shadow-sm transition focus:border-[var(--brand-500,#2563eb)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-100,#dbeafe)] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
