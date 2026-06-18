export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierWithStats extends Supplier {
  purchaseCount: number;
  lastPurchaseDate: string | null;
}
