import type { Product } from '@/types/sales';

export type LowStockMode = 'global' | 'enabled' | 'disabled';

export function getLowStockMode(v: 1 | 0 | null): LowStockMode {
  if (v === 1) return 'enabled';
  if (v === 0) return 'disabled';
  return 'global';
}

export interface InventoryProduct extends Product {
  purchaseId: number | null;
  supplierName: string | null;
  supplierPhone: string | null;
  supplierAddress: string | null;
  purchaseDate: string | null;
  paymentStatus: 'paid' | 'debt';
  warranty: string | null;
  imageUri: string | null;
  buyPriceUsd: number;
  sellPriceUsd: number;
  lowStockThreshold: number | null;
  lowStockEnabled: 1 | 0 | null;
}

export interface InventoryStats {
  totalProducts: number;
  totalQuantity: number;
  totalValueIQD: number;
  lowStockCount: number;
  paidCount: number;
  debtCount: number;
}

export type InventoryFilter = 'all' | 'lowStock' | 'paid' | 'debt';
export type InventorySortOrder = 'newest' | 'oldest' | 'name_asc' | 'qty_asc';

export interface NewProductData {
  name: string;
  category: string;
  itemId: string | null;
  idMode: 'repeatable' | 'unique';
  purchasePrice: number;
  buyPriceUsd: number;
  sellingPrice: number;
  sellPriceUsd: number;
  quantity: number;
  unit: string;
  description: string | null;
  isActive: boolean;
  purchaseId: number | null;
  supplierName: string | null;
  supplierPhone: string | null;
  supplierAddress: string | null;
  purchaseDate: string | null;
  paymentStatus: 'paid' | 'debt';
  warranty: string | null;
  imageUri: string | null;
  lowStockThreshold?: number | null;
  lowStockEnabled?: 1 | 0 | null;
}

export interface InventoryHistoryItem {
  id: number;
  productId: number;
  productName: string;
  category: string;
  imageUri: string | null;
  itemId: string | null;
  purchasePrice: number;
  sellingPrice: number;
  quantitySold: number;
  finalQuantity: number;
  status: 'sold_out' | 'removed';
  archivedAt: string;
}
