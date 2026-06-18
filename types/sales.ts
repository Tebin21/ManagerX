export type IdMode        = 'repeatable' | 'unique';
export type PaymentMethod = 'cash' | 'debt' | 'fib';
export type SaleStatus    = 'completed' | 'cancelled';
export type DebtStatus    = 'active' | 'settled';

export interface Product {
  id: number;
  name: string;
  category: string;
  itemId: string | null;
  idMode: IdMode;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  unit: string;
  description: string | null;
  isActive: boolean;
  imageUri?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DiscountType = 'percentage' | 'amount';
export type GlobalDiscountType = 'none' | 'percentage' | 'amount';

export interface CartItem {
  product: Product;
  quantity: number;
  sellingPrice: number;
  discount: number;
  discountType: DiscountType;
  discountPct: number;
  lineTotal: number;
  hasLossWarning: boolean;
}

export interface CustomerInput {
  name: string;
  phone: string;
  address: string;
  warranty: string;
  notes: string;
  selectedCustomerId?: number;
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  productName: string;
  itemId: string | null;
  idMode: IdMode;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  discount: number;
  lineTotal: number;
}

export interface Sale {
  id: number;
  invoiceNumber: string;
  customerId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  warranty: string | null;
  notes: string | null;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountTotal: number;
  globalDiscountType: GlobalDiscountType;
  globalDiscount: number;
  grandTotal: number;
  paidAmount: number;
  remainingDebt: number;
  status: SaleStatus;
  exchangeRateUsed: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  items?: SaleItem[];
}

export interface UpdateSaleCompleteInput {
  customerId?: number | null;
  customerName: string;
  customerPhone: string;
  customerAddress?: string | null;
  warranty?: string | null;
  notes?: string | null;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountTotal: number;
  globalDiscountType: GlobalDiscountType;
  globalDiscount: number;
  grandTotal: number;
  paidAmount: number;
  remainingDebt: number;
  date?: string;
  items: Array<Omit<SaleItem, 'id' | 'saleId'>>;
}

export interface Debt {
  id: number;
  saleId: number;
  customerName: string;
  customerPhone: string | null;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: DebtStatus;
  createdAt: string;
  updatedAt: string;
}
