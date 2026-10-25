import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { migratedAsyncStorage } from '@/lib/migratedStorage';
import type { Quotation } from '@/types/quotation';

export interface QuotationState {
  quotations: Quotation[];
  defaultNotes: string;
  addQuotation: (quotation: Quotation) => void;
  deleteQuotation: (id: string) => void;
  incrementPrintCount: (id: string) => void;
  clearQuotations: () => void;
  setDefaultNotes: (notes: string) => void;
}

export const useQuotationStore = create<QuotationState>()(
  persist(
    (set) => ({
      quotations: [],
      defaultNotes: 'نرخەکان بەپێی گۆڕانکارییەکانی بازاڕ بۆ ماوەی ٧ ڕۆژ کاریان پێدەکرێت.',
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
      clearQuotations: () => set({ quotations: [] }),
      setDefaultNotes: (notes) => set({ defaultNotes: notes }),
    }),
    {
      name: 'froshiar-quotations-storage',
      storage: createJSONStorage(() => migratedAsyncStorage),
    }
  )
);
