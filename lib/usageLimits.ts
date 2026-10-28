import { getDatabase, loadSetting, saveSetting } from '@/lib/sqlite';
import { useQuotationStore } from '@/store/quotationStore';
import { loadLicenseFromDb } from '@/lib/itemLimit';
import { showUsageLimitModal } from '@/store/usageLimitModalStore';
import { useManagementStore } from '@/store/managementStore';

export const USAGE_LIMITS = {
  MAX_ITEMS: 20,           // ٢٠ ئایتم
  MAX_QUANTITY: 30,        // ٣٠ بڕ
  MAX_SALES: 15,           // ١٥ فرۆشتن
  MAX_INVOICE_PRINTS: 40,  // ٤٠ وەسڵ
  MAX_QUOTATIONS: 5,       // ٥ عەرز
} as const;

function getCustomAccountConfig() {
  try {
    const { isEmployee, currentEmployeeAccount, isManager, managedEmployees } = useManagementStore.getState();
    if (isEmployee && currentEmployeeAccount) {
      return {
        limits: currentEmployeeAccount.limits,
        expiresAt: currentEmployeeAccount.expiresAt,
        isSuspended: currentEmployeeAccount.status === 'suspended' || currentEmployeeAccount.managerStatus === 'suspended',
      };
    }
    if (isManager && managedEmployees.length > 0) {
      return {
        limits: managedEmployees[0].limits,
        expiresAt: managedEmployees[0].expiresAt,
        isSuspended: managedEmployees[0].status === 'suspended' || managedEmployees[0].managerStatus === 'suspended',
      };
    }
  } catch {}
  return null;
}

export function isAccountExpired(): boolean {
  const cfg = getCustomAccountConfig();
  if (!cfg) return false;
  if (cfg.isSuspended) return true;
  if (cfg.expiresAt) {
    const expireTime = new Date(cfg.expiresAt).getTime();
    if (expireTime > 0 && expireTime < Date.now()) {
      return true;
    }
  }
  return false;
}

export async function isLicenseActive(): Promise<boolean> {
  if (isAccountExpired()) {
    return false;
  }
  try {
    const license = await loadLicenseFromDb();
    if (license.licenseCode && !license.expired && license.plan !== 'basic') {
      return true;
    }
  } catch (e) {
    console.warn('[UsageLimits] License verification error:', e);
  }
  return false;
}

export async function checkItemsLimit(additionalItems: number = 0): Promise<{ allowed: boolean; current: number; limit: number }> {
  if (isAccountExpired()) {
    return { allowed: false, current: 0, limit: 0 };
  }
  if (await isLicenseActive()) {
    return { allowed: true, current: 0, limit: Infinity };
  }
  const cfg = getCustomAccountConfig();
  if (cfg?.limits?.maxItems === 'unlimited') {
    return { allowed: true, current: 0, limit: Infinity };
  }
  try {
    const database = await getDatabase();
    const row = await database.getFirstAsync<{ cnt: number }>(
      'SELECT COUNT(CASE WHEN is_active = 1 THEN 1 END) AS cnt FROM products'
    );
    const current = row?.cnt ?? 0;
    const limit = typeof cfg?.limits?.maxItems === 'number' ? cfg.limits.maxItems : USAGE_LIMITS.MAX_ITEMS;
    return {
      allowed: current + additionalItems <= limit,
      current,
      limit,
    };
  } catch (err) {
    console.warn('[UsageLimits] checkItemsLimit failed:', err);
    return { allowed: true, current: 0, limit: USAGE_LIMITS.MAX_ITEMS };
  }
}

export async function checkQuantityLimit(additionalQuantity: number = 0): Promise<{ allowed: boolean; current: number; limit: number }> {
  if (isAccountExpired()) {
    return { allowed: false, current: 0, limit: 0 };
  }
  if (await isLicenseActive()) {
    return { allowed: true, current: 0, limit: Infinity };
  }
  const cfg = getCustomAccountConfig();
  if (cfg?.limits?.maxQuantity === 'unlimited') {
    return { allowed: true, current: 0, limit: Infinity };
  }
  try {
    const database = await getDatabase();
    const row = await database.getFirstAsync<{ totalQty: number }>(
      'SELECT COALESCE(SUM(CASE WHEN is_active = 1 AND quantity > 0 THEN quantity END), 0) AS totalQty FROM products'
    );
    const current = row?.totalQty ?? 0;
    const limit = typeof cfg?.limits?.maxQuantity === 'number' ? cfg.limits.maxQuantity : USAGE_LIMITS.MAX_QUANTITY;
    const allowed = current + additionalQuantity <= limit && additionalQuantity <= limit;
    return {
      allowed,
      current,
      limit,
    };
  } catch (err) {
    console.warn('[UsageLimits] checkQuantityLimit failed:', err);
    return { allowed: true, current: 0, limit: USAGE_LIMITS.MAX_QUANTITY };
  }
}

export async function checkSalesLimit(): Promise<{ allowed: boolean; current: number; limit: number }> {
  if (isAccountExpired()) {
    return { allowed: false, current: 0, limit: 0 };
  }
  if (await isLicenseActive()) {
    return { allowed: true, current: 0, limit: Infinity };
  }
  const cfg = getCustomAccountConfig();
  if (cfg?.limits?.maxSales === 'unlimited') {
    return { allowed: true, current: 0, limit: Infinity };
  }
  try {
    const database = await getDatabase();
    const row = await database.getFirstAsync<{ cnt: number }>(
      'SELECT COUNT(*) AS cnt FROM sales'
    );
    const current = row?.cnt ?? 0;
    const limit = typeof cfg?.limits?.maxSales === 'number' ? cfg.limits.maxSales : USAGE_LIMITS.MAX_SALES;
    return {
      allowed: current < limit,
      current,
      limit,
    };
  } catch (err) {
    console.warn('[UsageLimits] checkSalesLimit failed:', err);
    return { allowed: true, current: 0, limit: USAGE_LIMITS.MAX_SALES };
  }
}

export async function checkQuotationsLimit(): Promise<{ allowed: boolean; current: number; limit: number }> {
  if (isAccountExpired()) {
    return { allowed: false, current: 0, limit: 0 };
  }
  if (await isLicenseActive()) {
    return { allowed: true, current: 0, limit: Infinity };
  }
  const cfg = getCustomAccountConfig();
  if (cfg?.limits?.maxQuotations === 'unlimited') {
    return { allowed: true, current: 0, limit: Infinity };
  }
  try {
    const quotations = useQuotationStore.getState().quotations ?? [];
    const current = quotations.length;
    const limit = typeof cfg?.limits?.maxQuotations === 'number' ? cfg.limits.maxQuotations : USAGE_LIMITS.MAX_QUOTATIONS;
    return {
      allowed: current < limit,
      current,
      limit,
    };
  } catch (err) {
    console.warn('[UsageLimits] checkQuotationsLimit failed:', err);
    return { allowed: true, current: 0, limit: USAGE_LIMITS.MAX_QUOTATIONS };
  }
}

export async function checkInvoicePrintLimit(): Promise<{ allowed: boolean; current: number; limit: number }> {
  if (isAccountExpired()) {
    return { allowed: false, current: 0, limit: 0 };
  }
  if (await isLicenseActive()) {
    return { allowed: true, current: 0, limit: Infinity };
  }
  const cfg = getCustomAccountConfig();
  if (cfg?.limits?.maxInvoices === 'unlimited') {
    return { allowed: true, current: 0, limit: Infinity };
  }
  try {
    const database = await getDatabase();
    const salesRow = await database.getFirstAsync<{ salesPrints: number }>(
      'SELECT COALESCE(SUM(print_count), 0) AS salesPrints FROM sales'
    );
    const purchaseRow = await database.getFirstAsync<{ purchasePrints: number }>(
      'SELECT COALESCE(SUM(print_count), 0) AS purchasePrints FROM purchases'
    );
    const settingStr = await loadSetting('system_printed_invoices_count');
    const settingCount = parseInt(settingStr || '0', 10) || 0;

    const quotes = useQuotationStore.getState().quotations ?? [];
    const quotePrints = quotes.reduce((acc, q) => acc + (q.printCount || 0), 0);

    const dbPrints = (salesRow?.salesPrints ?? 0) + (purchaseRow?.purchasePrints ?? 0) + quotePrints;
    const current = Math.max(settingCount, dbPrints);
    const limit = typeof cfg?.limits?.maxInvoices === 'number' ? cfg.limits.maxInvoices : USAGE_LIMITS.MAX_INVOICE_PRINTS;

    return {
      allowed: current < limit,
      current,
      limit,
    };
  } catch (err) {
    console.warn('[UsageLimits] checkInvoicePrintLimit failed:', err);
    return { allowed: true, current: 0, limit: USAGE_LIMITS.MAX_INVOICE_PRINTS };
  }
}

export async function recordInvoicePrint(): Promise<number> {
  try {
    const status = await checkInvoicePrintLimit();
    const nextCount = status.current + 1;
    await saveSetting('system_printed_invoices_count', String(nextCount));
    return nextCount;
  } catch (err) {
    console.warn('[UsageLimits] recordInvoicePrint failed:', err);
    return 0;
  }
}

export async function assertSalesLimit(): Promise<void> {
  const check = await checkSalesLimit();
  if (!check.allowed) {
    showUsageLimitModal();
    throw new Error(`USAGE_LIMIT_SALES_REACHED|${check.current},${check.limit}`);
  }
}

export async function assertQuotationsLimit(): Promise<void> {
  const check = await checkQuotationsLimit();
  if (!check.allowed) {
    showUsageLimitModal();
    throw new Error(`USAGE_LIMIT_QUOTATIONS_REACHED|${check.current},${check.limit}`);
  }
}

export async function assertInvoicePrintLimit(): Promise<boolean> {
  const check = await checkInvoicePrintLimit();
  if (!check.allowed) {
    showUsageLimitModal();
    return false;
  }
  return true;
}

export async function assertStockAndItemLimits(newProductsCount: number, additionalQuantity: number): Promise<void> {
  if (await isLicenseActive()) return;

  if (newProductsCount > 0) {
    const itemsCheck = await checkItemsLimit(newProductsCount);
    if (!itemsCheck.allowed) {
      showUsageLimitModal();
      throw new Error(`USAGE_LIMIT_ITEMS_REACHED|${itemsCheck.current},${itemsCheck.limit}`);
    }
  }

  const qtyCheck = await checkQuantityLimit(additionalQuantity);
  if (!qtyCheck.allowed) {
    showUsageLimitModal();
    throw new Error(`USAGE_LIMIT_QUANTITY_REACHED|${qtyCheck.current},${qtyCheck.limit}`);
  }
}

