import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { migratedAsyncStorage } from '@/lib/migratedStorage';

export const DEFAULT_EXCHANGE_RATE = 1310;

export type BaseCurrency = 'IQD' | 'USD';

interface SettingsState {
  isDarkMode:    boolean;
  exchangeRate:  number;
  rateUpdatedAt: string | null;
  accentColor:             string | null;
  globalLowStockEnabled:   boolean;
  globalLowStockThreshold: number;
  baseCurrency:            BaseCurrency;
  settingsGridLayout:          boolean;
  salesProductGridLayout:      boolean;
  quotationProductGridLayout:  boolean;
  inventoryGridLayout:         boolean;
  salesHistoryGridLayout:      boolean;
  purchaseHistoryGridLayout:   boolean;
  invoicesGridLayout:          boolean;
  reportsGridLayout:           boolean;
  expiryGridLayout:            boolean;
  checkPriceGridLayout:        boolean;
  stockAlertsGridLayout:       boolean;
  historyGridLayout:           boolean;
  dashboardActivityGridLayout: boolean;
  expiryTrackingEnabled:       boolean;
  expiryAlertDays:             number;
  expiryTermsAccepted:         boolean;
  showSalesInvoicePreview:     boolean;
  checkoutGridExpandedPurchase: boolean;
  checkoutGridExpandedSale:     boolean;
  purchasePaymentStatusPreference: 'paid' | 'fib' | 'debt';
  purchaseReceiptCurrencyPreference: 'iqd' | 'usd' | 'both';
  purchaseCheckoutModePreference: 'normal' | 'print' | 'empty1' | 'empty2';
  saleCheckoutModePreference: 'normal' | 'print' | 'empty1' | 'empty2';
  purchaseDebtDownPaymentMethodPreference: 'cash' | 'fib';
  invoiceAboutPolicy: string;
  appScaleLevel: number; // 1 to 10 (default: 5 = 100%)

  setDarkMode:                (val: boolean) => void;
  setExchangeRate:            (rate: number) => Promise<void>;
  setAccentColor:             (color: string | null) => void;
  setGlobalLowStockEnabled:   (val: boolean) => void;
  setGlobalLowStockThreshold: (val: number) => void;
  setBaseCurrency:            (currency: BaseCurrency) => void;
  setSettingsGridLayout:          (val: boolean) => void;
  setSalesProductGridLayout:      (val: boolean) => void;
  setQuotationProductGridLayout:  (val: boolean) => void;
  setInventoryGridLayout:         (val: boolean) => void;
  setSalesHistoryGridLayout:      (val: boolean) => void;
  setPurchaseHistoryGridLayout:   (val: boolean) => void;
  setInvoicesGridLayout:          (val: boolean) => void;
  setReportsGridLayout:           (val: boolean) => void;
  setExpiryGridLayout:            (val: boolean) => void;
  setCheckPriceGridLayout:        (val: boolean) => void;
  setStockAlertsGridLayout:       (val: boolean) => void;
  setHistoryGridLayout:           (val: boolean) => void;
  setDashboardActivityGridLayout: (val: boolean) => void;
  setExpiryTrackingEnabled:    (val: boolean) => void;
  setExpiryAlertDays:          (val: number) => void;
  setExpiryTermsAccepted:      (val: boolean) => void;
  setShowSalesInvoicePreview:  (val: boolean) => void;
  setCheckoutGridExpandedPurchase: (val: boolean) => void;
  setCheckoutGridExpandedSale:     (val: boolean) => void;
  setPurchasePaymentStatusPreference: (val: 'paid' | 'fib' | 'debt') => void;
  setPurchaseReceiptCurrencyPreference: (val: 'iqd' | 'usd' | 'both') => void;
  setPurchaseCheckoutModePreference: (val: 'normal' | 'print' | 'empty1' | 'empty2') => void;
  setSaleCheckoutModePreference: (val: 'normal' | 'print' | 'empty1' | 'empty2') => void;
  setPurchaseDebtDownPaymentMethodPreference: (val: 'cash' | 'fib') => void;
  setInvoiceAboutPolicy: (val: string) => void;
  setAppScaleLevel: (val: number) => void;
}

// These preference stores are plain AsyncStorage, never touching a SQLite row
// or the cloud_sync_queue trigger mechanism — so a change here needs its own
// explicit nudge to reach the cloud, piggybacked onto the same users/{uid} root
// doc as the business profile/counters (see lib/cloudSync/pushEngine.ts's
// pushBusinessProfile). Never throws — a device with no signed-in user, or
// mid-startup before authStore has hydrated, just leaves the change local-only
// until the next real sync trigger picks it up naturally.
async function notifyPreferencesChanged(): Promise<void> {
  try {
    const { enqueueBusinessProfilePush } = await import('@/lib/sqlite');
    await enqueueBusinessProfilePush();
    const { useAuthStore } = await import('@/store/authStore');
    const uid = useAuthStore.getState().user?.id;
    if (uid) {
      const { scheduleCloudPush } = await import('@/lib/cloudSync');
      scheduleCloudPush(uid);
    }
  } catch { /* non-critical — the next interval-driven push cycle still picks this up */ }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isDarkMode:    false,
      exchangeRate:  DEFAULT_EXCHANGE_RATE,
      rateUpdatedAt: null,
      accentColor:             null,
      globalLowStockEnabled:   true,
      globalLowStockThreshold: 5,
      baseCurrency:            'IQD',
      settingsGridLayout:          false,
      salesProductGridLayout:      false,
      quotationProductGridLayout:  false,
      inventoryGridLayout:         true,
      salesHistoryGridLayout:      true,
      purchaseHistoryGridLayout:   true,
      invoicesGridLayout:          false,
      reportsGridLayout:           true,
      expiryGridLayout:            false,
      checkPriceGridLayout:        true,
      stockAlertsGridLayout:       false,
      historyGridLayout:           false,
      dashboardActivityGridLayout: false,
      expiryTrackingEnabled:       false,
      expiryAlertDays:             30,
      expiryTermsAccepted:         false,
      showSalesInvoicePreview:     false,
      checkoutGridExpandedPurchase: false,
      checkoutGridExpandedSale:     false,
      purchasePaymentStatusPreference: 'paid',
      purchaseReceiptCurrencyPreference: 'iqd',
      purchaseCheckoutModePreference: 'normal',
      saleCheckoutModePreference: 'normal',
      purchaseDebtDownPaymentMethodPreference: 'cash',
      invoiceAboutPolicy: '',
      setInvoiceAboutPolicy: (val) => { set({ invoiceAboutPolicy: val }); notifyPreferencesChanged(); },
      appScaleLevel: 5,
      setAppScaleLevel: (val) => {
        const safe = Math.max(1, Math.min(10, Math.round(val || 5)));
        set({ appScaleLevel: safe });
        notifyPreferencesChanged();
      },

      setDarkMode:                (val) => { set({ isDarkMode: val }); notifyPreferencesChanged(); },
      setAccentColor:             (color) => { set({ accentColor: color }); notifyPreferencesChanged(); },
      setGlobalLowStockEnabled:   (val) => { set({ globalLowStockEnabled: val }); notifyPreferencesChanged(); },
      setGlobalLowStockThreshold: (val) => { set({ globalLowStockThreshold: val }); notifyPreferencesChanged(); },
      setBaseCurrency:            (currency) => { set({ baseCurrency: currency }); notifyPreferencesChanged(); },
      setSettingsGridLayout:          (val) => { set({ settingsGridLayout: val }); notifyPreferencesChanged(); },
      setSalesProductGridLayout:      (val) => { set({ salesProductGridLayout: val }); notifyPreferencesChanged(); },
      setQuotationProductGridLayout:  (val) => { set({ quotationProductGridLayout: val }); notifyPreferencesChanged(); },
      setInventoryGridLayout:         (val) => { set({ inventoryGridLayout: val }); notifyPreferencesChanged(); },
      setSalesHistoryGridLayout:      (val) => { set({ salesHistoryGridLayout: val }); notifyPreferencesChanged(); },
      setPurchaseHistoryGridLayout:   (val) => { set({ purchaseHistoryGridLayout: val }); notifyPreferencesChanged(); },
      setInvoicesGridLayout:          (val) => { set({ invoicesGridLayout: val }); notifyPreferencesChanged(); },
      setReportsGridLayout:           (val) => { set({ reportsGridLayout: val }); notifyPreferencesChanged(); },
      setExpiryGridLayout:            (val) => { set({ expiryGridLayout: val }); notifyPreferencesChanged(); },
      setCheckPriceGridLayout:        (val) => { set({ checkPriceGridLayout: val }); notifyPreferencesChanged(); },
      setStockAlertsGridLayout:       (val) => { set({ stockAlertsGridLayout: val }); notifyPreferencesChanged(); },
      setHistoryGridLayout:           (val) => { set({ historyGridLayout: val }); notifyPreferencesChanged(); },
      setDashboardActivityGridLayout: (val) => { set({ dashboardActivityGridLayout: val }); notifyPreferencesChanged(); },
      setShowSalesInvoicePreview:  (val) => { set({ showSalesInvoicePreview: val }); notifyPreferencesChanged(); },
      setCheckoutGridExpandedPurchase: (val) => { set({ checkoutGridExpandedPurchase: val }); notifyPreferencesChanged(); },
      setCheckoutGridExpandedSale:     (val) => { set({ checkoutGridExpandedSale: val }); notifyPreferencesChanged(); },
      setPurchasePaymentStatusPreference: (val) => { set({ purchasePaymentStatusPreference: val }); notifyPreferencesChanged(); },
      setPurchaseReceiptCurrencyPreference: (val) => { set({ purchaseReceiptCurrencyPreference: val }); notifyPreferencesChanged(); },
      setPurchaseCheckoutModePreference: (val) => { set({ purchaseCheckoutModePreference: val }); notifyPreferencesChanged(); },
      setSaleCheckoutModePreference: (val) => { set({ saleCheckoutModePreference: val }); notifyPreferencesChanged(); },
      setPurchaseDebtDownPaymentMethodPreference: (val) => { set({ purchaseDebtDownPaymentMethodPreference: val }); notifyPreferencesChanged(); },
      setExpiryTrackingEnabled:    (val) => {
        set({ expiryTrackingEnabled: val });
        notifyPreferencesChanged();
        import('@/lib/sqlite').then(async ({ saveSetting, clearReportsCache }) => {
          await saveSetting('expiry_tracking_enabled', val ? '1' : '0');
          await clearReportsCache();
        }).catch(() => {});
      },
      setExpiryAlertDays:          (val) => { set({ expiryAlertDays: Math.max(1, Math.round(val)) }); notifyPreferencesChanged(); },
      setExpiryTermsAccepted:      (val) => { set({ expiryTermsAccepted: val }); notifyPreferencesChanged(); },

      setExchangeRate: async (rate: number) => {
        const now = new Date().toISOString();
        set({ exchangeRate: rate, rateUpdatedAt: now });
        // Persist to SQLite audit log (non-blocking)
        try {
          const { saveExchangeRateHistory } = await import('@/lib/sqlite');
          await saveExchangeRateHistory(rate);
        } catch { /* non-critical — Zustand persist is the source of truth */ }
        notifyPreferencesChanged();
      },
    }),
    {
      name: '@froshiar_settings',
      storage: createJSONStorage(() => migratedAsyncStorage),
      merge: (persisted: unknown, current: SettingsState): SettingsState => {
        const p = persisted as Partial<SettingsState> | null;
        return {
          ...current,
          ...p,
          exchangeRate:  p?.exchangeRate  ?? DEFAULT_EXCHANGE_RATE,
          rateUpdatedAt: p?.rateUpdatedAt ?? null,
          accentColor:             p?.accentColor   ?? null,
          globalLowStockEnabled:   p?.globalLowStockEnabled   ?? true,
          globalLowStockThreshold: p?.globalLowStockThreshold ?? 5,
          baseCurrency:            (p?.baseCurrency === 'USD' ? 'USD' : 'IQD') as BaseCurrency,
          settingsGridLayout:          p?.settingsGridLayout ?? false,
          salesProductGridLayout:      p?.salesProductGridLayout ?? false,
          quotationProductGridLayout:  p?.quotationProductGridLayout ?? (p?.salesProductGridLayout ?? false),
          inventoryGridLayout:         p?.inventoryGridLayout ?? true,
          salesHistoryGridLayout:      p?.salesHistoryGridLayout ?? true,
          purchaseHistoryGridLayout:   p?.purchaseHistoryGridLayout ?? true,
          invoicesGridLayout:          p?.invoicesGridLayout ?? false,
          reportsGridLayout:           p?.reportsGridLayout ?? true,
          expiryGridLayout:            p?.expiryGridLayout ?? false,
          checkPriceGridLayout:        p?.checkPriceGridLayout ?? true,
          stockAlertsGridLayout:       p?.stockAlertsGridLayout ?? false,
          historyGridLayout:           p?.historyGridLayout ?? false,
          dashboardActivityGridLayout: p?.dashboardActivityGridLayout ?? false,
          expiryTrackingEnabled:       p?.expiryTrackingEnabled ?? false,
          expiryAlertDays:             p?.expiryAlertDays ?? 30,
          expiryTermsAccepted:         p?.expiryTermsAccepted ?? false,
          showSalesInvoicePreview:     p?.showSalesInvoicePreview ?? false,
          checkoutGridExpandedPurchase: p?.checkoutGridExpandedPurchase ?? false,
          checkoutGridExpandedSale:     p?.checkoutGridExpandedSale ?? false,
          purchasePaymentStatusPreference: (['paid', 'fib', 'debt'].includes(p?.purchasePaymentStatusPreference as string) ? p?.purchasePaymentStatusPreference : 'paid') as 'paid' | 'fib' | 'debt',
          purchaseReceiptCurrencyPreference: (['iqd', 'usd', 'both'].includes(p?.purchaseReceiptCurrencyPreference as string) ? p?.purchaseReceiptCurrencyPreference : 'iqd') as 'iqd' | 'usd' | 'both',
          purchaseCheckoutModePreference: (['normal', 'print', 'empty1', 'empty2'].includes(p?.purchaseCheckoutModePreference as string) ? p?.purchaseCheckoutModePreference : 'normal') as 'normal' | 'print' | 'empty1' | 'empty2',
          saleCheckoutModePreference: (['normal', 'print', 'empty1', 'empty2'].includes(p?.saleCheckoutModePreference as string) ? p?.saleCheckoutModePreference : 'normal') as 'normal' | 'print' | 'empty1' | 'empty2',
          purchaseDebtDownPaymentMethodPreference: (p?.purchaseDebtDownPaymentMethodPreference === 'fib' ? 'fib' : 'cash') as 'cash' | 'fib',
          invoiceAboutPolicy: p?.invoiceAboutPolicy ?? '',
          appScaleLevel: typeof p?.appScaleLevel === 'number' ? Math.max(1, Math.min(10, Math.round(p.appScaleLevel))) : 5,
        };
      },
    }
  )
);

// One-time graceful migration from legacy standalone AsyncStorage keys
(async () => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const invMode = await AsyncStorage.getItem('@froshiar_inventory_view_mode');
    if (invMode === 'grid' || invMode === 'list') {
      const raw = await AsyncStorage.getItem('@froshiar_settings');
      if (!raw || !JSON.parse(raw)?.state?.hasOwnProperty('inventoryGridLayout')) {
        useSettingsStore.setState({ inventoryGridLayout: invMode === 'grid' });
      }
    }
    const salesMode = await AsyncStorage.getItem('@froshiar_sales_history_view_mode');
    if (salesMode === 'grid' || salesMode === 'list') {
      const raw = await AsyncStorage.getItem('@froshiar_settings');
      if (!raw || !JSON.parse(raw)?.state?.hasOwnProperty('salesHistoryGridLayout')) {
        useSettingsStore.setState({ salesHistoryGridLayout: salesMode === 'grid' });
      }
    }
  } catch { /* non-critical migration */ }
})();

