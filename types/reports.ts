export type DateRangeKey = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  key: DateRangeKey;
  from: string;
  to: string;
  label: string;
}

export const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Internet', 'Transport', 'Salaries', 'Other',
] as const;
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface SmartAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  icon: string;
  title: string;
  body: string;
  action?: { label: string; route: string };
}

export type {
  SalesReportData,
  PurchaseReportData,
  ProfitLossData,
  InventoryReportSummary,
  DebtReportData,
  ProfitableProduct,
  DailyRevenuePoint,
  Expense,
  RevenuePoint,
} from '@/lib/sqlite';
