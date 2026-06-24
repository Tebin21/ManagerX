export type DateRangeKey = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  key: DateRangeKey;
  from: string;
  to: string;
  label: string;
}

export const EXPENSE_CATEGORIES = ['Transport', 'Food', 'Utilities'] as const;

export type {
  SalesReportData,
  PurchaseReportData,
  ProfitLossData,
  InventoryReportSummary,
  DebtReportData,
  ProfitableProduct,
  Expense,
  RevenuePoint,
  FinancialSummaryCards,
  NetCashBalanceData,
} from '@/lib/sqlite';
