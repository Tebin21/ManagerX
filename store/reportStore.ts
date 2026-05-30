import { create } from 'zustand';
import type {
  DateRange, DateRangeKey,
  SalesReportData, PurchaseReportData, ProfitLossData,
  InventoryReportSummary, DebtReportData, ProfitableProduct,
  DailyRevenuePoint, Expense, RevenuePoint,
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

interface ReportState {
  dateRange: DateRange;
  isLoading: boolean;
  salesData:     SalesReportData     | null;
  purchaseData:  PurchaseReportData  | null;
  plData:        ProfitLossData      | null;
  inventoryData: InventoryReportSummary | null;
  debtData:      DebtReportData      | null;
  topProfitable: ProfitableProduct[];
  monthlyRevenue: RevenuePoint[];
  dailyChart:    DailyRevenuePoint[];
  expenses:      Expense[];

  setDateRange: (key: DateRangeKey, from?: string, to?: string) => void;
  reload:       () => Promise<void>;
  loadExpenses: () => Promise<void>;
}

export const useReportStore = create<ReportState>((set, get) => ({
  dateRange:     buildRange('month'),
  isLoading:     false,
  salesData:     null,
  purchaseData:  null,
  plData:        null,
  inventoryData: null,
  debtData:      null,
  topProfitable: [],
  monthlyRevenue: [],
  dailyChart:    [],
  expenses:      [],

  setDateRange: (key, from, to) => {
    set({ dateRange: buildRange(key, from, to) });
    get().reload();
  },

  reload: async () => {
    set({ isLoading: true });
    const { from, to } = get().dateRange;
    const cacheKey = `report_${get().dateRange.key}_${from.slice(0,10)}_${to.slice(0,10)}`;
    try {
      const {
        getSalesReportData,
        getPurchaseReportData,
        getProfitLossData,
        getInventoryReportSummary,
        getDebtReportData,
        getMostProfitableProducts,
        getRevenueByMonth,
        getDailyRevenueChart,
        getAllExpenses,
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
        salesData,
        purchaseData,
        plData,
        inventoryData,
        debtData,
        topProfitable,
        monthlyRevenue,
        dailyChart,
        expenses,
      ] = await Promise.all([
        getSalesReportData(from, to),
        getPurchaseReportData(from, to),
        getProfitLossData(from, to),
        getInventoryReportSummary(),
        getDebtReportData(),
        getMostProfitableProducts(5, from, to),
        getRevenueByMonth(6),
        getDailyRevenueChart(30),
        getAllExpenses(from, to),
      ]);

      const newState = {
        salesData,
        purchaseData,
        plData,
        inventoryData,
        debtData,
        topProfitable,
        monthlyRevenue,
        dailyChart,
        expenses,
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

  loadExpenses: async () => {
    const { from, to } = get().dateRange;
    try {
      const { getAllExpenses } = await import('@/lib/sqlite');
      const expenses = await getAllExpenses(from, to);
      set({ expenses });
    } catch (err) {
      console.error('Failed to load expenses:', err);
    }
  },
}));
