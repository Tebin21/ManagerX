// Web & Desktop stub / storage — SQLite native driver is replaced with local browser storage
import { DIRECT_SUPPLIER_NAME, isDirectSupplierName } from '@/lib/supplierUtils';

export { DIRECT_SUPPLIER_NAME, isDirectSupplierName };

export const DIRECT_CUSTOMER_NAME = 'کڕیاری ڕاستەوخۆ';

export function isDirectCustomerName(name?: string | null): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return (
    n === DIRECT_CUSTOMER_NAME.toLowerCase() ||
    n === 'direct customer' ||
    n === 'walk-in customer' ||
    n === 'کڕیاری راستەوخۆ' ||
    n === 'کڕیاری دەستبەجێ' ||
    n === 'الزبون المباشر' ||
    n === 'عميل مباشر' ||
    n === 'زبون مباشر'
  );
}

// ─── LocalStorage Helpers ──────────────────────────────────────────────────
function getLocal<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(val));
    }
  } catch {}
}

const KEYS = {
  business: '@froshiar_business_db',
  products: '@froshiar_db_products',
  purchases: '@froshiar_db_purchases',
  sales: '@froshiar_db_sales',
  customers: '@froshiar_db_customers',
  suppliers: '@froshiar_db_suppliers',
  debts: '@froshiar_db_debts',
  purchaseDebts: '@froshiar_db_purchase_debts',
  debtReceipts: '@froshiar_db_debt_receipts',
  categories: '@froshiar_db_categories',
  history: '@froshiar_db_history',
  exchangeRates: '@froshiar_db_exchange_rates',
  discarded: '@froshiar_db_discarded',
};

// ─── Core DB & Settings ────────────────────────────────────────────────────
export async function getDatabase() {
  return null as any;
}

export async function initializeDatabase(): Promise<void> {}

export async function wipeAllBusinessData(): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    }
  } catch {}
}

export async function saveBusiness(data: {
  name: string;
  type: string;
  phone: string;
  address: string;
  logoPath?: string;
}): Promise<void> {
  setLocal(KEYS.business, data);
}

export async function loadBusiness(): Promise<{
  name: string;
  type: string;
  phone: string;
  address: string;
  logoPath: string | null;
} | null> {
  try {
    const raw =
      (typeof localStorage !== 'undefined' && localStorage.getItem(KEYS.business)) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('@managerx_business_db'));
    if (!raw) return null;
    const d = JSON.parse(raw);
    return { ...d, logoPath: d.logoPath ?? null };
  } catch {
    return null;
  }
}

export async function saveSetting(key: string, value: string): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`@froshiar_setting_${key}`, value);
    }
  } catch {}
}

export async function loadSetting(key: string): Promise<string | null> {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(`@froshiar_setting_${key}`) ?? localStorage.getItem(`@managerx_setting_${key}`);
  } catch {
    return null;
  }
}

// ─── Formatters & Generators ───────────────────────────────────────────────
export function formatInvoiceNumber(n: number): string {
  return `F-${String(n).padStart(5, '0')}`;
}

export function formatPurchaseNumber(n: number): string {
  return `F-${String(n).padStart(5, '0')}`;
}

export function formatQuotationNumber(n: number): string {
  return `B-${String(n).padStart(4, '0')}`;
}

export async function generatePurchaseNumber(): Promise<string> {
  const purchases = getLocal<any[]>(KEYS.purchases, []);
  return formatPurchaseNumber(purchases.length + 1);
}

export async function generateInvoiceNumber(): Promise<string> {
  const sales = getLocal<any[]>(KEYS.sales, []);
  return formatInvoiceNumber(sales.length + 1);
}

// ─── Categories ────────────────────────────────────────────────────────────
interface WebCategoryRecord {
  id: number;
  name: string;
  is_default: number;
  uuid?: string;
}

function getNormalizedWebCategories(): WebCategoryRecord[] {
  const raw = getLocal<any[]>(KEYS.categories, []);
  let list: WebCategoryRecord[] = [];

  if (Array.isArray(raw)) {
    raw.forEach((item, index) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed) {
          list.push({
            id: index + 1,
            name: trimmed,
            is_default: trimmed === 'گشتی' || trimmed === 'General' || trimmed === 'بنەڕەت' ? 1 : 0,
          });
        }
      } else if (item && typeof item === 'object') {
        const name = String(item.name || '').trim();
        if (name) {
          list.push({
            id: Number(item.id) || index + 1,
            name,
            is_default: Number(item.is_default) === 1 || Number(item.isDefault) === 1 ? 1 : 0,
            uuid: item.uuid,
          });
        }
      }
    });
  }

  // Deduplicate by lowercase name
  const seen = new Map<string, WebCategoryRecord>();
  list.forEach((cat) => {
    const key = cat.name.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, cat);
    } else {
      if (cat.is_default === 1) {
        seen.get(key)!.is_default = 1;
      }
    }
  });

  list = Array.from(seen.values());

  // Guarantee that EXACTLY ONE canonical default category exists!
  const defaultCount = list.filter((c) => c.is_default === 1).length;

  if (defaultCount === 0) {
    const gen = list.find((c) => {
      const n = c.name.toLowerCase();
      return n === 'گشتی' || n === 'general' || n === 'بنەڕەت';
    });
    if (gen) {
      gen.is_default = 1;
    } else {
      list.unshift({
        id: 1,
        name: 'گشتی',
        is_default: 1,
      });
    }
  } else if (defaultCount > 1) {
    let preferred = list.find((c) => c.is_default === 1 && (c.name === 'گشتی' || c.name === 'General'));
    if (!preferred) preferred = list.find((c) => c.is_default === 1);
    list.forEach((c) => {
      c.is_default = c === preferred ? 1 : 0;
    });
  }

  setLocal(KEYS.categories, list);
  return list;
}

export async function getDefaultCategoryName(): Promise<string> {
  const cats = getNormalizedWebCategories();
  const def = cats.find((c) => c.is_default === 1);
  return def ? def.name : 'گشتی';
}

export async function getProductCategories(): Promise<string[]> {
  const cats = getNormalizedWebCategories();
  const products = getLocal<any[]>(KEYS.products, []);
  const set = new Set<string>();

  // Always put default category first
  const def = cats.find((c) => c.is_default === 1);
  if (def) set.add(def.name);

  // Other categories from category list
  cats.forEach((c) => set.add(c.name));

  // Any categories attached to products
  products.forEach((p) => {
    if (p.category && String(p.category).trim()) {
      set.add(String(p.category).trim());
    }
  });

  return Array.from(set);
}

export async function getAllManagedCategories(): Promise<Array<{ name: string; productCount: number; isDefault: boolean }>> {
  const cats = getNormalizedWebCategories();
  const products = getLocal<any[]>(KEYS.products, []);

  // Also sync any categories that might exist on products
  const existingNames = new Set(cats.map((c) => c.name.toLowerCase()));
  let addedFromProducts = false;
  products.forEach((p) => {
    const catName = p.category ? String(p.category).trim() : '';
    if (catName && !existingNames.has(catName.toLowerCase())) {
      cats.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: catName,
        is_default: 0,
      });
      existingNames.add(catName.toLowerCase());
      addedFromProducts = true;
    }
  });

  if (addedFromProducts) {
    setLocal(KEYS.categories, cats);
  }

  const result = cats.map((cat) => ({
    name: cat.name,
    productCount: products.filter(
      (p) => p.is_active !== 0 && String(p.category || '').trim().toLowerCase() === cat.name.toLowerCase()
    ).length,
    isDefault: cat.is_default === 1,
  }));

  // Sort: Default ALWAYS first, then alphabetical
  result.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });

  return result;
}

export async function addManagedCategory(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('CATEGORY_NAME_REQUIRED');

  const cats = getNormalizedWebCategories();
  const existing = cats.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    throw new Error('CATEGORY_ALREADY_EXISTS');
  }

  // Newly added category is NEVER default
  cats.push({
    id: Date.now(),
    name: trimmed,
    is_default: 0,
  });
  setLocal(KEYS.categories, cats);
}

export async function renameManagedCategory(oldName: string, newName: string): Promise<void> {
  const trimmedOld = oldName.trim();
  const trimmedNew = newName.trim();
  if (!trimmedNew) throw new Error('CATEGORY_NAME_REQUIRED');
  if (trimmedNew.toLowerCase() === trimmedOld.toLowerCase()) return;

  const cats = getNormalizedWebCategories();
  const duplicate = cats.find(
    (c) => c.name.toLowerCase() === trimmedNew.toLowerCase() && c.name.toLowerCase() !== trimmedOld.toLowerCase()
  );
  if (duplicate) {
    throw new Error('CATEGORY_ALREADY_EXISTS');
  }

  const target = cats.find((c) => c.name.toLowerCase() === trimmedOld.toLowerCase());
  if (target) {
    target.name = trimmedNew;
    // target.is_default is preserved! If the default category was renamed, it stays default!
  } else {
    cats.push({
      id: Date.now(),
      name: trimmedNew,
      is_default: 0,
    });
  }
  setLocal(KEYS.categories, cats);

  // Update products
  const products = getLocal<any[]>(KEYS.products, []);
  let updatedProducts = false;
  products.forEach((p) => {
    if (String(p.category || '').trim().toLowerCase() === trimmedOld.toLowerCase()) {
      p.category = trimmedNew;
      updatedProducts = true;
    }
  });
  if (updatedProducts) {
    setLocal(KEYS.products, products);
  }

  // Update purchases
  const purchases = getLocal<any[]>(KEYS.purchases, []);
  let updatedPurchases = false;
  purchases.forEach((pur) => {
    if (Array.isArray(pur.items)) {
      pur.items.forEach((item: any) => {
        if (String(item.category || '').trim().toLowerCase() === trimmedOld.toLowerCase()) {
          item.category = trimmedNew;
          updatedPurchases = true;
        }
      });
    }
  });
  if (updatedPurchases) {
    setLocal(KEYS.purchases, purchases);
  }
}

export async function deleteManagedCategory(name: string): Promise<void> {
  const trimmed = name.trim();
  const cats = getNormalizedWebCategories();

  const target = cats.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (target && target.is_default === 1) {
    throw new Error('CATEGORY_IS_DEFAULT');
  }

  // Find default category to reassign products to
  const def = cats.find((c) => c.is_default === 1);
  const fallbackCat = def ? def.name : 'گشتی';

  // Filter out the deleted category
  const remaining = cats.filter((c) => c.name.toLowerCase() !== trimmed.toLowerCase());
  setLocal(KEYS.categories, remaining);

  // Reassign products to the fallback default category
  const products = getLocal<any[]>(KEYS.products, []);
  let updatedProducts = false;
  products.forEach((p) => {
    if (String(p.category || '').trim().toLowerCase() === trimmed.toLowerCase()) {
      p.category = fallbackCat;
      updatedProducts = true;
    }
  });
  if (updatedProducts) {
    setLocal(KEYS.products, products);
  }
}

// ─── Products & Inventory ──────────────────────────────────────────────────
export async function getAllInventoryProducts(): Promise<any[]> {
  return getLocal<any[]>(KEYS.products, []);
}

export async function getInventoryProductById(id: number): Promise<any | null> {
  const products = getLocal<any[]>(KEYS.products, []);
  return products.find((p) => p.id === id) ?? null;
}

export async function getProductsByItemId(itemId: string): Promise<number[]> {
  const products = getLocal<any[]>(KEYS.products, []);
  return products.filter((p) => p.itemId === itemId).map((p) => p.id);
}

export async function getProductByItemId(itemId: string): Promise<any | null> {
  const products = getLocal<any[]>(KEYS.products, []);
  return products.find((p) => p.itemId === itemId) ?? null;
}

export async function getProductByItemIdAndName(itemId: string, name: string): Promise<any | null> {
  const products = getLocal<any[]>(KEYS.products, []);
  return products.find((p) => p.itemId === itemId && p.name.trim().toLowerCase() === name.trim().toLowerCase()) ?? null;
}

export async function getRepeatableProductByName(name: string): Promise<any | null> {
  const products = getLocal<any[]>(KEYS.products, []);
  return (
    products.find(
      (p) => p.idMode === 'repeatable' && p.name.trim().toLowerCase() === name.trim().toLowerCase()
    ) ?? null
  );
}

export async function getProductBatches(_productId: number, _productName: string, _itemId?: string | null): Promise<any[]> {
  return [];
}

export async function insertProduct(data: any): Promise<number> {
  const products = getLocal<any[]>(KEYS.products, []);
  const id = Date.now() + Math.floor(Math.random() * 1000);
  const now = new Date().toISOString();
  const newProd = {
    ...data,
    id,
    isActive: true,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
  products.unshift(newProd);
  setLocal(KEYS.products, products);
  return id;
}

export async function updateProduct(id: number, data: any): Promise<void> {
  const products = getLocal<any[]>(KEYS.products, []);
  const idx = products.findIndex((p) => p.id === id);
  if (idx >= 0) {
    products[idx] = { ...products[idx], ...data, updatedAt: new Date().toISOString() };
    setLocal(KEYS.products, products);
  }
}

export async function restockExistingProduct(productId: number, data: any): Promise<void> {
  const products = getLocal<any[]>(KEYS.products, []);
  const idx = products.findIndex((p) => p.id === productId);
  if (idx >= 0) {
    products[idx].quantity = (products[idx].quantity || 0) + (data.quantity || 0);
    if (data.sellingPrice) products[idx].sellingPrice = data.sellingPrice;
    if (data.purchasePrice) products[idx].purchasePrice = data.purchasePrice;
    products[idx].updatedAt = new Date().toISOString();
    setLocal(KEYS.products, products);
  }
}

export async function deleteProduct(id: number): Promise<void> {
  const products = getLocal<any[]>(KEYS.products, []);
  const prod = products.find((p) => p.id === id);
  if (prod) {
    const history = getLocal<any[]>(KEYS.history, []);
    history.unshift({ ...prod, deletedAt: new Date().toISOString() });
    setLocal(KEYS.history, history);
  }
  setLocal(KEYS.products, products.filter((p) => p.id !== id));
}

export async function getInventoryStats(): Promise<{
  totalProducts: number;
  totalQuantity: number;
  totalValueIQD: number;
  lowStockCount: number;
  paidCount: number;
  debtCount: number;
}> {
  const products = getLocal<any[]>(KEYS.products, []);
  let totalQty = 0;
  let totalVal = 0;
  let lowCount = 0;
  for (const p of products) {
    totalQty += p.quantity || 0;
    totalVal += (p.sellingPrice || 0) * (p.quantity || 0);
    if ((p.quantity || 0) <= 5) lowCount++;
  }
  return {
    totalProducts: products.length,
    totalQuantity: totalQty,
    totalValueIQD: totalVal,
    lowStockCount: lowCount,
    paidCount: products.filter((p) => p.paymentStatus === 'paid').length,
    debtCount: products.filter((p) => p.paymentStatus === 'debt').length,
  };
}

export async function setProductStoreVisibility(productId: number, visible: boolean): Promise<void> {
  await updateProduct(productId, { storeVisible: visible });
}

export async function bulkSetStoreVisibility(visible: boolean): Promise<void> {
  const products = getLocal<any[]>(KEYS.products, []);
  products.forEach((p) => {
    p.storeVisible = visible;
  });
  setLocal(KEYS.products, products);
}

export async function setProductImageRemoteUrl(productId: number, url: string | null): Promise<void> {
  await updateProduct(productId, { imageRemoteUrl: url });
}

export async function getAllInventoryHistory(): Promise<any[]> {
  return getLocal<any[]>(KEYS.history, []);
}

export async function restoreProductFromHistory(id: number): Promise<void> {
  const history = getLocal<any[]>(KEYS.history, []);
  const item = history.find((h) => h.id === id);
  if (item) {
    setLocal(KEYS.history, history.filter((h) => h.id !== id));
    const products = getLocal<any[]>(KEYS.products, []);
    products.unshift(item);
    setLocal(KEYS.products, products);
  }
}

export async function permanentDeleteFromHistory(id: number): Promise<void> {
  const history = getLocal<any[]>(KEYS.history, []);
  setLocal(KEYS.history, history.filter((h) => h.id !== id));
}

export async function getProductPurchaseHistory(_productId: number): Promise<any[]> {
  return [];
}

export async function getSoldProducts(): Promise<any[]> {
  return [];
}

// ─── Discarded Products ────────────────────────────────────────────────────
export async function discardProduct(
  productId: number,
  quantity: number,
  reason?: string,
  notes?: string
): Promise<{ discardId: number; totalLossIqd: number; totalLossUsd: number }> {
  const discardId = Date.now();
  const discards = getLocal<any[]>(KEYS.discarded, []);
  discards.push({ id: discardId, productId, quantity, reason, notes, date: new Date().toISOString() });
  setLocal(KEYS.discarded, discards);
  return { discardId, totalLossIqd: 0, totalLossUsd: 0 };
}

export async function restoreDiscardedProduct(discardId: number): Promise<{
  success: boolean;
  restoredQuantity: number;
  productId: number | null;
}> {
  const discards = getLocal<any[]>(KEYS.discarded, []);
  const item = discards.find((d) => d.id === discardId);
  if (item) {
    setLocal(KEYS.discarded, discards.filter((d) => d.id !== discardId));
    return { success: true, restoredQuantity: item.quantity, productId: item.productId };
  }
  return { success: false, restoredQuantity: 0, productId: null };
}

export async function permanentDeleteDiscardedProduct(discardId: number): Promise<void> {
  const discards = getLocal<any[]>(KEYS.discarded, []);
  setLocal(KEYS.discarded, discards.filter((d) => d.id !== discardId));
}

export async function getDiscardedProducts(_onlyActive: boolean = true): Promise<any[]> {
  return getLocal<any[]>(KEYS.discarded, []);
}

export async function getDiscardedLossStats(_from?: string, _to?: string): Promise<{
  totalLossIqd: number;
  totalLossUsd: number;
  totalItemsCount: number;
  totalUnitsCount: number;
}> {
  return { totalLossIqd: 0, totalLossUsd: 0, totalItemsCount: 0, totalUnitsCount: 0 };
}

// ─── Suppliers ─────────────────────────────────────────────────────────────
export async function getAllSuppliersWithStats(): Promise<any[]> {
  const suppliers = getLocal<any[]>(KEYS.suppliers, []);
  const purchases = getLocal<any[]>(KEYS.purchases, []);
  return suppliers.map((s) => {
    const sPurchases = purchases.filter((p) => p.supplierName === s.name);
    const totalSpent = sPurchases.reduce((acc, p) => acc + (p.totalIQD || 0), 0);
    return {
      ...s,
      purchaseCount: sPurchases.length,
      totalSpent,
      lastPurchaseDate: sPurchases[0]?.date || null,
    };
  });
}

export async function searchSuppliersList(query: string): Promise<any[]> {
  const suppliers = await getAllSuppliersWithStats();
  const q = query.toLowerCase().trim();
  if (!q) return suppliers;
  return suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q))
  );
}

export async function findSupplierByNameOrPhone(name?: string | null, phone?: string | null): Promise<any | null> {
  const suppliers = getLocal<any[]>(KEYS.suppliers, []);
  return (
    suppliers.find(
      (s) =>
        (name && s.name.trim().toLowerCase() === name.trim().toLowerCase()) ||
        (phone && s.phone && s.phone.trim() === phone.trim())
    ) ?? null
  );
}

export async function upsertSupplier(input: any): Promise<number> {
  const suppliers = getLocal<any[]>(KEYS.suppliers, []);
  const existing = suppliers.find((s) => s.name.trim().toLowerCase() === (input.name || '').trim().toLowerCase());
  if (existing) {
    Object.assign(existing, input, { updatedAt: new Date().toISOString() });
    setLocal(KEYS.suppliers, suppliers);
    return existing.id;
  }
  const id = Date.now() + Math.floor(Math.random() * 1000);
  suppliers.push({ ...input, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  setLocal(KEYS.suppliers, suppliers);
  return id;
}

export async function updateSupplier(id: number, data: any): Promise<void> {
  const suppliers = getLocal<any[]>(KEYS.suppliers, []);
  const idx = suppliers.findIndex((s) => s.id === id);
  if (idx >= 0) {
    suppliers[idx] = { ...suppliers[idx], ...data, updatedAt: new Date().toISOString() };
    setLocal(KEYS.suppliers, suppliers);
  }
}

export async function deleteSupplier(id: number): Promise<void> {
  const suppliers = getLocal<any[]>(KEYS.suppliers, []);
  setLocal(KEYS.suppliers, suppliers.filter((s) => s.id !== id));
}

export async function getSupplierFinancialTimeline(_supplierId: number): Promise<any[]> {
  return [];
}

export async function getPurchasesBySupplierName(supplierName: string): Promise<any[]> {
  const purchases = getLocal<any[]>(KEYS.purchases, []);
  return purchases.filter((p) => p.supplierName === supplierName);
}

// ─── Purchases ─────────────────────────────────────────────────────────────
export async function getAllPurchases(): Promise<any[]> {
  return getLocal<any[]>(KEYS.purchases, []);
}

export async function getPurchaseById(id: number): Promise<any | null> {
  const purchases = getLocal<any[]>(KEYS.purchases, []);
  return purchases.find((p) => p.id === id) ?? null;
}

export async function insertPurchase(data: any): Promise<number> {
  const purchases = getLocal<any[]>(KEYS.purchases, []);
  const id = Date.now() + Math.floor(Math.random() * 1000);
  const purchase = {
    ...data,
    id,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  purchases.unshift(purchase);
  setLocal(KEYS.purchases, purchases);
  return id;
}

export async function insertPurchaseItem(_purchaseId: number, _data: any): Promise<void> {}

export async function createPurchaseDebt(purchaseId: number, data: any): Promise<void> {
  const debts = getLocal<any[]>(KEYS.purchaseDebts, []);
  debts.push({ ...data, purchaseId, id: Date.now() });
  setLocal(KEYS.purchaseDebts, debts);
}

export async function updatePurchase(id: number, input: any): Promise<void> {
  const purchases = getLocal<any[]>(KEYS.purchases, []);
  const idx = purchases.findIndex((p) => p.id === id);
  if (idx >= 0) {
    purchases[idx] = { ...purchases[idx], ...input, updatedAt: new Date().toISOString() };
    setLocal(KEYS.purchases, purchases);
  }
}

export async function archivePurchase(id: number, _actor?: any): Promise<void> {
  const purchases = getLocal<any[]>(KEYS.purchases, []);
  setLocal(KEYS.purchases, purchases.filter((p) => p.id !== id));
}

export async function getPurchaseItemsByPurchaseId(_purchaseId: number): Promise<any[]> {
  return [];
}

export async function getPurchaseDebtByPurchaseId(purchaseId: number): Promise<any | null> {
  const debts = getLocal<any[]>(KEYS.purchaseDebts, []);
  return debts.find((d) => d.purchaseId === purchaseId) ?? null;
}

export async function getPurchaseDebtById(id: number): Promise<any | null> {
  const debts = getLocal<any[]>(KEYS.purchaseDebts, []);
  return debts.find((d) => d.id === id) ?? null;
}

export async function getAllPurchaseDebts(): Promise<any[]> {
  return getLocal<any[]>(KEYS.purchaseDebts, []);
}

export async function getSoldQuantityForPurchase(_purchaseId: number): Promise<number> {
  return 0;
}

export async function incrementPurchaseViewCount(_purchaseId: number): Promise<void> {}
export async function incrementPurchasePrintCount(_purchaseId: number): Promise<void> {}

// ─── Customers ─────────────────────────────────────────────────────────────
export async function ensureDirectCustomer(): Promise<number> {
  const direct = await getOrCreateDirectCustomer();
  return direct.id;
}

export async function getOrCreateDirectCustomer(): Promise<{ id: number; name: string }> {
  let cust = (await getAllCustomersWithStats()).find((c) => isDirectCustomerName(c.name));
  if (!cust) {
    const id = await upsertCustomer({ name: DIRECT_CUSTOMER_NAME });
    return { id, name: DIRECT_CUSTOMER_NAME };
  }
  return { id: cust.id, name: cust.name };
}

export async function getOrCreateCustomerAccount(input: { name: string; phone?: string | null; address?: string | null }): Promise<number> {
  return upsertCustomer(input);
}

export async function getAllCustomersWithStats(): Promise<any[]> {
  const customers = getLocal<any[]>(KEYS.customers, []);
  const sales = getLocal<any[]>(KEYS.sales, []);
  return customers.map((c) => {
    const cSales = sales.filter((s) => s.customerId === c.id || s.customerName === c.name);
    const totalSpent = cSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
    return {
      ...c,
      totalPurchases: cSales.length,
      totalSpent,
      lastPurchaseDate: cSales[0]?.created_at || null,
    };
  });
}

export async function searchCustomersList(query: string): Promise<any[]> {
  const customers = await getAllCustomersWithStats();
  const q = query.toLowerCase().trim();
  if (!q) return customers;
  return customers.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
  );
}

export async function getCustomerByIdWithStats(id: number): Promise<any | null> {
  const customers = await getAllCustomersWithStats();
  return customers.find((c) => c.id === id) ?? null;
}

export async function getCustomerFinancialTimeline(_customerId: number): Promise<any[]> {
  return [];
}

export async function upsertCustomer(input: any): Promise<number> {
  const customers = getLocal<any[]>(KEYS.customers, []);
  const existing = customers.find((c) => c.name.trim().toLowerCase() === (input.name || '').trim().toLowerCase());
  if (existing) {
    Object.assign(existing, input, { updatedAt: new Date().toISOString() });
    setLocal(KEYS.customers, customers);
    return existing.id;
  }
  const id = Date.now() + Math.floor(Math.random() * 1000);
  customers.push({ ...input, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  setLocal(KEYS.customers, customers);
  return id;
}

export async function updateCustomer(id: number, data: any): Promise<void> {
  const customers = getLocal<any[]>(KEYS.customers, []);
  const idx = customers.findIndex((c) => c.id === id);
  if (idx >= 0) {
    customers[idx] = { ...customers[idx], ...data, updatedAt: new Date().toISOString() };
    setLocal(KEYS.customers, customers);
  }
}

export async function deleteCustomer(id: number): Promise<void> {
  const customers = getLocal<any[]>(KEYS.customers, []);
  setLocal(KEYS.customers, customers.filter((c) => c.id !== id));
}

// ─── Sales ─────────────────────────────────────────────────────────────────
export async function getAllSales(): Promise<any[]> {
  return getLocal<any[]>(KEYS.sales, []);
}

export async function getSaleById(id: number): Promise<any | null> {
  const sales = getLocal<any[]>(KEYS.sales, []);
  return sales.find((s) => s.id === id) ?? null;
}

export async function insertSale(data: any): Promise<number> {
  const sales = getLocal<any[]>(KEYS.sales, []);
  const id = Date.now() + Math.floor(Math.random() * 1000);
  const newSale = {
    ...data,
    id,
    created_at: data.created_at || new Date().toISOString(),
    createdAt: data.createdAt || new Date().toISOString(),
  };
  sales.unshift(newSale);
  setLocal(KEYS.sales, sales);
  return id;
}

export async function updateSaleComplete(saleId: number, input: any): Promise<void> {
  const sales = getLocal<any[]>(KEYS.sales, []);
  const idx = sales.findIndex((s) => s.id === saleId);
  if (idx >= 0) {
    sales[idx] = { ...sales[idx], ...input, updatedAt: new Date().toISOString() };
    setLocal(KEYS.sales, sales);
  }
}

export async function updateSaleInfo(saleId: number, data: any): Promise<void> {
  await updateSaleComplete(saleId, data);
}

export async function deleteSale(id: number): Promise<void> {
  const sales = getLocal<any[]>(KEYS.sales, []);
  setLocal(KEYS.sales, sales.filter((s) => s.id !== id));
}

export async function attachItemsToSales(sales: any[]): Promise<any[]> {
  return sales;
}

export async function getSaleItemsSearchIndex(): Promise<Record<number, string>> {
  return {};
}

export async function getSalesByCustomerId(customerId: number): Promise<any[]> {
  const sales = getLocal<any[]>(KEYS.sales, []);
  return sales.filter((s) => s.customerId === customerId);
}

export async function getSalesByProductId(_productId: number): Promise<any[]> {
  return [];
}

export async function incrementSaleViewCount(_saleId: number): Promise<void> {}
export async function incrementSalePrintCount(_saleId: number): Promise<void> {}

// ─── Debts ─────────────────────────────────────────────────────────────────
export async function getSalesDebtBySaleId(saleId: number): Promise<any | null> {
  const debts = getLocal<any[]>(KEYS.debts, []);
  return debts.find((d) => d.sale_id === saleId || d.saleId === saleId) ?? null;
}

export async function getSalesDebtById(id: number): Promise<any | null> {
  const debts = getLocal<any[]>(KEYS.debts, []);
  return debts.find((d) => d.id === id) ?? null;
}

export async function getAllSalesDebtsDetailed(): Promise<any[]> {
  return getLocal<any[]>(KEYS.debts, []);
}

export async function getDebtsByCustomerId(customerId: number): Promise<any[]> {
  const debts = getLocal<any[]>(KEYS.debts, []);
  return debts.filter((d) => d.customer_id === customerId || d.customerId === customerId);
}

export async function getDebtOverviewSummary(): Promise<{
  totalCustomerDebtIQD: number;
  totalCustomerDebtUSD: number;
  totalSupplierDebtIQD: number;
  totalSupplierDebtUSD: number;
}> {
  const customerDebts = getLocal<any[]>(KEYS.debts, []);
  const supplierDebts = getLocal<any[]>(KEYS.purchaseDebts, []);

  let totalCustIQD = 0;
  let totalCustUSD = 0;
  for (const d of customerDebts) {
    totalCustIQD += d.remaining_amount || d.remainingAmount || 0;
  }

  let totalSuppIQD = 0;
  let totalSuppUSD = 0;
  for (const d of supplierDebts) {
    totalSuppIQD += d.remaining_amount || d.remainingAmount || 0;
  }

  return {
    totalCustomerDebtIQD: totalCustIQD,
    totalCustomerDebtUSD: totalCustUSD,
    totalSupplierDebtIQD: totalSuppIQD,
    totalSupplierDebtUSD: totalSuppUSD,
  };
}

export async function getDebtPayments(_debtId: number): Promise<any[]> {
  return [];
}

export async function getAllDebtPaymentReceipts(): Promise<any[]> {
  return getLocal<any[]>(KEYS.debtReceipts, []);
}

export async function getDebtPaymentReceiptById(id: number): Promise<any | null> {
  const receipts = getLocal<any[]>(KEYS.debtReceipts, []);
  return receipts.find((r) => r.id === id) ?? null;
}

export async function addPaymentToDebt(
  debtId: number,
  amount: number,
  _customerId: number,
  _paymentMethod?: string
): Promise<any> {
  const debts = getLocal<any[]>(KEYS.debts, []);
  const debt = debts.find((d) => d.id === debtId);
  if (debt) {
    debt.remaining_amount = Math.max(0, (debt.remaining_amount || 0) - amount);
    setLocal(KEYS.debts, debts);
  }
  const receiptId = Date.now();
  const receipt = {
    id: receiptId,
    receiptNumber: `RCP-${receiptId}`,
    debtId,
    amount,
    createdAt: new Date().toISOString(),
  };
  const receipts = getLocal<any[]>(KEYS.debtReceipts, []);
  receipts.unshift(receipt);
  setLocal(KEYS.debtReceipts, receipts);
  return receipt;
}

export async function addPaymentToPurchaseDebt(debtId: number, amount: number): Promise<number> {
  const debts = getLocal<any[]>(KEYS.purchaseDebts, []);
  const debt = debts.find((d) => d.id === debtId);
  if (debt) {
    debt.remaining_amount = Math.max(0, (debt.remaining_amount || 0) - amount);
    setLocal(KEYS.purchaseDebts, debts);
  }
  return Date.now();
}

export async function incrementDebtReceiptPrintCount(_receiptId: number): Promise<void> {}
export async function incrementDebtReceiptViewCount(_receiptId: number): Promise<void> {}

// ─── Financial & Reporting ─────────────────────────────────────────────────
export async function saveExchangeRateHistory(rate: number): Promise<void> {
  const history = getLocal<any[]>(KEYS.exchangeRates, []);
  history.unshift({ rate, date: new Date().toISOString() });
  setLocal(KEYS.exchangeRates, history);
}

export async function getExchangeRateHistory(): Promise<any[]> {
  return getLocal<any[]>(KEYS.exchangeRates, []);
}

export async function getCashDrawerStats(): Promise<{
  totalCashInIQD: number;
  totalCashInUSD: number;
  totalCashOutIQD: number;
  totalCashOutUSD: number;
  netCashIQD: number;
  netCashUSD: number;
}> {
  return {
    totalCashInIQD: 0,
    totalCashInUSD: 0,
    totalCashOutIQD: 0,
    totalCashOutUSD: 0,
    netCashIQD: 0,
    netCashUSD: 0,
  };
}

export async function getDashboardOverviewStats(from?: string, to?: string): Promise<{
  totalRevenue: number;
  totalSales: number;
  totalInvoices: number;
  totalPurchasesCost: number;
  totalPurchasesCount: number;
  expectedProfit: number;
  totalDiscount: number;
  totalExpenses: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalItems: number;
  lowStockCount: number;
  customerDebtTotal: number;
  supplierDebtTotal: number;
  totalBatchesCount: number;
  activeBatchesCount: number;
  depletedBatchesCount: number;
  multiBatchProductsCount: number;
  expiringBatchesCount: number;
}> {
  const sales = getLocal<any[]>(KEYS.sales, []);
  const purchases = getLocal<any[]>(KEYS.purchases, []);
  const products = getLocal<any[]>(KEYS.products, []);
  const customers = getLocal<any[]>(KEYS.customers, []);
  const suppliers = getLocal<any[]>(KEYS.suppliers, []);
  const customerDebts = getLocal<any[]>(KEYS.debts, []);
  const supplierDebts = getLocal<any[]>(KEYS.purchaseDebts, []);

  let filteredSales = sales;
  if (from && to) {
    const fromTime = new Date(from).getTime();
    const toTime = new Date(to).getTime();
    filteredSales = sales.filter((s) => {
      const t = new Date(s.created_at || s.createdAt || 0).getTime();
      return t >= fromTime && t <= toTime;
    });
  }

  const totalSales = filteredSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
  const totalRevenue = totalSales;
  const totalDiscount = filteredSales.reduce((acc, s) => acc + (s.discountTotal || 0), 0);
  const totalInvoices = filteredSales.length;

  let totalPurchasesCost = 0;
  for (const p of purchases) {
    totalPurchasesCost += p.totalIQD || 0;
  }

  const custDebtTotal = customerDebts.reduce((acc, d) => acc + (d.remaining_amount || d.remainingAmount || 0), 0);
  const supDebtTotal = supplierDebts.reduce((acc, d) => acc + (d.remaining_amount || d.remainingAmount || 0), 0);
  const lowStockCount = products.filter((p) => (p.quantity || 0) <= 5).length;

  return {
    totalRevenue,
    totalSales,
    totalInvoices,
    totalPurchasesCost,
    totalPurchasesCount: purchases.length,
    expectedProfit: Math.max(0, totalRevenue - totalPurchasesCost),
    totalDiscount,
    totalExpenses: 0,
    totalCustomers: customers.length,
    totalSuppliers: suppliers.length,
    totalItems: products.length,
    lowStockCount,
    customerDebtTotal: custDebtTotal,
    supplierDebtTotal: supDebtTotal,
    totalBatchesCount: 0,
    activeBatchesCount: 0,
    depletedBatchesCount: 0,
    multiBatchProductsCount: 0,
    expiringBatchesCount: 0,
  };
}

export async function getDashboardRecentActivities(
  limit: number = 40,
  _from?: string,
  _to?: string,
  language: 'ku' | 'en' = 'ku',
  _filterUserEmail?: string
): Promise<any[]> {
  const sales = getLocal<any[]>(KEYS.sales, []);
  const purchases = getLocal<any[]>(KEYS.purchases, []);
  const activities: any[] = [];

  for (const s of sales) {
    activities.push({
      id: `sale-${s.id}`,
      type: 'sale',
      timestamp: s.created_at || s.createdAt || new Date().toISOString(),
      title: language === 'ku' ? `فرۆشتن: ${s.invoice_number || s.invoiceNumber || s.id}` : `Sale: ${s.invoice_number || s.invoiceNumber || s.id}`,
      subtitle: s.customerName || (language === 'ku' ? 'کڕیاری ڕاستەوخۆ' : 'Direct Customer'),
      amount: s.grandTotal || 0,
      currency: 'IQD',
      userEmail: s.created_by || s.createdBy || null,
      userName: s.created_by_name || s.createdByName || null,
    });
  }

  for (const p of purchases) {
    activities.push({
      id: `purchase-${p.id}`,
      type: 'purchase',
      timestamp: p.date || p.createdAt || new Date().toISOString(),
      title: language === 'ku' ? `کڕین: ${p.productName || p.purchaseNumber}` : `Purchase: ${p.productName || p.purchaseNumber}`,
      subtitle: p.supplierName || (language === 'ku' ? 'دابینکەری ڕاستەوخۆ' : 'Direct Supplier'),
      amount: p.totalIQD || 0,
      currency: 'IQD',
      userEmail: p.createdBy || null,
      userName: p.createdBy || null,
    });
  }

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return activities.slice(0, limit);
}

export async function getEmployeeActivities(): Promise<any[]> {
  return [];
}

// ─── Sync Queue ────────────────────────────────────────────────────────────
export async function getPendingSyncCount(): Promise<number> {
  return 0;
}

export async function getPendingSyncProducts(): Promise<any[]> {
  return [];
}

export async function clearSyncQueue(): Promise<void> {}
export async function enqueueFullCloudResync(): Promise<void> {}
export async function enqueueProductsWithPendingImages(): Promise<void> {}

// ─── Type Exports for Typescript Consistency ───────────────────────────────
export type CashDrawerStats = {
  totalCashInIQD: number;
  totalCashInUSD: number;
  totalCashOutIQD: number;
  totalCashOutUSD: number;
  netCashIQD: number;
  netCashUSD: number;
};

export type DashboardActivityItem = any;
export type DashboardOverviewStats = any;
export type DebtReportData = any;
export type ExchangeRateEntry = any;
export type Expense = any;
export type FinancialSummaryCards = any;
export type InventoryReportSummary = any;
export type PendingSyncItem = any;
export type ProfitLossData = any;
export type ProfitableProduct = any;
export type PurchaseActor = { id?: number | string | null; name?: string | null };
export type PurchaseReportData = any;
export type RevenuePoint = any;
export type SalesReportData = any;
export type UpdatePurchaseInput = any;
export type PurchaseItem = any;
