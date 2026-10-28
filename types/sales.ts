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
  /** Short optional in-app note (max 30 chars) shown under the item name across
   *  Inventory/Sales/Edit — distinct from `description` (unbounded, purchase-mirrored)
   *  and `websiteDescription` (storefront-only, never shown in-app). */
  itemDescription: string | null;
  isActive: boolean;
  imageUri?: string | null;
  imageRemoteUrl?: string | null;
  productionDate?: string | null;
  expiryDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductBatch {
  batchNum: number;
  purchaseId?: number | null;
  purchaseNumber?: string;
  date: string;
  buyPriceIQD: number;
  buyPriceUSD: number;
  sellPriceIQD: number;
  sellPriceUSD: number;
  quantity: number;
  productionDate?: string | null;
  expiryDate?: string | null;
  supplierName?: string | null;
  isOldest?: boolean;
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
  selectedBatch?: ProductBatch | null;
  availableBatches?: ProductBatch[];
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
  batchNumber?: number | null;
  purchaseId?: number | null;
  /** Live-joined from products.item_description at query time; not persisted in sale_items. */
  itemDescription?: string | null;
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
  aboutPolicy?: string | null;
  paymentMethod: PaymentMethod;
  initialPaymentMethod?: 'cash' | 'fib' | null;
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
  printCount?: number;
  viewCount?: number;
}

export interface UpdateSaleCompleteInput {
  customerId?: number | null;
  customerName: string;
  customerPhone: string;
  customerAddress?: string | null;
  warranty?: string | null;
  notes?: string | null;
  paymentMethod: PaymentMethod;
  initialPaymentMethod?: 'cash' | 'fib' | null;
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
  initialPaymentMethod?: 'cash' | 'fib' | null;
  status: DebtStatus;
  createdAt: string;
  updatedAt: string;
}
