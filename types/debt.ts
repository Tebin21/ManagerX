export type DebtType = 'sales' | 'purchase';
export type DebtDisplayStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

export interface PurchaseDebt {
  id: number;
  purchaseId: number | null;
  purchaseNumber: string | null;
  supplierName: string;
  supplierPhone: string | null;
  supplierAddress: string | null;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'active' | 'settled';
  notes: string | null;
  lastPaymentAt: string | null;
  initialPaymentMethod?: 'cash' | 'fib' | null;
  createdAt: string;
  updatedAt: string;
  // Product & Batch Linkage
  productName?: string | null;
  batchNumber?: number | null;
  totalBatches?: number | null;
  batchQuantity?: number | null;
  purchaseDate?: string | null;
  productId?: number | null;
}

export interface SalesDebtDetail {
  id: number;
  saleId: number;
  customerName: string;
  customerPhone: string | null;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'active' | 'settled';
  lastPaymentAt: string | null;
  initialPaymentMethod?: 'cash' | 'fib' | null;
  createdAt: string;
  updatedAt: string;
  invoiceNumber: string;
  customerAddress: string | null;
  warranty: string | null;
  saleNotes: string | null;
  // Products & Batches Linkage
  productsSummary?: string | null;
  itemsCount?: number;
  installmentMonths?: number | null;
  installmentMonthlyAmount?: number | null;
}

export interface DebtPayment {
  id: number;
  debtId: number;
  debtType: DebtType;
  amount: number;
  remainingAfter: number;
  paymentMethod?: string | null;
  note: string | null;
  createdAt: string;
}

export interface DebtPaymentReceiptData {
  id: number;
  paymentNumber: string; // e.g. "DP-00001"
  debtId: number;
  debtType: DebtType; // 'sales' | 'purchase'
  partyName: string;
  partyPhone?: string | null;
  partyAddress?: string | null;
  referenceNumber?: string | null;
  amount: number;
  previousBalance: number;
  remainingAfter: number;
  paymentMethod: string;
  note?: string | null;
  createdAt: string;
  originalAmount?: number;
  printCount?: number;
  viewCount?: number;
  saleId?: number | null;
  isInstallment?: boolean;
}

export type LedgerEventType = 'debt_created' | 'payment' | 'debt_fully_paid';

export interface FinancialLedgerEvent {
  type: LedgerEventType;
  paymentId: number | null;
  debtId: number;
  debtType: DebtType;
  referenceNumber: string | null;
  amount: number;
  remainingAfter: number;
  paymentMethod: string | null;
  note: string | null;
  createdAt: string;
}

export interface DebtOverviewSummary {
  totalSalesDebt: number;
  totalPurchaseDebt: number;
  activeSalesCount: number;
  activePurchaseCount: number;
  overdueCount: number;
}

export function getOverdueLevel(
  lastPaymentAt: string | null,
  createdAt: string,
  remaining: number
): 0 | 1 | 2 {
  if (remaining <= 0) return 0;
  const ref = lastPaymentAt ?? createdAt;
  const days = (Date.now() - new Date(ref).getTime()) / 86_400_000;
  if (days > 60) return 2;
  if (days > 30) return 1;
  return 0;
}

export function getDebtDisplayStatus(
  paidAmount: number,
  remaining: number,
  overdueLevel: 0 | 1 | 2
): DebtDisplayStatus {
  if (remaining <= 0) return 'paid';
  if (overdueLevel > 0) return 'overdue';
  if (paidAmount > 0) return 'partial';
  return 'unpaid';
}
