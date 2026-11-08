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
import * as FileSystem from 'expo-file-system/legacy';
import { buildInvoiceHTML, buildPurchaseInvoiceHTML, type PurchaseItemRow, type ReceiptCurrencyMode } from './invoiceTemplate';
import { buildThermalReceiptHTML } from './thermalReceiptTemplate';
import { useSettingsStore, type ThermalReceiptWidth, type ReceiptPaperSize } from '@/store/settingsStore';
export { type ThermalReceiptWidth, type ReceiptPaperSize } from '@/store/settingsStore';
import { PURCHASE_RATE } from '@/types/purchases';
import { buildInventoryReportHTML } from './inventoryReportTemplate';
import {
  buildFullInventoryReportHTML,
  buildLowStockReportHTML,
  buildOutOfStockReportHTML,
  buildCategoryReportHTML,
} from './inventoryPDFReports';
import { computeProductLowStock } from '@/lib/lowStock';
import { buildCustomerReportHTML } from './customerReportTemplate';
import { buildSupplierReportHTML } from './supplierReportTemplate';
import { buildSalesDebtReportHTML, buildPurchaseDebtReportHTML, type DebtReportSections } from './debtReportTemplate';
import type { FullReportData } from './reportTemplate';
import type { FinancialExportData } from './financialReportTemplate';
import type { Sale, SaleItem, Debt } from '@/types/sales';
import type { Purchase } from '@/types/purchases';
import type { InventoryProduct, InventoryStats, InventoryHistoryItem } from '@/types/inventory';
import type { CustomerWithStats } from '@/types/customers';
import type { SupplierWithStats } from '@/types/suppliers';
import type { DebtPaymentReceiptData } from '@/types/debt';
import type { DebtReceiptPaperSize } from './debtPaymentReceiptTemplate';
import type { SalesDebtDetail, PurchaseDebt, DebtPayment, DebtOverviewSummary } from '@/types/debt';
import type { Quotation } from '@/types/quotation';
import i18n from '@/lib/i18n';
import { useLanguageStore } from '@/store/languageStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  logoUri: string | null;
}

// ─── Double-tap guard ─────────────────────────────────────────────────────────
//
// One PDF/share flow at a time app-wide (a second WebView/print job while one
// is already open can misbehave). `Sharing.shareAsync`'s share sheet on iOS
// keeps its promise pending until the user dismisses it, so this lock can be
// held for a while during normal use -- a blocked call must tell the user why
// instead of silently doing nothing. `_generatingSince` lets a lock that
// never reached its `finally` (which nothing here should ever cause, but a
// future change might) self-clear instead of wedging every PDF button.

let _generating = false;
let _generatingSince = 0;
const GENERATION_LOCK_STALE_MS = 45_000;

// `Sharing.shareAsync`'s promise only settles when the OS share sheet's
// completion callback fires -- on real devices that callback can simply
// never arrive (e.g. handing the file off to another app, or backgrounding
// before returning to dismiss the sheet). Bounding the wait here guarantees
// generateAndShare() -- and therefore every share*() caller's `finally` --
// always runs promptly instead of leaving `_generating` stuck forever.
const SHARE_TIMEOUT_MS = 10_000;

/**
 * Generates a standardized PDF filename that always begins with "Froshiar-"
 * in English, followed by the invoice number or document identifier.
 * E.g. "Froshiar-F-00011", "Froshiar-P-00004", "Froshiar-Q-00002".
 */
export function buildFroshiarPdfFileName(
  rawNumberOrLabel?: string | null,
  fallback = 'Invoice'
): string {
  const trimmed = (rawNumberOrLabel || '').trim();
  if (!trimmed) {
    return `Froshiar-${fallback}`;
  }
  if (/^froshiar[-_ ]/i.test(trimmed)) {
    return trimmed.replace(/^froshiar[-_ ]+/i, 'Froshiar-');
  }
  return `Froshiar-${trimmed}`;
}

function tryAcquireGenerationLock(): boolean {
  if (_generating && Date.now() - _generatingSince > GENERATION_LOCK_STALE_MS) {
    _generating = false;
  }
  if (_generating) {
    Alert.alert(
      'Please wait',
      'A PDF is already being generated. Please wait for it to finish before starting another.'
    );
    return false;
  }
  _generating = true;
  _generatingSince = Date.now();
  return true;
}

function releaseGenerationLock(): void {
  _generating = false;
  _generatingSince = 0;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDir(): 'ltr' | 'rtl' {
  const lang = useLanguageStore.getState().language || i18n.language;
  return lang === 'ku' ? 'rtl' : 'ltr';
}

const LOGO_MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
};

/**
 * Resolves a stored logo URI into a base64 data: URI so it's embedded
 * directly in the PDF's HTML — avoids relying on the print engine being
 * able to reach a file:// path. Returns null (omit the logo) on any
 * failure: missing file, corrupted file, or unreadable path.
 */
// Every PDF call re-resolves the business logo, but the logo rarely changes
// between exports -- cache the last resolved URI's result so back-to-back
// generations (or a session with many exports) skip redundant FileSystem
// reads + base64 encoding of the same image.
let _logoCache: { uri: string; dataUri: string | null } | null = null;

async function resolveLogoDataUri(logoUri: string | null): Promise<string | null> {
  if (!logoUri) return null;
  const trimmed = logoUri.trim();
  if (trimmed.includes('..')) return null;

  if (trimmed.startsWith('data:')) {
    // Only permit safe image MIME types
    if (!/^data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml);base64,/i.test(trimmed)) {
      return null;
    }
    return trimmed;
  }

  if (_logoCache && _logoCache.uri === trimmed) return _logoCache.dataUri;
  try {
    const info = await FileSystem.getInfoAsync(trimmed);
    if (!info.exists) {
      _logoCache = { uri: trimmed, dataUri: null };
      return null;
    }
    const base64 = await FileSystem.readAsStringAsync(trimmed, { encoding: FileSystem.EncodingType.Base64 });
    const rawExt = trimmed.split('?')[0].split('.').pop()?.toLowerCase() ?? 'jpg';
    const ext = LOGO_MIME_BY_EXT[rawExt] ? rawExt : 'jpg';
    const dataUri = `data:${LOGO_MIME_BY_EXT[ext] ?? 'image/jpeg'};base64,${base64}`;
    _logoCache = { uri: trimmed, dataUri };
    return dataUri;
  } catch (err) {
    console.warn('[PDF] failed to resolve logo image, omitting from receipt:', err);
    return null;
  }
}

async function withResolvedLogo(business: BusinessInfo): Promise<BusinessInfo> {
  return { ...business, logoUri: await resolveLogoDataUri(business.logoUri) };
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

function printHtmlViaIframe(html: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return false;

    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('[Print] iframe print error:', e);
      } finally {
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        }, 1500);
      }
    }, 250);
    return true;
  } catch (e) {
    console.error('[Print] printHtmlViaIframe error:', e);
    return false;
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
  errorMessage: string,
  fileName?: string
): Promise<boolean> {
  if (Platform.OS === 'web') {
    const desktopAPI = typeof window !== 'undefined' ? (window as any).desktopAPI : null;
    if (desktopAPI && typeof desktopAPI.exportPdf === 'function') {
      const cleanBase = fileName
        ? fileName.replace(/[\\/:*?"<>|#\n\r\t]/g, '_').trim()
        : 'Froshiar-Document';
      const safeFileName = cleanBase.toLowerCase().endsWith('.pdf') ? cleanBase : `${cleanBase}.pdf`;
      const res = await desktopAPI.exportPdf({
        html,
        pageSize: 'A4',
        defaultFileName: safeFileName,
      });
      if (res?.success) return true;
      if (res?.cancelled) return false;
    }
    return printHtmlViaIframe(html);
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

  // Ensure PDF has a meaningful, customer-friendly filename starting with Froshiar:
  // e.g. "Froshiar-F-00011.pdf" instead of random temp name like "Print-1234.pdf".
  if (fileName) {
    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (cacheDir) {
        const cleanBase = fileName
          .replace(/[\\/:*?"<>|#\n\r\t]/g, '_')
          .replace(/\s+/g, '_')
          .trim();
        const safeFileName = cleanBase.toLowerCase().endsWith('.pdf')
          ? cleanBase
          : `${cleanBase}.pdf`;
        const targetUri = `${cacheDir}${safeFileName}`;

        await FileSystem.deleteAsync(targetUri, { idempotent: true });
        await FileSystem.copyAsync({ from: uri, to: targetUri });
        uri = targetUri;
      }
    } catch (renameErr) {
      console.warn('[PDF] Failed to copy PDF to named targetUri, using original uri:', renameErr);
    }
  }

  let timedOut = false;
  try {
    const sharePromise = Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle,
      UTI: 'com.adobe.pdf',
    }).catch((err) => {
      // If we already timed out below, the share sheet's outcome no longer
      // matters to this call -- swallow it so it doesn't surface as an
      // unhandled rejection or a second, misleading Alert.
      if (!timedOut) throw err;
      console.warn('[PDF] shareAsync settled after timeout:', err);
    });

    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      setTimeout(() => {
        timedOut = true;
        resolve('timeout');
      }, SHARE_TIMEOUT_MS);
    });

    const result = await Promise.race([sharePromise, timeoutPromise]);
    if (result === 'timeout') {
      console.warn('[PDF] shareAsync did not settle within', SHARE_TIMEOUT_MS, 'ms; treating as handed off');
    }
  } catch (shareErr) {
    console.error('[PDF] shareAsync failed:', shareErr);
    Alert.alert('Error', errorMessage);
    return false;
  }

  return true;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function shareInvoice(
  sale: Sale,
  business: BusinessInfo,
  currencyMode: ReceiptCurrencyMode = 'iqd'
): Promise<void> {
  const { checkInvoicePrintLimit, recordInvoicePrint } = await import('@/lib/usageLimits');
  const printCheck = await checkInvoicePrintLimit();
  if (!printCheck.allowed) {
    const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
    showUsageLimitModal();
    return;
  }

  if (!tryAcquireGenerationLock()) return;
  try {
    const biz = await withResolvedLogo(business);
    const rate = sale.exchangeRateUsed ?? useSettingsStore.getState().exchangeRate ?? PURCHASE_RATE;
    const html = buildInvoiceHTML(sale, biz, getDir(), rate, currencyMode);
    const fileName = buildFroshiarPdfFileName(sale.invoiceNumber, 'Invoice');
    await generateAndShare(
      html,
      `Invoice ${sale.invoiceNumber}`,
      'Could not generate invoice PDF. Please try again.',
      fileName
    );
    await recordInvoicePrint();
  } catch (err) {
    console.error('[PDF] shareInvoice unexpected error:', err);
    Alert.alert('Error', 'Could not generate invoice PDF. Please try again.');
  } finally {
    releaseGenerationLock();
  }
}

export async function sharePurchaseInvoice(
  purchase: Purchase,
  purchaseItems: PurchaseItemRow[],
  business: BusinessInfo,
  currencyMode: ReceiptCurrencyMode = 'iqd',
  purchaseDebt?: PurchaseDebt | null,
  paperSize: ReceiptPaperSize = 'A4'
): Promise<void> {
  const { checkInvoicePrintLimit, recordInvoicePrint } = await import('@/lib/usageLimits');
  const printCheck = await checkInvoicePrintLimit();
  if (!printCheck.allowed) {
    const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
    showUsageLimitModal();
    return;
  }

  if (!tryAcquireGenerationLock()) return;
  try {
    let resolvedDebt = purchaseDebt;
    if (!resolvedDebt && purchase.paymentStatus === 'debt') {
      try {
        const { getPurchaseDebtByPurchaseId } = await import('@/lib/sqlite');
        resolvedDebt = await getPurchaseDebtByPurchaseId(purchase.id);
      } catch (e) {
        console.warn('[PDF] Failed to load purchase debt for invoice:', e);
      }
    }
    const biz = await withResolvedLogo(business);
    let html: string;
    let fileName: string;
    if (paperSize === 'A4') {
      html = buildPurchaseInvoiceHTML(purchase, purchaseItems, biz, getDir(), currencyMode, resolvedDebt);
      fileName = buildFroshiarPdfFileName(purchase.purchaseNumber, 'Purchase');
    } else {
      const { buildThermalPurchaseReceiptHTML } = await import('./thermalReceiptTemplate');
      const thermalItems = purchaseItems.map((item, idx) => ({
        id: idx + 1,
        productName: item.productName,
        quantity: item.quantity,
        buyPrice: item.buyPriceIQD ?? 0,
        lineTotal: item.lineTotalIQD ?? ((item.buyPriceIQD ?? 0) * item.quantity),
        itemId: Array.isArray(item.itemIds) && item.itemIds.length > 0 ? item.itemIds.join(', ') : undefined,
      }));
      html = buildThermalPurchaseReceiptHTML(
        purchase,
        thermalItems,
        biz,
        paperSize as ThermalReceiptWidth,
        undefined,
        currencyMode
      );
      fileName = buildFroshiarPdfFileName(`${purchase.purchaseNumber}-${paperSize}`, 'PurchaseThermal');
    }
    await generateAndShare(
      html,
      `Purchase Invoice ${purchase.purchaseNumber} (${paperSize})`,
      'Could not generate purchase invoice PDF. Please try again.',
      fileName
    );
    await recordInvoicePrint();
  } catch (err) {
    console.error('[PDF] sharePurchaseInvoice unexpected error:', err);
    Alert.alert('Error', 'Could not generate purchase invoice PDF. Please try again.');
  } finally {
    releaseGenerationLock();
  }
}

export async function directPrintInvoice(
  sale: Sale,
  business: BusinessInfo,
  currencyMode: ReceiptCurrencyMode = 'iqd',
  paperSize: ReceiptPaperSize = 'A4'
): Promise<boolean> {
  const { checkInvoicePrintLimit, recordInvoicePrint } = await import('@/lib/usageLimits');
  const printCheck = await checkInvoicePrintLimit();
  if (!printCheck.allowed) {
    const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
    showUsageLimitModal();
    return false;
  }

  if (Platform.OS === 'web') {
    if (!tryAcquireGenerationLock()) return false;
    try {
      const biz = await withResolvedLogo(business);
      let html: string;
      if (paperSize === 'A4') {
        const rate = sale.exchangeRateUsed ?? useSettingsStore.getState().exchangeRate ?? PURCHASE_RATE;
        html = buildInvoiceHTML(sale, biz, getDir(), rate, currencyMode);
      } else {
        const { buildThermalReceiptHTML } = await import('./thermalReceiptTemplate');
        html = buildThermalReceiptHTML(sale, biz, paperSize as ThermalReceiptWidth, undefined, currencyMode);
      }
      const desktopAPI = typeof window !== 'undefined' ? (window as any).desktopAPI : null;
      if (desktopAPI && typeof desktopAPI.printReceipt === 'function') {
        const res = await desktopAPI.printReceipt({ html, pageSize: paperSize, silent: false });
        if (res?.success) {
          await recordInvoicePrint();
          return true;
        }
      }
      const success = printHtmlViaIframe(html);
      if (success) await recordInvoicePrint();
      return success;
    } catch (err) {
      console.error('[Print] directPrintInvoice web error:', err);
      return false;
    } finally {
      releaseGenerationLock();
    }
  }
  const Print = await getPrintModule();
  if (!Print || typeof Print.printAsync !== 'function') {
    if (paperSize === 'A4') {
      await shareInvoice(sale, business, currencyMode);
    } else {
      await shareThermalInvoice(sale, business, paperSize as ThermalReceiptWidth, currencyMode);
    }
    return true;
  }
  if (!tryAcquireGenerationLock()) return false;
  try {
    const biz = await withResolvedLogo(business);
    let html: string;
    if (paperSize === 'A4') {
      const rate = sale.exchangeRateUsed ?? useSettingsStore.getState().exchangeRate ?? PURCHASE_RATE;
      html = buildInvoiceHTML(sale, biz, getDir(), rate, currencyMode);
    } else {
      const { buildThermalReceiptHTML } = await import('./thermalReceiptTemplate');
      html = buildThermalReceiptHTML(sale, biz, paperSize as ThermalReceiptWidth, undefined, currencyMode);
    }
    await Print.printAsync({ html });
    await recordInvoicePrint();
    return true;
  } catch (err) {
    console.error('[Print] directPrintInvoice unexpected error:', err);
    return false;
  } finally {
    releaseGenerationLock();
  }
}

export async function directPrintThermalInvoice(
  sale: Sale,
  business: { name: string; phone?: string; address?: string; logoUri?: string | null },
  width: ThermalReceiptWidth = '80mm',
  currencyMode: ReceiptCurrencyMode = 'iqd'
): Promise<boolean> {
  const { checkInvoicePrintLimit, recordInvoicePrint } = await import('@/lib/usageLimits');
  const printCheck = await checkInvoicePrintLimit();
  if (!printCheck.allowed) {
    const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
    showUsageLimitModal();
    return false;
  }

  if (Platform.OS === 'web') {
    if (!tryAcquireGenerationLock()) return false;
    try {
      const html = buildThermalReceiptHTML(sale, business, width, undefined, currencyMode);
      const desktopAPI = typeof window !== 'undefined' ? (window as any).desktopAPI : null;
      if (desktopAPI && typeof desktopAPI.printReceipt === 'function') {
        const res = await desktopAPI.printReceipt({ html, pageSize: width, silent: false });
        if (res?.success) {
          await recordInvoicePrint();
          return true;
        }
      }
      const success = printHtmlViaIframe(html);
      if (success) await recordInvoicePrint();
      return success;
    } catch (err) {
      console.error('[Print] directPrintThermalInvoice web error:', err);
      return false;
    } finally {
      releaseGenerationLock();
    }
  }
  const Print = await getPrintModule();
  if (!Print || typeof Print.printAsync !== 'function') {
    await shareThermalInvoice(sale, business, width, currencyMode);
    return true;
  }
  if (!tryAcquireGenerationLock()) return false;
  try {
    const html = buildThermalReceiptHTML(sale, business, width, undefined, currencyMode);
    await Print.printAsync({ html });
    await recordInvoicePrint();
    return true;
  } catch (err) {
    console.error('[Print] directPrintThermalInvoice unexpected error:', err);
    return false;
  } finally {
    releaseGenerationLock();
  }
}

export async function shareThermalInvoice(
  sale: Sale,
  business: { name: string; phone?: string; address?: string; logoUri?: string | null },
  width: ThermalReceiptWidth = '80mm',
  currencyMode: ReceiptCurrencyMode = 'iqd'
): Promise<void> {
  const { checkInvoicePrintLimit, recordInvoicePrint } = await import('@/lib/usageLimits');
  const printCheck = await checkInvoicePrintLimit();
  if (!printCheck.allowed) {
    const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
    showUsageLimitModal();
    return;
  }

  if (!tryAcquireGenerationLock()) return;
  try {
    const html = buildThermalReceiptHTML(sale, business, width, undefined, currencyMode);
    const fileName = buildFroshiarPdfFileName(`${sale.invoiceNumber}-${width}`, 'ThermalReceipt');
    await generateAndShare(
      html,
      `Thermal Receipt ${sale.invoiceNumber} (${width})`,
      'Could not generate thermal receipt PDF. Please try again.',
      fileName
    );
    await recordInvoicePrint();
  } catch (err) {
    console.error('[PDF] shareThermalInvoice unexpected error:', err);
    Alert.alert('Error', 'Could not generate thermal receipt PDF. Please try again.');
  } finally {
    releaseGenerationLock();
  }
}

export async function directPrintPurchaseInvoice(
  purchase: Purchase,
  purchaseItems: PurchaseItemRow[],
  business: BusinessInfo,
  currencyMode: ReceiptCurrencyMode = 'iqd',
  purchaseDebt?: PurchaseDebt | null,
  paperSize: ReceiptPaperSize = 'A4'
): Promise<boolean> {
  const { checkInvoicePrintLimit, recordInvoicePrint } = await import('@/lib/usageLimits');
  const printCheck = await checkInvoicePrintLimit();
  if (!printCheck.allowed) {
    const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
    showUsageLimitModal();
    return false;
  }

  if (Platform.OS === 'web') {
    if (!tryAcquireGenerationLock()) return false;
    try {
      let resolvedDebt = purchaseDebt;
      if (!resolvedDebt && purchase.paymentStatus === 'debt') {
        try {
          const { getPurchaseDebtByPurchaseId } = await import('@/lib/sqlite');
          resolvedDebt = await getPurchaseDebtByPurchaseId(purchase.id);
        } catch (e) {
          console.warn('[Print] Failed to load purchase debt for invoice:', e);
        }
      }
      const biz = await withResolvedLogo(business);
      let html: string;
      if (paperSize === 'A4') {
        html = buildPurchaseInvoiceHTML(purchase, purchaseItems, biz, getDir(), currencyMode, resolvedDebt);
      } else {
        const { buildThermalPurchaseReceiptHTML } = await import('./thermalReceiptTemplate');
        const thermalItems = purchaseItems.map((item, idx) => ({
          id: idx + 1,
          productName: item.productName,
          quantity: item.quantity,
          buyPrice: item.buyPriceIQD ?? 0,
          lineTotal: item.lineTotalIQD ?? ((item.buyPriceIQD ?? 0) * item.quantity),
          itemId: Array.isArray(item.itemIds) && item.itemIds.length > 0 ? item.itemIds.join(', ') : undefined,
        }));
        html = buildThermalPurchaseReceiptHTML(purchase, thermalItems, biz, paperSize as ThermalReceiptWidth, undefined, currencyMode);
      }
      const desktopAPI = typeof window !== 'undefined' ? (window as any).desktopAPI : null;
      if (desktopAPI && typeof desktopAPI.printReceipt === 'function') {
        const res = await desktopAPI.printReceipt({ html, pageSize: paperSize, silent: false });
        if (res?.success) {
          await recordInvoicePrint();
          return true;
        }
      }
      const success = printHtmlViaIframe(html);
      if (success) await recordInvoicePrint();
      return success;
    } catch (err) {
      console.error('[Print] directPrintPurchaseInvoice web error:', err);
      return false;
    } finally {
      releaseGenerationLock();
    }
  }
  const Print = await getPrintModule();
  if (!Print || typeof Print.printAsync !== 'function') {
    await sharePurchaseInvoice(purchase, purchaseItems, business, currencyMode, purchaseDebt);
    return true;
  }
  if (!tryAcquireGenerationLock()) return false;
  try {
    let resolvedDebt = purchaseDebt;
    if (!resolvedDebt && purchase.paymentStatus === 'debt') {
      try {
        const { getPurchaseDebtByPurchaseId } = await import('@/lib/sqlite');
        resolvedDebt = await getPurchaseDebtByPurchaseId(purchase.id);
      } catch (e) {
        console.warn('[Print] Failed to load purchase debt for invoice:', e);
      }
    }
    const biz = await withResolvedLogo(business);
    let html: string;
    if (paperSize === 'A4') {
      html = buildPurchaseInvoiceHTML(purchase, purchaseItems, biz, getDir(), currencyMode, resolvedDebt);
    } else {
      const { buildThermalPurchaseReceiptHTML } = await import('./thermalReceiptTemplate');
      const thermalItems = purchaseItems.map((item, idx) => ({
        id: idx + 1,
        productName: item.productName,
        quantity: item.quantity,
        buyPrice: item.buyPriceIQD ?? 0,
        lineTotal: item.lineTotalIQD ?? ((item.buyPriceIQD ?? 0) * item.quantity),
        itemId: Array.isArray(item.itemIds) && item.itemIds.length > 0 ? item.itemIds.join(', ') : undefined,
      }));
      html = buildThermalPurchaseReceiptHTML(purchase, thermalItems, biz, paperSize as ThermalReceiptWidth, undefined, currencyMode);
    }
    await Print.printAsync({ html });
    await recordInvoicePrint();
    return true;
  } catch (err) {
    console.error('[Print] directPrintPurchaseInvoice unexpected error:', err);
    return false;
  } finally {
    releaseGenerationLock();
  }
}

export async function shareInventoryReport(
  products: InventoryProduct[],
  stats: InventoryStats,
  business: BusinessInfo
): Promise<void> {
  if (!tryAcquireGenerationLock()) return;
  try {
    const biz = await withResolvedLogo(business);
    const html = buildInventoryReportHTML(products, stats, biz, getDir());
    const fileName = buildFroshiarPdfFileName('Inventory-Report');
    await generateAndShare(
      html,
      'Inventory Report',
      'Could not generate the inventory report. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] shareInventoryReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the inventory report. Please try again.');
  } finally {
    releaseGenerationLock();
  }
}

export async function shareSalesDebtReport(
  debt: SalesDebtDetail,
  payments: DebtPayment[],
  business: BusinessInfo,
  items?: SaleItem[]
): Promise<void> {
  if (!tryAcquireGenerationLock()) return;
  try {
    const biz = await withResolvedLogo(business);
    const html = buildSalesDebtReportHTML(debt, payments, biz, getDir(), items);
    const lang = i18n.language || 'ku';
    const isAr = lang === 'ar';
    const isKu = lang === 'ku';
    const safeCust = (debt.customerName || 'Customer').replace(/[/\\?%*:|"<>#\s]/g, '_');
    const fileName = buildFroshiarPdfFileName(`CustomerDebt-${safeCust}`);
    await generateAndShare(
      html,
      isAr ? `تقرير ديون الزبون — ${debt.customerName}` : isKu ? `ڕاپۆرتی قەرزی کڕیار — ${debt.customerName}` : `Debt Report — ${debt.customerName}`,
      isAr ? 'تعذر إنشاء تقرير ديون الزبون بصيغة PDF. يرجى المحاولة مرة أخرى.' : isKu ? 'نەتوانرا ڕاپۆرتی قەرز بە PDF دروست بکرێت. تکایە دووبارە هەوڵبدەرەوە.' : 'Could not generate the debt report. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] shareSalesDebtReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the debt report. Please try again.');
  } finally {
    releaseGenerationLock();
  }
}

export async function sharePurchaseDebtReport(
  debt: PurchaseDebt,
  payments: DebtPayment[],
  business: BusinessInfo,
  purchase?: Purchase | null
): Promise<void> {
  if (!tryAcquireGenerationLock()) return;
  try {
    const biz = await withResolvedLogo(business);
    const html = buildPurchaseDebtReportHTML(debt, payments, biz, getDir(), purchase);
    const lang = i18n.language || 'ku';
    const isAr = lang === 'ar';
    const isKu = lang === 'ku';
    const safeSupp = (debt.supplierName || 'Supplier').replace(/[/\\?%*:|"<>#\s]/g, '_');
    const fileName = buildFroshiarPdfFileName(`SupplierDebt-${safeSupp}`);
    await generateAndShare(
      html,
      isAr ? `تقرير ديون المورد — ${debt.supplierName}` : isKu ? `ڕاپۆرتی قەرزی دابینکەر — ${debt.supplierName}` : `Supplier Debt Report — ${debt.supplierName}`,
      isAr ? 'تعذر إنشاء تقرير ديون المورد بصيغة PDF. يرجى المحاولة مرة أخرى.' : isKu ? 'نەتوانرا ڕاپۆرتی قەرز بە PDF دروست بکرێت. تکایە دووبارە هەوڵبدەرەوە.' : 'Could not generate the supplier debt report. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] sharePurchaseDebtReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the supplier debt report. Please try again.');
  } finally {
    releaseGenerationLock();
  }
}

export async function shareCustomerReport(
  customer: CustomerWithStats,
  sales: Sale[],
  debts: Debt[],
  business: BusinessInfo
): Promise<void> {
  if (!tryAcquireGenerationLock()) return;
  try {
    const biz = await withResolvedLogo(business);
    const html = buildCustomerReportHTML(customer, sales, debts, biz, getDir());
    const safeCust = (customer.name || 'Customer').replace(/[/\\?%*:|"<>#\s]/g, '_');
    const fileName = buildFroshiarPdfFileName(`Customer-${safeCust}`);
    await generateAndShare(
      html,
      `Customer Report — ${customer.name}`,
      'Could not generate the customer report. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] shareCustomerReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the customer report. Please try again.');
  } finally {
    releaseGenerationLock();
  }
}

export async function shareSupplierReport(
  supplier: SupplierWithStats,
  purchases: Purchase[],
  debts: PurchaseDebt[],
  business: BusinessInfo
): Promise<void> {
  if (!tryAcquireGenerationLock()) return;
  try {
    const biz = await withResolvedLogo(business);
    const html = buildSupplierReportHTML(supplier, purchases, debts, biz, getDir());
    const safeSupp = (supplier.name || 'Supplier').replace(/[/\\?%*:|"<>#\s]/g, '_');
    const fileName = buildFroshiarPdfFileName(`Supplier-${safeSupp}`);
    await generateAndShare(
      html,
      `Supplier Report — ${supplier.name}`,
      'Could not generate the supplier report. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] shareSupplierReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the supplier report. Please try again.');
  } finally {
    releaseGenerationLock();
  }
}

export async function shareFullInventoryReport(
  products: InventoryProduct[],
  business: BusinessInfo,
  globalLowStockEnabled: boolean,
  globalLowStockThreshold: number,
  periodLabel: string,
): Promise<void> {
  if (!tryAcquireGenerationLock()) return;
  try {
    const biz = await withResolvedLogo(business);
    const lowStockIds = new Set<number>(
      products
        .filter((p) => computeProductLowStock(p, globalLowStockEnabled, globalLowStockThreshold))
        .map((p) => p.id),
    );
    const html = buildFullInventoryReportHTML(products, biz, lowStockIds, periodLabel, getDir());
    const fileName = buildFroshiarPdfFileName('Full-Inventory-Report');
    await generateAndShare(
      html,
      'Full Inventory Report',
      'Could not generate the inventory report. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] shareFullInventoryReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the inventory report. Please try again.');
  } finally {
    releaseGenerationLock();
  }
}

export async function shareLowStockInventoryReport(
  lowStockProducts: InventoryProduct[],
  business: BusinessInfo,
  periodLabel: string,
): Promise<void> {
  if (!tryAcquireGenerationLock()) return;
  try {
    const biz = await withResolvedLogo(business);
    const html = buildLowStockReportHTML(lowStockProducts, biz, periodLabel, getDir());
    const fileName = buildFroshiarPdfFileName('Low-Stock-Report');
    await generateAndShare(
      html,
      'Low Stock Report',
      'Could not generate the low stock report. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] shareLowStockInventoryReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the low stock report. Please try again.');
  } finally {
    releaseGenerationLock();
  }
}

export async function shareOutOfStockInventoryReport(
  outOfStockProducts: InventoryProduct[],
  business: BusinessInfo,
  periodLabel: string,
): Promise<void> {
  if (!tryAcquireGenerationLock()) return;
  try {
    const biz = await withResolvedLogo(business);
    const html = buildOutOfStockReportHTML(outOfStockProducts, biz, periodLabel, getDir());
    const fileName = buildFroshiarPdfFileName('Out-Of-Stock-Report');
    await generateAndShare(
      html,
      'Out of Stock Report',
      'Could not generate the out of stock report. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] shareOutOfStockInventoryReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the out of stock report. Please try again.');
  } finally {
    releaseGenerationLock();
  }
}

export async function shareCategoryInventoryReport(
  products: InventoryProduct[],
  categoryName: string,
  business: BusinessInfo,
  periodLabel: string,
): Promise<void> {
  if (!tryAcquireGenerationLock()) return;
  try {
    const biz = await withResolvedLogo(business);
    const html = buildCategoryReportHTML(products, categoryName, biz, periodLabel, getDir());
    const safeCat = (categoryName || 'Category').replace(/[/\\?%*:|"<>#\s]/g, '_');
    const fileName = buildFroshiarPdfFileName(`Category-${safeCat}`);
    await generateAndShare(
      html,
      `Category Report — ${categoryName}`,
      'Could not generate the category report. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] shareCategoryInventoryReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the category report. Please try again.');
  } finally {
    releaseGenerationLock();
  }
}

export async function shareFullReport(
  data: FullReportData,
  business: BusinessInfo
): Promise<void> {
  if (!tryAcquireGenerationLock()) return;
  try {
    const biz = await withResolvedLogo(business);
    const { buildFullReportHTML } = await import('./reportTemplate');
    const html = buildFullReportHTML(data, biz, getDir());
    const fileName = buildFroshiarPdfFileName('Business-Report');
    await generateAndShare(
      html,
      'Business Report',
      'Could not generate the report PDF. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] shareFullReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the report PDF. Please try again.');
  } finally {
    releaseGenerationLock();
  }
}

export async function shareFinancialReport(
  data: FinancialExportData,
  business: BusinessInfo
): Promise<void> {
  if (!tryAcquireGenerationLock()) return;
  try {
    const biz = await withResolvedLogo(business);
    const { buildFinancialReportHTML } = await import('./financialReportTemplate');
    const html = buildFinancialReportHTML(data, biz, getDir());
    const fileName = buildFroshiarPdfFileName('Financial-Report');
    await generateAndShare(
      html,
      'Financial Report',
      'Could not generate the financial report. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] shareFinancialReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the financial report. Please try again.');
  } finally {
    releaseGenerationLock();
  }
}

export async function shareSalesAuditReport(
  sales: Sale[],
  periodLabel: string,
  business: BusinessInfo
): Promise<boolean> {
  if (!tryAcquireGenerationLock()) return false;
  try {
    const biz = await withResolvedLogo(business);
    const { buildSalesAuditReportHTML } = await import('./salesAuditReportTemplate');
    const html = buildSalesAuditReportHTML(sales, periodLabel, biz, getDir());
    const lang = i18n.language || 'ku';
    const isAr = lang === 'ar';
    const isKu = lang === 'ku';
    const safePeriod = (periodLabel || 'All').replace(/[/\\?%*:|"<>#\s]/g, '_');
    const fileName = buildFroshiarPdfFileName(`Sales-Audit-${safePeriod}`);
    return await generateAndShare(
      html,
      isAr ? `تقرير جرد المبيعات — ${periodLabel}` : isKu ? `جەردی فرۆشتن — ${periodLabel}` : `Sales Audit Report — ${periodLabel}`,
      isAr ? 'تعذر إنشاء تقرير جرد المبيعات بصيغة PDF. يرجى المحاولة مرة أخرى.' : isKu ? 'نەتوانرا جەردی فرۆشتن بە PDF دروست بکرێت. تکایە دووبارە هەوڵبدەرەوە.' : 'Could not generate the sales audit report PDF. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] shareSalesAuditReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the sales audit report. Please try again.');
    return false;
  } finally {
    releaseGenerationLock();
  }
}

export async function sharePurchasesAuditReport(
  purchases: Purchase[],
  periodLabel: string,
  business: BusinessInfo
): Promise<boolean> {
  if (!tryAcquireGenerationLock()) return false;
  try {
    const biz = await withResolvedLogo(business);
    const { buildPurchasesAuditReportHTML } = await import('./purchasesAuditReportTemplate');
    const html = buildPurchasesAuditReportHTML(purchases, periodLabel, biz, getDir());
    const lang = i18n.language || 'ku';
    const isAr = lang === 'ar';
    const isKu = lang === 'ku';
    const safePeriod = (periodLabel || 'All').replace(/[/\\?%*:|"<>#\s]/g, '_');
    const fileName = buildFroshiarPdfFileName(`Purchases-Audit-${safePeriod}`);
    return await generateAndShare(
      html,
      isAr ? `تقرير جرد المشتريات — ${periodLabel}` : isKu ? `جەردی کڕینەکان — ${periodLabel}` : `Purchases Audit Report — ${periodLabel}`,
      isAr ? 'تعذر إنشاء تقرير جرد المشتريات بصيغة PDF. يرجى المحاولة مرة أخرى.' : isKu ? 'نەتوانرا جەردی کڕینەکان بە PDF دروست بکرێت. تکایە دووبارە هەوڵبدەرەوە.' : 'Could not generate the purchases audit report PDF. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] sharePurchasesAuditReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the purchases audit report. Please try again.');
    return false;
  } finally {
    releaseGenerationLock();
  }
}

export async function shareInventoryHistoryAuditReport(
  items: InventoryHistoryItem[],
  periodLabel: string,
  business: BusinessInfo
): Promise<boolean> {
  if (!tryAcquireGenerationLock()) return false;
  try {
    const biz = await withResolvedLogo(business);
    const { buildInventoryHistoryReportHTML } = await import('./inventoryHistoryReportTemplate');
    const html = buildInventoryHistoryReportHTML(items, periodLabel, biz, getDir());
    const lang = i18n.language || 'ku';
    const isAr = lang === 'ar';
    const isKu = lang === 'ku';
    const safePeriod = (periodLabel || 'All').replace(/[/\\?%*:|"<>#\s]/g, '_');
    const fileName = buildFroshiarPdfFileName(`Inventory-Audit-${safePeriod}`);
    return await generateAndShare(
      html,
      isAr ? `تقرير جرد المنتجات المحذوفة — ${periodLabel}` : isKu ? `جەردی بەرهەمە سڕاوەکان — ${periodLabel}` : `Deleted Products Audit Report — ${periodLabel}`,
      isAr ? 'تعذر إنشاء تقرير جرد المنتجات المحذوفة بصيغة PDF. يرجى المحاولة مرة أخرى.' : isKu ? 'نەتوانرا جەردی بەرهەمە سڕاوەکان بە PDF دروست بکرێت. تکایە دووبارە هەوڵبدەرەوە.' : 'Could not generate the deleted products audit report PDF. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] shareInventoryHistoryAuditReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the deleted products audit report. Please try again.');
    return false;
  } finally {
    releaseGenerationLock();
  }
}

export async function shareDashboardReport(
  stats: any,
  activities: any[],
  periodLabel: string,
  business: BusinessInfo
): Promise<boolean> {
  if (!tryAcquireGenerationLock()) return false;
  try {
    const biz = await withResolvedLogo(business);
    const { buildDashboardReportHTML } = await import('./dashboardReportTemplate');
    const html = buildDashboardReportHTML(stats, activities, periodLabel, biz, getDir());
    const lang = i18n.language || 'ku';
    const isAr = lang === 'ar';
    const isKu = lang === 'ku';
    const safePeriod = (periodLabel || 'All').replace(/[/\\?%*:|"<>#\s]/g, '_');
    const fileName = buildFroshiarPdfFileName(`Dashboard-Report-${safePeriod}`);
    return await generateAndShare(
      html,
      isAr ? `تقرير لوحة التحكم — ${periodLabel}` : isKu ? `ڕاپۆرتی داشبۆرد — ${periodLabel}` : `Dashboard Report — ${periodLabel}`,
      isAr ? 'تعذر إنشاء تقرير لوحة التحكم بصيغة PDF. يرجى المحاولة مرة أخرى.' : isKu ? 'نەتوانرا ڕاپۆرتی داشبۆرد بە PDF دروست بکرێت. تکایە دووبارە هەوڵبدەرەوە.' : 'Could not generate the dashboard report PDF. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] shareDashboardReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the dashboard report. Please try again.');
    return false;
  } finally {
    releaseGenerationLock();
  }
}

export async function shareDebtsAuditReport(
  type: 'report' | 'sales' | 'purchase' | DebtReportSections,
  data: {
    summary?: DebtOverviewSummary | null;
    salesDebts?: SalesDebtDetail[];
    purchaseDebts?: PurchaseDebt[];
  },
  periodLabel: string,
  business: BusinessInfo
): Promise<boolean> {
  if (!tryAcquireGenerationLock()) return false;
  try {
    const biz = await withResolvedLogo(business);
    const { buildDebtsAuditReportHTML } = await import('./debtReportTemplate');
    const html = buildDebtsAuditReportHTML(type, data, periodLabel, biz, getDir());
    const lang = i18n.language || 'ku';
    const isAr = lang === 'ar';
    const isKu = lang === 'ku';
    let title = isAr ? `تقرير الديون — ${periodLabel}` : isKu ? `ڕاپۆرتی قەرزەکان — ${periodLabel}` : `Debt Report — ${periodLabel}`;

    if (typeof type === 'string') {
      title = type === 'report'
        ? (isAr ? `التقرير العام للديون — ${periodLabel}` : isKu ? `ڕاپۆرتی گشتی قەرزەکان — ${periodLabel}` : `General Debt Report — ${periodLabel}`)
        : type === 'sales'
        ? (isAr ? `تقرير ديون الزبائن — ${periodLabel}` : isKu ? `جەردی قەرزی کڕیاران — ${periodLabel}` : `Customer Debts Report — ${periodLabel}`)
        : (isAr ? `تقرير ديون الموردين — ${periodLabel}` : isKu ? `جەردی قەرزی دابینکەران — ${periodLabel}` : `Supplier Debts Report — ${periodLabel}`);
    } else {
      if (!type.includeSales && !type.includePurchases) {
        title = isAr ? `تقرير ملخص وإحصائيات الديون — ${periodLabel}` : isKu ? `ڕاپۆرتی ئاماری و پوختەی قەرزەکان — ${periodLabel}` : `Debt Summary Report — ${periodLabel}`;
      } else if (!type.includeOverview && !type.includeStats && type.includeSales && !type.includePurchases) {
        title = isAr ? `تقرير ديون الزبائن — ${periodLabel}` : isKu ? `جەردی قەرزی کڕیاران — ${periodLabel}` : `Customer Debts Report — ${periodLabel}`;
      } else if (!type.includeOverview && !type.includeStats && !type.includeSales && type.includePurchases) {
        title = isAr ? `تقرير ديون الموردين — ${periodLabel}` : isKu ? `جەردی قەرزی دابینکەران — ${periodLabel}` : `Supplier Debts Report — ${periodLabel}`;
      } else if (!type.includeOverview && !type.includeStats && type.includeSales && type.includePurchases) {
        title = isAr ? `تقرير ديون الزبائن والموردين — ${periodLabel}` : isKu ? `جەردی قەرزی کڕیاران و دابینکەران — ${periodLabel}` : `Customer & Supplier Debts Report — ${periodLabel}`;
      } else {
        title = isAr ? `تقرير الجرد العام للديون — ${periodLabel}` : isKu ? `ڕاپۆرتی گشتی و جەردی قەرزەکان — ${periodLabel}` : `Debt Audit Report — ${periodLabel}`;
      }
    }

    const safePeriod = (periodLabel || 'All').replace(/[/\\?%*:|"<>#\s]/g, '_');
    const fileName = buildFroshiarPdfFileName(`Debts-Audit-${safePeriod}`);
    return await generateAndShare(
      html,
      title,
      isAr ? 'تعذر إنشاء تقرير الديون بصيغة PDF. يرجى المحاولة مرة أخرى.' : isKu ? 'نەتوانرا ڕاپۆرتی قەرزەکان بە PDF دروست بکرێت. تکایە دووبارە هەوڵبدەرەوە.' : 'Could not generate the debt report PDF. Please try again.',
      fileName
    );
  } catch (err) {
    console.error('[PDF] shareDebtsAuditReport unexpected error:', err);
    Alert.alert('Error', 'Could not generate the debt report. Please try again.');
    return false;
  } finally {
    releaseGenerationLock();
  }
}

export async function shareQuotationInvoice(
  quotation: Quotation,
  business: BusinessInfo,
  currencyMode: ReceiptCurrencyMode = 'both',
  paperSize: ReceiptPaperSize = 'A4'
): Promise<boolean> {
  const { checkInvoicePrintLimit, recordInvoicePrint } = await import('@/lib/usageLimits');
  const printCheck = await checkInvoicePrintLimit();
  if (!printCheck.allowed) {
    const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
    showUsageLimitModal();
    return false;
  }

  if (!tryAcquireGenerationLock()) return false;
  try {
    const biz = await withResolvedLogo(business);
    let html: string;
    let fileName: string;
    if (paperSize === 'A4') {
      const { buildQuotationHTML } = await import('./quotationTemplate');
      html = buildQuotationHTML(quotation, biz, getDir(), currencyMode);
      fileName = buildFroshiarPdfFileName(quotation.quotationNumber, 'Quotation');
    } else {
      const { buildThermalQuotationReceiptHTML } = await import('./thermalReceiptTemplate');
      html = buildThermalQuotationReceiptHTML(
        quotation,
        biz,
        paperSize as ThermalReceiptWidth,
        undefined,
        currencyMode
      );
      fileName = buildFroshiarPdfFileName(`${quotation.quotationNumber}-${paperSize}`, 'QuotationThermal');
    }
    const lang = i18n.language || 'ku';
    const isAr = lang === 'ar';
    const isKu = lang === 'ku';
    const success = await generateAndShare(
      html,
      isAr ? `عرض أسعار — ${quotation.quotationNumber} (${paperSize})` : isKu ? `عەرزی نرخ — ${quotation.quotationNumber} (${paperSize})` : `Price Quotation — ${quotation.quotationNumber} (${paperSize})`,
      isAr ? 'تعذر إنشاء عرض الأسعار بصيغة PDF. يرجى المحاولة مرة أخرى.' : isKu ? 'نەتوانرا وەسڵی عەرزی نرخ دروست بکرێت. تکایە دووبارە هەوڵ بدەرەوە.' : 'Could not generate quotation PDF. Please try again.',
      fileName
    );
    if (success) {
      await recordInvoicePrint();
    }
    return success;
  } catch (err) {
    console.error('[PDF] shareQuotationInvoice unexpected error:', err);
    Alert.alert('Error', 'Could not generate quotation PDF. Please try again.');
    return false;
  } finally {
    releaseGenerationLock();
  }
}

export async function directPrintQuotationInvoice(
  quotation: Quotation,
  business: BusinessInfo,
  currencyMode: ReceiptCurrencyMode = 'both',
  paperSize: ReceiptPaperSize = 'A4'
): Promise<boolean> {
  const { checkInvoicePrintLimit, recordInvoicePrint } = await import('@/lib/usageLimits');
  const printCheck = await checkInvoicePrintLimit();
  if (!printCheck.allowed) {
    const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
    showUsageLimitModal();
    return false;
  }

  if (Platform.OS === 'web') {
    if (!tryAcquireGenerationLock()) return false;
    try {
      const biz = await withResolvedLogo(business);
      let html: string;
      if (paperSize === 'A4') {
        const { buildQuotationHTML } = await import('./quotationTemplate');
        html = buildQuotationHTML(quotation, biz, getDir(), currencyMode);
      } else {
        const { buildThermalQuotationReceiptHTML } = await import('./thermalReceiptTemplate');
        html = buildThermalQuotationReceiptHTML(quotation, biz, paperSize as ThermalReceiptWidth, undefined, currencyMode);
      }
      const desktopAPI = typeof window !== 'undefined' ? (window as any).desktopAPI : null;
      if (desktopAPI && typeof desktopAPI.printReceipt === 'function') {
        const res = await desktopAPI.printReceipt({ html, pageSize: paperSize, silent: false });
        if (res?.success) {
          await recordInvoicePrint();
          return true;
        }
      }
      const success = printHtmlViaIframe(html);
      if (success) await recordInvoicePrint();
      return success;
    } catch (err) {
      console.error('[Print] directPrintQuotationInvoice web error:', err);
      return false;
    } finally {
      releaseGenerationLock();
    }
  }
  const Print = await getPrintModule();
  if (!Print || typeof Print.printAsync !== 'function') {
    return await shareQuotationInvoice(quotation, business, currencyMode, paperSize);
  }
  if (!tryAcquireGenerationLock()) return false;
  try {
    const biz = await withResolvedLogo(business);
    let html: string;
    if (paperSize === 'A4') {
      const { buildQuotationHTML } = await import('./quotationTemplate');
      html = buildQuotationHTML(quotation, biz, getDir(), currencyMode);
    } else {
      const { buildThermalQuotationReceiptHTML } = await import('./thermalReceiptTemplate');
      html = buildThermalQuotationReceiptHTML(quotation, biz, paperSize as ThermalReceiptWidth, undefined, currencyMode);
    }
    await Print.printAsync({ html });
    await recordInvoicePrint();
    return true;
  } catch (err) {
    console.error('[Print] directPrintQuotationInvoice unexpected error:', err);
    return false;
  } finally {
    releaseGenerationLock();
  }
}

export async function directPrintDebtPaymentReceipt(
  receipt: DebtPaymentReceiptData,
  business: BusinessInfo,
  paperSize: DebtReceiptPaperSize = '80mm',
  exchangeRate?: number
): Promise<boolean> {
  const { checkInvoicePrintLimit, recordInvoicePrint } = await import('@/lib/usageLimits');
  const printCheck = await checkInvoicePrintLimit();
  if (!printCheck.allowed) {
    const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
    showUsageLimitModal();
    return false;
  }

  if (Platform.OS === 'web') {
    if (!tryAcquireGenerationLock()) return false;
    try {
      const biz = await withResolvedLogo(business);
      const rate = exchangeRate ?? useSettingsStore.getState().exchangeRate ?? PURCHASE_RATE;
      const { buildDebtPaymentHTML } = await import('./debtPaymentReceiptTemplate');
      const html = buildDebtPaymentHTML(receipt, biz, paperSize, rate);
      const desktopAPI = typeof window !== 'undefined' ? (window as any).desktopAPI : null;
      if (desktopAPI && typeof desktopAPI.printReceipt === 'function') {
        const res = await desktopAPI.printReceipt({ html, pageSize: paperSize, silent: false });
        if (res?.success) {
          await recordInvoicePrint();
          return true;
        }
      }
      const success = printHtmlViaIframe(html);
      if (success) await recordInvoicePrint();
      return success;
    } catch (err) {
      console.error('[Print] directPrintDebtPaymentReceipt web error:', err);
      return false;
    } finally {
      releaseGenerationLock();
    }
  }
  const Print = await getPrintModule();
  if (!Print || typeof Print.printAsync !== 'function') {
    return await shareDebtPaymentReceipt(receipt, business, paperSize, exchangeRate);
  }

  if (!tryAcquireGenerationLock()) return false;
  try {
    const biz = await withResolvedLogo(business);
    const rate = exchangeRate ?? useSettingsStore.getState().exchangeRate ?? PURCHASE_RATE;
    const { buildDebtPaymentHTML } = await import('./debtPaymentReceiptTemplate');
    const html = buildDebtPaymentHTML(receipt, biz, paperSize, rate);
    await Print.printAsync({ html });
    await recordInvoicePrint();
    return true;
  } catch (err) {
    console.error('[Print] directPrintDebtPaymentReceipt unexpected error:', err);
    return false;
  } finally {
    releaseGenerationLock();
  }
}

export async function shareDebtPaymentReceipt(
  receipt: DebtPaymentReceiptData,
  business: BusinessInfo,
  paperSize: DebtReceiptPaperSize = '80mm',
  exchangeRate?: number
): Promise<boolean> {
  const { checkInvoicePrintLimit, recordInvoicePrint } = await import('@/lib/usageLimits');
  const printCheck = await checkInvoicePrintLimit();
  if (!printCheck.allowed) {
    const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
    showUsageLimitModal();
    return false;
  }

  if (!tryAcquireGenerationLock()) return false;
  try {
    const biz = await withResolvedLogo(business);
    const rate = exchangeRate ?? useSettingsStore.getState().exchangeRate ?? PURCHASE_RATE;
    const { buildDebtPaymentHTML } = await import('./debtPaymentReceiptTemplate');
    const html = buildDebtPaymentHTML(receipt, biz, paperSize, rate);
    const fileName = buildFroshiarPdfFileName(receipt.paymentNumber, 'DebtPayment');
    const docTitle = receipt.debtType === 'sales' ? 'وەسڵی وەرگرتنی پارەی قەرز' : 'وەسڵی دانەوەی قەرزی دابینکەر';
    const success = await generateAndShare(
      html,
      `${docTitle} — ${receipt.paymentNumber}`,
      'نەتوانرا وەسڵی پارەدان دروست بکرێت. تکایە دووبارە هەوڵبدەرەوە.',
      fileName
    );
    if (success) {
      await recordInvoicePrint();
    }
    return success;
  } catch (err) {
    console.error('[PDF] shareDebtPaymentReceipt unexpected error:', err);
    Alert.alert('Error', 'Could not generate debt payment receipt PDF. Please try again.');
    return false;
  } finally {
    releaseGenerationLock();
  }
}



