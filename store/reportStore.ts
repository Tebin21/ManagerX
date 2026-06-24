import { create } from 'zustand';
import type {
  DateRange, DateRangeKey,
  SalesReportData, PurchaseReportData, ProfitLossData,
  InventoryReportSummary, DebtReportData, ProfitableProduct,
  Expense, RevenuePoint, FinancialSummaryCards,
  NetCashBalanceData,
} from '@/types/reports';

function buildRange(
  key: DateRangeKey,
  customFrom?: string,
  customTo?: string
): DateRange {
  const now = new Date();
  const toISO = now.toISOString();
  const labels: Record<DateRangeKey, string> = {
    today:  'Today',
    week:   'This Week',
    month:  'This Month',
    year:   'This Year',
    custom: 'Custom Range',
  };
  if (key === 'custom') {
    return { key, from: customFrom ?? toISO, to: customTo ?? toISO, label: 'Custom Range' };
  }
  const from = new Date(now);
  if      (key === 'today') { from.setHours(0, 0, 0, 0); }
  else if (key === 'week')  { from.setDate(from.getDate() - 7); }
  else if (key === 'month') { from.setMonth(from.getMonth() - 1); }
  else if (key === 'year')  { from.setFullYear(from.getFullYear() - 1); }
  return { key, from: from.toISOString(), to: toISO, label: labels[key] };
}

// `dateRange` stores a snapshot of "now" — for any non-custom key it must be
// rebuilt right before every query, otherwise its `to` boundary stays frozen
// at whenever it was last set and silently excludes everything created since.
function freshRange(range: DateRange): DateRange {
  return range.key === 'custom' ? range : buildRange(range.key);
}

interface ReportState {
  dateRange: DateRange;
  isLoading: boolean;
  financialCards: FinancialSummaryCards | null;
  salesData:     SalesReportData     | null;
  purchaseData:  PurchaseReportData  | null;
  plData:        ProfitLossData      | null;
  inventoryData: InventoryReportSummary | null;
  debtData:      DebtReportData      | null;
  topProfitable: ProfitableProduct[];
  monthlyRevenue: RevenuePoint[];
  expenses:      Expense[];
  cashBalance:   NetCashBalanceData  | null;
  dashboardExpenseTotals: { today: number; weekly: number; monthly: number; yearly: number } | null;

  setDateRange:          (key: DateRangeKey, from?: string, to?: string) => void;
  reload:                () => Promise<void>;
  reloadAfterMutation:   () => Promise<void>;
  loadExpenses:          () => Promise<void>;
}

export const useReportStore = create<ReportState>((set, get) => ({
  dateRange:      buildRange('today'),
  isLoading:      false,
  financialCards: null,
  salesData:     null,
  purchaseData:  null,
  plData:        null,
  inventoryData: null,
  debtData:      null,
  topProfitable: [],
  monthlyRevenue: [],
  expenses:      [],
  cashBalance:   null,
  dashboardExpenseTotals: null,

  setDateRange: (key, from, to) => {
    set({ dateRange: buildRange(key, from, to) });
    get().reload();
  },

  reload: async () => {
    set({ isLoading: true });
    const range = freshRange(get().dateRange);
    set({ dateRange: range });
    const { from, to } = range;
    const cacheKey = `report_${range.key}_${from}_${to}`;
    try {
      const {
        getFinancialSummaryCards,
        getSalesReportData,
        getPurchaseReportData,
        getProfitLossData,
        getInventoryReportSummary,
        getDebtReportData,
        getMostProfitableProducts,
        getRevenueByMonth,
        getAllExpenses,
        getNetCashBalance,
        getDashboardExpenseTotals,
        getCachedReport,
        setCachedReport,
      } = await import('@/lib/sqlite');

      // Try cache first (5-minute TTL)
      const cached = await getCachedReport<Omit<ReportState, 'dateRange' | 'isLoading' | 'setDateRange' | 'reload' | 'loadExpenses'>>(cacheKey);
      if (cached) {
        set({ ...cached, isLoading: false });
        return;
      }

      const [
        financialCards,
        salesData,
        purchaseData,
        plData,
        inventoryData,
        debtData,
        topProfitable,
        monthlyRevenue,
        expenses,
        cashBalance,
        dashboardExpenseTotals,
      ] = await Promise.all([
        getFinancialSummaryCards(from, to),
        getSalesReportData(from, to),
        getPurchaseReportData(from, to),
        getProfitLossData(from, to),
        getInventoryReportSummary(),
        getDebtReportData(),
        getMostProfitableProducts(5, from, to),
        getRevenueByMonth(6),
        getAllExpenses(from, to),
        getNetCashBalance(),
        getDashboardExpenseTotals(),
      ]);

      const newState = {
        financialCards,
        salesData,
        purchaseData,
        plData,
        inventoryData,
        debtData,
        topProfitable,
        monthlyRevenue,
        expenses,
        cashBalance,
        dashboardExpenseTotals,
      };

      set({ ...newState, isLoading: false });

      // Cache for 5 minutes
      try {
        await setCachedReport(cacheKey, newState, 300);
      } catch { /* cache write failure is non-critical */ }
    } catch (err) {
      console.error('Failed to reload reports:', err);
      set({ isLoading: false });
    }
  },

  reloadAfterMutation: async () => {
    try {
      const { clearReportsCache } = await import('@/lib/sqlite');
      await clearReportsCache();
    } catch { /* non-critical */ }
    await get().reload();
  },

  loadExpenses: async () => {
    const { from, to } = freshRange(get().dateRange);
    try {
      const { getAllExpenses } = await import('@/lib/sqlite');
      const expenses = await getAllExpenses(from, to);
      set({ expenses });
    } catch (err) {
      console.error('Failed to load expenses:', err);
    }
  },
}));
