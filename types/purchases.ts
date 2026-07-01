export type PurchasePaymentStatus = 'paid' | 'debt';
export type PurchaseIdType = 'shared' | 'custom';

export interface Purchase {
  id: number;
  purchaseNumber: string;
  date: string;                  // YYYY-MM-DD, the actual purchase date
  supplierName: string | null;
  supplierPhone: string | null;
  supplierAddress: string | null;
  productName: string;
  category: string | null;
  quantity: number;
  buyPriceIQD: number;
  buyPriceUSD: number;
  sellPriceIQD: number;
  sellPriceUSD: number;
  totalIQD: number;
  profitIQD: number;
  exchangeRate: number;          // rate snapshot at time of purchase (1 USD = X IQD)
  idType: PurchaseIdType | null;
  itemIds: string[];
  warranty: string | null;
  description: string | null;
  notes: string | null;
  paymentStatus: PurchasePaymentStatus;
  /** Derived from the linked product's image, not a column on `purchases` — only populated by getPurchaseById. */
  imageUri?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewPurchaseInput {
  date: string;
  supplierName: string;
  supplierPhone: string;
  supplierAddress: string;
  productName: string;
  category: string;
  quantity: number;
  buyPriceIQD: number;
  buyPriceUSD: number;
  sellPriceIQD: number;
  sellPriceUSD: number;
  exchangeRate: number;
  idType: PurchaseIdType | null;
  itemIds: string[];
  warranty: string;
  description: string;
  notes: string;
  websiteDescription: string;
  paymentStatus: PurchasePaymentStatus;
  initialAmountPaid?: number;
  imageUri?: string | null;
  selectedSupplierId?: number;
}

export const PURCHASE_RATE = 1310; // 1 USD = 1310 IQD
