import { Platform } from 'react-native';

export type ReceiptPageSize = '80mm' | '58mm' | 'A4' | 'A5';

export interface DesktopPrintOptions {
  html: string;
  pageSize?: ReceiptPageSize;
  silent?: boolean;
  printerName?: string;
}

export interface DesktopPrinter {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

declare global {
  interface Window {
    desktopAPI?: {
      isDesktop: boolean;
      platform: string;
      toggleFullscreen: () => Promise<boolean>;
      isFullscreen: () => Promise<boolean>;
      exitFullscreen: () => Promise<boolean>;
      minimize: () => Promise<boolean>;
      close: () => Promise<boolean>;
      printReceipt: (options: DesktopPrintOptions) => Promise<{ success: boolean; failureReason?: string }>;
      getPrinters: () => Promise<DesktopPrinter[]>;
      getAppDataPath: () => Promise<string>;
      openExternal: (url: string) => Promise<boolean>;
      pickLocalBackupFolder: () => Promise<string | null>;
      saveLocalBackupFile: (data: any, filename?: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
    };
  }
}

/**
 * Returns true if running inside the Froshiar Electron Desktop shell on PC.
 */
export function isDesktop(): boolean {
  if (Platform.OS !== 'web') return false;
  return typeof window !== 'undefined' && Boolean(window.desktopAPI?.isDesktop);
}

/**
 * Silent / Direct receipt printing for desktop thermal printers (80mm, 58mm, A4, A5).
 */
export async function printDesktopReceipt(options: DesktopPrintOptions): Promise<{ success: boolean; failureReason?: string }> {
  if (!isDesktop() || !window.desktopAPI) {
    return { success: false, failureReason: 'NOT_DESKTOP_ENVIRONMENT' };
  }
  return window.desktopAPI.printReceipt(options);
}

/**
 * Gets list of connected local and network printers on Windows.
 */
export async function getDesktopPrinters(): Promise<DesktopPrinter[]> {
  if (!isDesktop() || !window.desktopAPI) return [];
  return window.desktopAPI.getPrinters();
}

/**
 * Toggles fullscreen Kiosk / POS mode.
 */
export async function toggleFullscreen(): Promise<boolean> {
  if (!isDesktop() || !window.desktopAPI) return false;
  return window.desktopAPI.toggleFullscreen();
}

/**
 * Opens a native folder picker on PC to select Google Drive or local backup folder.
 */
export async function pickBackupFolder(): Promise<string | null> {
  if (!isDesktop() || !window.desktopAPI) return null;
  return window.desktopAPI.pickLocalBackupFolder();
}

/**
 * Saves a local database backup JSON file directly to PC disk / Google Drive directory.
 */
export async function saveDesktopBackupFile(data: any, filename?: string) {
  if (!isDesktop() || !window.desktopAPI) return { success: false };
  return window.desktopAPI.saveLocalBackupFile(data, filename);
}
