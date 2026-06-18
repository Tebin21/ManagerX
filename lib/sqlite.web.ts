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
    localStorage.setItem('@managerx_business_db', JSON.stringify(_data));
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
    const raw = localStorage.getItem('@managerx_business_db');
    if (!raw) return null;
    const d = JSON.parse(raw);
    return { ...d, logoPath: d.logoPath ?? null };
  } catch {
    return null;
  }
}

export async function saveSetting(key: string, value: string): Promise<void> {
  try {
    localStorage.setItem(`@managerx_setting_${key}`, value);
  } catch {}
}

export async function loadSetting(key: string): Promise<string | null> {
  try {
    return localStorage.getItem(`@managerx_setting_${key}`);
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
