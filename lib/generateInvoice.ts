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
 *   - Every public share* function has its own top-level try/catch so a
 *     failure in any step (HTML build, PDF write, share dialog) never causes
 *     an uncaught rejection or a white/red screen.
 */

import { Alert, Platform } from 'react-native';
import { buildInvoiceHTML, buildPurchaseInvoiceHTML } from './invoiceTemplate';
import { buildInventoryReportHTML } from './inventoryReportTemplate';
import { buildCustomerReportHTML } from './customerReportTemplate';
import { buildSalesDebtReportHTML, buildPurchaseDebtReportHTML } from './debtReportTemplate';
import type { FullReportData } from './reportTemplate';
import type { Sale, Debt } from '@/types/sales';
import type { Purchase } from '@/types/purchases';
import type { InventoryProduct, InventoryStats } from '@/types/inventory';
import type { CustomerWithStats } from '@/types/customers';
import type { SalesDebtDetail, PurchaseDebt, DebtPayment } from '@/types/debt';
import i18n from '@/lib/i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  logoUri: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDir(): 'ltr' | 'rtl' {
  return i18n.language === 'ku' ? 'rtl' : 'ltr';
}

/**
 * Lazily loads expo-print using a synchronous require() inside try/catch so
 * that the native-module-not-found error is caught before any Promise
 * machinery is involved.  Returns null if the module or native layer is
 * unavailable.
 */
async function getPrintModule(): Promise<typeof import('expo-print') | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Print = require('expo-print') as typeof import('expo-print');
    // Sanity-check: the module object must expose printToFileAsync
    if (typeof Print?.printToFileAsync !== 'function') return null;
    return Print;
  } catch {
    return null;
  }
}

/**
 * Lazily loads expo-sharing using a synchronous require() inside try/catch.
 * Also verifies that sharing is actually available on this device/platform
 * before returning the module.  Returns null in any failure case.
 */
async function getSharingModule(): Promise<typeof import('expo-sharing') | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');
    if (!Sharing || typeof Sharing.shareAsync !== 'function') return null;

    // isAvailableAsync can itself throw on some platforms — guard it.
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
 * Returns true on success, false on any failure (already handled inside).
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

  const Print = await getPrintModule();
  if (!Print) {
    Alert.alert(
      'Print unavailable',
      'PDF generation requires a development build with expo-print compiled in. ' +
        'Please run: npx expo run:ios  or  npx expo run:android'
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

  const Sharing = await getSharingModule();
  if (!Sharing) {
    Alert.alert(
      'Sharing unavailable',
      'PDF sharing requires a development build with expo-sharing compiled in. ' +
        'Please run: npx expo run:ios  or  npx expo run:android'
    );
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
  try {
    const html = buildInvoiceHTML(sale, business, getDir());
    await generateAndShare(
      html,
      `Invoice ${sale.invoiceNumber}`,
      'Could not generate invoice PDF. Please try again.'
    );
  } catch (err) {
    console.error('[PDF] shareInvoice unexpected error:', err);
    Alert.alert('Error', 'Could not generate invoice PDF. Please try again.');
  }
}

export async function sharePurchaseInvoice(
  purchase: Purchase,
  business: BusinessInfo
): Promise<void> {
  try {
    const html = buildPurchaseInvoiceHTML(purchase, business, getDir());
    await generateAndShare(
      html,
      `Purchase Invoice ${purchase.purchaseNumber}`,
      'Could not generate purchase invoice PDF. Please try again.'
    );
  } catch (err) {
    console.error('[PDF] sharePurchaseInvoice unexpected error:', err);
    Alert.alert('Error', 'Could not generate purchase invoice PDF. Please try again.');
  }
}

export async function shareInventoryReport(
  products: InventoryProduct[],
  stats: InventoryStats,
  business: BusinessInfo
): Promise<void> {
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
  }
}

export async function shareSalesDebtReport(
  debt: SalesDebtDetail,
  payments: DebtPayment[],
  business: BusinessInfo
): Promise<void> {
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
  }
}

export async function sharePurchaseDebtReport(
  debt: PurchaseDebt,
  payments: DebtPayment[],
  business: BusinessInfo
): Promise<void> {
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
  }
}

export async function shareCustomerReport(
  customer: CustomerWithStats,
  sales: Sale[],
  debts: Debt[],
  business: BusinessInfo
): Promise<void> {
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
  }
}

export async function shareFullReport(
  data: FullReportData,
  business: BusinessInfo
): Promise<void> {
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
  }
}
