export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  totalPurchases: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerWithStats extends Customer {
  saleCount: number;
  remainingDebt: number;
  lastPurchaseDate: string | null;
}

export interface UpdateSaleInput {
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  warranty?: string;
  notes?: string;
  discountDelta?: number;
  extraPayment?: number;
}
