import type { Product } from '@/types/sales';

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
}
