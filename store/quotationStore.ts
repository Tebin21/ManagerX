import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { migratedAsyncStorage } from '@/lib/migratedStorage';
import type { Quotation, QuotationCurrencyMode } from '@/types/quotation';

export interface QuotationState {
  quotations: Quotation[];
  defaultNotes: string;
  currencyMode: QuotationCurrencyMode;
  setCurrencyMode: (mode: QuotationCurrencyMode) => void;
  addQuotation: (quotation: Quotation) => void;
  deleteQuotation: (id: string) => void;
  incrementPrintCount: (id: string) => void;
  incrementViewCount: (id: string) => void;
  clearQuotations: () => void;
  setDefaultNotes: (notes: string) => void;
}

export const useQuotationStore = create<QuotationState>()(
  persist(
    (set) => ({
      quotations: [],
      defaultNotes: 'نرخەکان بەپێی گۆڕانکارییەکانی بازاڕ بۆ ماوەی ٧ ڕۆژ کاریان پێدەکرێت.',
      currencyMode: 'both',
      setCurrencyMode: (mode) => set({ currencyMode: mode }),
      addQuotation: (quotation) =>
        set((state) => ({
          quotations: [quotation, ...state.quotations.filter((q) => q.id !== quotation.id)],
        })),
      deleteQuotation: (id) =>
        set((state) => ({
          quotations: state.quotations.filter((q) => q.id !== id),
        })),
      incrementPrintCount: (id) =>
        set((state) => ({
          quotations: state.quotations.map((q) =>
            q.id === id
              ? {
                  ...q,
                  printCount: (q.printCount || 0) + 1,
                  lastPrintedAt: new Date().toISOString(),
                }
              : q
          ),
        })),
      incrementViewCount: (id) =>
        set((state) => ({
          quotations: state.quotations.map((q) =>
            q.id === id
              ? {
                  ...q,
                  viewCount: (q.viewCount || 0) + 1,
                  lastViewedAt: new Date().toISOString(),
                }
              : q
          ),
        })),
      clearQuotations: () => set({ quotations: [] }),
      setDefaultNotes: (notes) => set({ defaultNotes: notes }),
    }),
    {
      name: 'froshiar-quotations-storage',
      storage: createJSONStorage(() => migratedAsyncStorage),
      merge: (persisted: unknown, current: QuotationState): QuotationState => {
        const p = persisted as Partial<QuotationState> | null;
        return {
          ...current,
          ...p,
          quotations: p?.quotations ?? current.quotations,
          defaultNotes: p?.defaultNotes ?? current.defaultNotes,
          currencyMode: (['both', 'iqd', 'usd'].includes(p?.currencyMode as string)
            ? p?.currencyMode
            : (current.currencyMode || 'both')) as QuotationCurrencyMode,
        };
      },
    }
  )
);
