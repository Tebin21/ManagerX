/**
 * generateInvoice.ts
 *
 * All PDF generation and sharing is done here.  Both expo-print and
 * expo-sharing require native modules that may be absent in Expo Go or in a
 * development build that hasn't been recompiled after adding the packages.
 *
 * Defence strategy:
 *   - expo-print  → loaded via require() inside getPrintModule() so the
 *                   synchronous throw from requireNativeModule is caught by a
 *                   normal try/catch before any Promise is involved.
 *   - expo-sharing → same pattern via getSharingModule().
 *   - Sharing availability is checked BEFORE PDF generation so we fail fast.
 *   - Every public share* function has its own top-level try/catch so a
 *     failure in any step (HTML build, PDF write, share dialog) never causes
 *     an uncaught rejection or a white/red screen.
 *   - A per-function isGenerating guard prevents double-tap from spawning
 *     two concurrent PDF builds.
 */

import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import { buildInvoiceHTML, buildPurchaseInvoiceHTML, type PurchaseItemRow } from './invoiceTemplate';
import { useSettingsStore } from '@/store/settingsStore';
import { PURCHASE_RATE } from '@/types/purchases';
import { buildInventoryReportHTML } from './inventoryReportTemplate';
import {
  buildFullInventoryReportHTML,
  buildLowStockReportHTML,
  buildCategoryReportHTML,
} from './inventoryPDFReports';
import { computeProductLowStock } from '@/lib/lowStock';
import { buildCustomerReportHTML } from './customerReportTemplate';
import { buildSupplierReportHTML } from './supplierReportTemplate';
import { buildSalesDebtReportHTML, buildPurchaseDebtReportHTML } from './debtReportTemplate';
import type { FullReportData } from './reportTemplate';
import type { FinancialExportData } from './financialReportTemplate';
import type { Sale, Debt } from '@/types/sales';
import type { Purchase } from '@/types/purchases';
import type { InventoryProduct, InventoryStats } from '@/types/inventory';
import type { CustomerWithStats } from '@/types/customers';
import type { SupplierWithStats } from '@/types/suppliers';
import type { SalesDebtDetail, PurchaseDebt, DebtPayment } from '@/types/debt';
import i18n from '@/lib/i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  logoUri: string | null;
}

// ─── Double-tap guard ─────────────────────────────────────────────────────────

let _generating = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDir(): 'ltr' | 'rtl' {
  return 'ltr';
}

/**
 * Returns true when running inside Expo Go (the hosted sandbox) where custom
 * native modules like expo-print and expo-sharing are not compiled in.
 *
 * Covers all SDK 50-54 Expo Go detection paths.
 */
function isExpoGo(): boolean {
  const env = Constants.executionEnvironment as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownership = (Constants as any).appOwnership as string | undefined;
  return (
    env === 'storeClient' ||
    env === 'expo' ||
    ownership === 'expo'
  );
}

/**
 * Lazily loads expo-print using a synchronous require() inside try/catch.
 * Returns null if the module or native layer is unavailable.
 */
async function getPrintModule(): Promise<typeof import('expo-print') | null> {
  if (isExpoGo()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Print = require('expo-print') as typeof import('expo-print');
    if (typeof Print?.printToFileAsync !== 'function') return null;
    return Print;
  } catch {
    return null;
  }
}

/**
 * Lazily loads expo-sharing using a synchronous require() inside try/catch.
 * Also verifies that sharing is actually available on this device/platform.
 * Returns null in any failure case.
 */
async function getSharingModule(): Promise<typeof import('expo-sharing') | null> {
  if (isExpoGo()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');
    if (!Sharing || typeof Sharing.shareAsync !== 'function') return null;

    let available = false;
    try {
      available = await Sharing.isAvailableAsync();
    } catch {
      available = false;
    }

    return available ? Sharing : null;
  } catch {
    return null;
  }
}

/**
 * Core PDF generation + share flow reused by every export function.
 *
 * Checks sharing availability FIRST (fail fast), then generates the PDF,
 * then opens the share sheet.  Returns true on success, false on any failure
 * (already handled inside with a user-friendly Alert).
 */
async function generateAndShare(
  html: string,
  dialogTitle: string,
  errorMessage: string
): Promise<boolean> {
  if (Platform.OS === 'web') {
    Alert.alert('Not supported', 'PDF export is not available on web.');
    return false;
  }

  // ── Check sharing availability before wasting time on PDF generation ──
  const Sharing = await getSharingModule();
  if (!Sharing) {
    if (isExpoGo()) {
      Alert.alert(
        'Sharing unavailable',
        'PDF sharing is not available in Expo Go. Please use the full app build.'
      );
    } else {
      Alert.alert(
        'Sharing unavailable',
        'PDF sharing is not available on this device.'
      );
    }
    return false;
  }

  const Print = await getPrintModule();
  if (!Print) {
    Alert.alert(
      'PDF unavailable',
      'PDF export is not available on this device. Please update the app.'
    );
    return false;
  }

  let uri: string;
  try {
    const result = await Print.printToFileAsync({ html, base64: false });
    uri = result.uri;
  } catch (printErr) {
    console.error('[PDF] printToFileAsync failed:', printErr);
    Alert.alert('Error', errorMessage);
    return false;
  }

  try {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle,
      UTI: 'com.adobe.pdf',
    });
  } catch (shareErr) {
    console.error('[PDF] shareAsync failed:', shareErr);
    Alert.alert('Error', errorMessage);
    return false;
  }

  return true;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function shareInvoice(sale: Sale, business: BusinessInfo): Promise<void> {
  if (_generating) return;
  _generating = true;
  try {
    const rate = sale.exchangeRateUsed ?? useSettingsStore.getState().exchangeRate ?? PURCHASE_RATE;
    const html = buildInvoiceHTML(sale, business, getDir(), rate);
    await generateAndShare(
      html,
      `Invoice ${sale.invoiceNumber}`,
      'Could not generate invoice PDF. Please try again.'
    );
  } catch (err) {
    console.error('[PDF] shareInvoice unexpected error:', err);
    Alert.alert('Error', 'Could not generate invoice PDF. Please try again.');
  } finally {
    _generating = false;
  }
}

export async function sharePurchaseInvoice(
  purchase: Purchase,
  purchaseItems: PurchaseItemRow[],
  business: BusinessInfo
): Promise<void> {
  if (_generating) return;
  _generating = true;
  try {
    const html = buildPurchaseInvoiceHTML(purchase, purchaseItems, business, getDir());
    await generateAndShare(
      html,
      `Purchase Invoice ${purchase.purchaseNumber}`,
      'Could not generate purchase invoice PDF. Please try again.'
    );
  } catch (err) {
    console.error('[PDF] sharePurchaseInvoice unexpected error:', err);
    Alert.alert('Error', 'Could not generate purchase invoice PDF. Please try again.');
  } finally {
    _generating = false;
  }
}

export async function shareInventoryReport(
  products: InventoryProduct[],
  stats: InventoryStats,
  business: BusinessInfo
): Promise<void> {
  if (_generating) return;
  _generating = true;
  try {
    const html = buildInventoryReportHTML(products, stats, business, getDir());
    await generateAndShare(
      html,
      'Inventory Report',
      'Could not generate the inventory report. Please try again.'
    );
  } catch (err) {
    console.error('[PDF] shareInventoryReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the inventory report. Please try again.');
  } finally {
    _generating = false;
  }
}

export async function shareSalesDebtReport(
  debt: SalesDebtDetail,
  payments: DebtPayment[],
  business: BusinessInfo
): Promise<void> {
  if (_generating) return;
  _generating = true;
  try {
    const html = buildSalesDebtReportHTML(debt, payments, business, getDir());
    await generateAndShare(
      html,
      `Debt Report — ${debt.customerName}`,
      'Could not generate the debt report. Please try again.'
    );
  } catch (err) {
    console.error('[PDF] shareSalesDebtReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the debt report. Please try again.');
  } finally {
    _generating = false;
  }
}

export async function sharePurchaseDebtReport(
  debt: PurchaseDebt,
  payments: DebtPayment[],
  business: BusinessInfo
): Promise<void> {
  if (_generating) return;
  _generating = true;
  try {
    const html = buildPurchaseDebtReportHTML(debt, payments, business, getDir());
    await generateAndShare(
      html,
      `Supplier Debt Report — ${debt.supplierName}`,
      'Could not generate the supplier debt report. Please try again.'
    );
  } catch (err) {
    console.error('[PDF] sharePurchaseDebtReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the supplier debt report. Please try again.');
  } finally {
    _generating = false;
  }
}

export async function shareCustomerReport(
  customer: CustomerWithStats,
  sales: Sale[],
  debts: Debt[],
  business: BusinessInfo
): Promise<void> {
  if (_generating) return;
  _generating = true;
  try {
    const html = buildCustomerReportHTML(customer, sales, debts, business, getDir());
    await generateAndShare(
      html,
      `Customer Report — ${customer.name}`,
      'Could not generate the customer report. Please try again.'
    );
  } catch (err) {
    console.error('[PDF] shareCustomerReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the customer report. Please try again.');
  } finally {
    _generating = false;
  }
}

export async function shareSupplierReport(
  supplier: SupplierWithStats,
  purchases: Purchase[],
  debts: PurchaseDebt[],
  business: BusinessInfo
): Promise<void> {
  if (_generating) return;
  _generating = true;
  try {
    const html = buildSupplierReportHTML(supplier, purchases, debts, business, getDir());
    await generateAndShare(
      html,
      `Supplier Report — ${supplier.name}`,
      'Could not generate the supplier report. Please try again.'
    );
  } catch (err) {
    console.error('[PDF] shareSupplierReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the supplier report. Please try again.');
  } finally {
    _generating = false;
  }
}

export async function shareFullInventoryReport(
  products: InventoryProduct[],
  stats: InventoryStats,
  business: BusinessInfo,
  globalLowStockEnabled: boolean,
  globalLowStockThreshold: number,
): Promise<void> {
  if (_generating) return;
  _generating = true;
  try {
    const lowStockIds = new Set<number>(
      products
        .filter((p) => computeProductLowStock(p, globalLowStockEnabled, globalLowStockThreshold))
        .map((p) => p.id),
    );
    const html = buildFullInventoryReportHTML(products, stats, business, lowStockIds, getDir());
    await generateAndShare(
      html,
      'Full Inventory Report',
      'Could not generate the inventory report. Please try again.',
    );
  } catch (err) {
    console.error('[PDF] shareFullInventoryReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the inventory report. Please try again.');
  } finally {
    _generating = false;
  }
}

export async function shareLowStockInventoryReport(
  lowStockProducts: InventoryProduct[],
  business: BusinessInfo,
): Promise<void> {
  if (_generating) return;
  _generating = true;
  try {
    const html = buildLowStockReportHTML(lowStockProducts, business, getDir());
    await generateAndShare(
      html,
      'Low Stock Report',
      'Could not generate the low stock report. Please try again.',
    );
  } catch (err) {
    console.error('[PDF] shareLowStockInventoryReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the low stock report. Please try again.');
  } finally {
    _generating = false;
  }
}

export async function shareCategoryInventoryReport(
  products: InventoryProduct[],
  categoryName: string,
  business: BusinessInfo,
): Promise<void> {
  if (_generating) return;
  _generating = true;
  try {
    const html = buildCategoryReportHTML(products, categoryName, business, getDir());
    await generateAndShare(
      html,
      `Category Report — ${categoryName}`,
      'Could not generate the category report. Please try again.',
    );
  } catch (err) {
    console.error('[PDF] shareCategoryInventoryReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the category report. Please try again.');
  } finally {
    _generating = false;
  }
}

export async function shareFullReport(
  data: FullReportData,
  business: BusinessInfo
): Promise<void> {
  if (_generating) return;
  _generating = true;
  try {
    const { buildFullReportHTML } = await import('./reportTemplate');
    const html = buildFullReportHTML(data, business, getDir());
    await generateAndShare(
      html,
      'Business Report',
      'Could not generate the report PDF. Please try again.'
    );
  } catch (err) {
    console.error('[PDF] shareFullReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the report PDF. Please try again.');
  } finally {
    _generating = false;
  }
}

export async function shareFinancialReport(
  data: FinancialExportData,
  business: BusinessInfo
): Promise<void> {
  if (_generating) return;
  _generating = true;
  try {
    const { buildFinancialReportHTML } = await import('./financialReportTemplate');
    const html = buildFinancialReportHTML(data, business, getDir());
    await generateAndShare(
      html,
      'Financial Report',
      'Could not generate the financial report. Please try again.'
    );
  } catch (err) {
    console.error('[PDF] shareFinancialReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the financial report. Please try again.');
  } finally {
    _generating = false;
  }
}
