export interface QuotationItem {
  id: string;
  productId: number;
  productName: string;
  itemId?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  customerId?: number;
  customerPhone?: string;
  customerAddress?: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. 02:45 PM
  items: QuotationItem[];
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  exchangeRate: number;
  notes?: string;
  validityDays?: number;
  printCount?: number;
  lastPrintedAt?: string;
  createdAt: string;
}
