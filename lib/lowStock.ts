import type { InventoryProduct } from '@/types/inventory';

export function computeProductLowStock(
  p: InventoryProduct,
  globalEnabled: boolean,
  globalThreshold: number
): boolean {
  if (!globalEnabled) return false;
  if (!p.isActive || p.quantity <= 0) return false;
  if (p.lowStockEnabled === 0) return false;
  const threshold = p.lowStockThreshold ?? globalThreshold;
  return p.quantity <= threshold;
}
