'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStoreLanguage } from './StoreLanguageContext';

interface Props {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  isRTL?: boolean;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  isRTL = true,
}: Props) {
  const { t } = useStoreLanguage();

  if (totalPages <= 1) return null;

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  // Calculate page numbers to display smartly
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  const handlePrev = React.useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNext = React.useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  // Keyboard Left / Right arrow navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowLeft') {
        if (isRTL) handleNext();
        else handlePrev();
      } else if (e.key === 'ArrowRight') {
        if (isRTL) handlePrev();
        else handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, isRTL]);

  const summaryText = t('showingItems')
    ? t('showingItems')
        .replace('{start}', String(startIndex))
        .replace('{end}', String(endIndex))
        .replace('{total}', String(totalItems))
    : `${startIndex} - ${endIndex} / ${totalItems}`;

  return (
    <div className="mt-8 flex flex-col items-center gap-4 py-4 select-none">
      {/* 1. Items Range & Current Page Info */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          {summaryText}
        </span>
        <span className="rounded-full bg-[var(--brand-500,#D4AF37)]/15 px-3 py-1 font-bold text-[var(--brand-700,#b45309)] dark:text-[var(--brand-400,#facc15)] border border-[var(--brand-500,#D4AF37)]/30">
          {t('page')} {currentPage} {t('ofPages')} {totalPages}
        </span>
      </div>

      {/* 2. Interactive Pagination Bar (Prev + Page Numbers + Next) */}
      <nav
        aria-label="Pagination"
        className="flex max-w-full items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto p-1.5 rounded-2xl bg-white shadow-xs border border-slate-200/90 dark:bg-slate-800/90 dark:border-slate-700/80"
      >
        {/* Previous Page Button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentPage <= 1}
          aria-label={t('previousPage')}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 dark:bg-slate-700/70 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          {isRTL ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
          <span className="hidden sm:inline">{t('previousPage')}</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {pages.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="flex h-9 w-7 items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-500"
                >
                  •••
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-9 min-w-[36px] items-center justify-center rounded-xl px-2.5 text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-[var(--brand-600,#2563eb)] text-white shadow-md shadow-blue-500/25 ring-2 ring-[var(--brand-500,#D4AF37)]/40 font-black'
                    : 'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          aria-label={t('nextPage')}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 dark:bg-slate-700/70 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          <span className="hidden sm:inline">{t('nextPage')}</span>
          {isRTL ? <ChevronLeft size={16} strokeWidth={2.5} /> : <ChevronRight size={16} strokeWidth={2.5} />}
        </button>
      </nav>
    </div>
  );
}
