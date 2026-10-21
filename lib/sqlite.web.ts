// Web stub — SQLite is not used in the web version (offline-only feature)

export async function getDatabase() {
  return null as any;
}

export async function initializeDatabase(): Promise<void> {}

export async function saveBusiness(_data: {
  name: string;
  type: string;
  phone: string;
  address: string;
  logoPath?: string;
}): Promise<void> {
  try {
    localStorage.setItem('@froshiar_business_db', JSON.stringify(_data));
  } catch {}
}

export async function loadBusiness(): Promise<{
  name: string;
  type: string;
  phone: string;
  address: string;
  logoPath: string | null;
} | null> {
  try {
    // Falls back to the pre-rebrand key so an existing web session's data
    // isn't stranded — see saveSetting/loadSetting below for the same pattern.
    const raw = localStorage.getItem('@froshiar_business_db') ?? localStorage.getItem('@managerx_business_db');
    if (!raw) return null;
    const d = JSON.parse(raw);
    return { ...d, logoPath: d.logoPath ?? null };
  } catch {
    return null;
  }
}

export async function saveSetting(key: string, value: string): Promise<void> {
  try {
    localStorage.setItem(`@froshiar_setting_${key}`, value);
  } catch {}
}

export async function loadSetting(key: string): Promise<string | null> {
  try {
    return localStorage.getItem(`@froshiar_setting_${key}`) ?? localStorage.getItem(`@managerx_setting_${key}`);
  } catch {
    return null;
  }
}

// ─── Stubs for functions imported by screens/stores ──────────────────────────
// These prevent "X is not a function" crashes on web where SQLite is unavailable.

export async function getProductCategories(): Promise<string[]> {
  return [];
}

export async function getProductsByItemId(_itemId: string): Promise<number[]> {
  return [];
}

export async function getAllPurchases(): Promise<any[]> {
  return [];
}

export async function generatePurchaseNumber(): Promise<string> {
  return 'WEB-' + Date.now();
}

export async function insertPurchase(_data: any): Promise<number> {
  return 0;
}

export async function insertProduct(_data: any): Promise<number> {
  return 0;
}

export async function upsertSupplier(_input: any): Promise<number> {
  return 0;
}

export async function insertPurchaseItem(_purchaseId: number, _data: any): Promise<void> {}

export async function createPurchaseDebt(_purchaseId: number, _data: any): Promise<void> {}

export async function searchSuppliersList(_query: string): Promise<any[]> {
  return [];
}

export async function addManagedCategory(_name: string): Promise<void> {}

export async function saveExchangeRateHistory(_rate: number): Promise<void> {}

export async function discardProduct(
  _productId: number,
  _quantity: number,
  _reason?: string,
  _notes?: string
): Promise<{ discardId: number; totalLossIqd: number; totalLossUsd: number }> {
  return { discardId: 0, totalLossIqd: 0, totalLossUsd: 0 };
}

export async function restoreDiscardedProduct(_discardId: number): Promise<{
  success: boolean;
  restoredQuantity: number;
  productId: number | null;
}> {
  return { success: false, restoredQuantity: 0, productId: null };
}

export async function permanentDeleteDiscardedProduct(_discardId: number): Promise<void> {}

export async function getDiscardedProducts(_onlyActive: boolean = true): Promise<any[]> {
  return [];
}

export async function getDiscardedLossStats(_from?: string, _to?: string): Promise<{
  totalLossIqd: number;
  totalLossUsd: number;
  totalItemsCount: number;
  totalUnitsCount: number;
}> {
  return { totalLossIqd: 0, totalLossUsd: 0, totalItemsCount: 0, totalUnitsCount: 0 };
}
