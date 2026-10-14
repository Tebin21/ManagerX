export const SUPPORT_PHONE   = '07708229696';
export const SUPPORT_WEBSITE = 'https://www.BexDre.com';
export const SUPPORT_WEBSITE_DISPLAY = 'www.BexDre.com';

// Must be set to a real, published privacy policy URL before release — required by
// both Google Play (Data Safety section) and Apple App Store review, since the app
// collects data via Google Sign-In/Firebase. Left blank intentionally: no policy text
// or URL has been authored yet, and this app must not ship a fabricated one. The
// Settings > About "Privacy Policy" row (app/(app)/settings/index.tsx) only renders
// when this is non-empty, so nothing broken/misleading ships while it's unset.
export const PRIVACY_POLICY_URL = '';

export type ModuleId =
  | 'purchases'
  | 'sales'
  | 'inventory'
  | 'reports'
  | 'history'
  | 'debt'
  | 'expenses'
  | 'dashboard';

export interface ModuleDefinition {
  id: ModuleId;
  labelKey: string;
  icon: string;
  descriptionKey: string;
  route: string;
}

export const MODULES: ModuleDefinition[] = [
  {
    id: 'purchases',
    labelKey: 'dashboard.purchases',
    icon: 'cart',
    descriptionKey: 'modules.purchases.description',
    route: '/(app)/purchases',
  },
  {
    id: 'sales',
    labelKey: 'dashboard.sales',
    icon: 'receipt',
    descriptionKey: 'modules.sales.description',
    route: '/(app)/sales',
  },
  {
    id: 'inventory',
    labelKey: 'dashboard.inventory',
    icon: 'cube',
    descriptionKey: 'modules.inventory.description',
    route: '/(app)/inventory',
  },
  {
    id: 'reports',
    labelKey: 'dashboard.reports',
    icon: 'bar-chart',
    descriptionKey: 'modules.reports.description',
    route: '/(app)/reports',
  },
  {
    id: 'history',
    labelKey: 'dashboard.history',
    icon: 'time',
    descriptionKey: 'modules.history.description',
    route: '/(app)/history',
  },
  {
    id: 'debt',
    labelKey: 'dashboard.debt',
    icon: 'wallet',
    descriptionKey: 'modules.debt.description',
    route: '/(app)/debt',
  },
  {
    id: 'expenses',
    labelKey: 'dashboard.expensesCard',
    icon: 'cash',
    descriptionKey: 'modules.expenses.description',
    route: '/(app)/reports/expenses',
  },
  {
    id: 'dashboard',
    labelKey: 'dashboard.dashboardModule',
    icon: 'grid',
    descriptionKey: 'modules.dashboard.description',
    route: '/(app)/dashboard-view',
  },
];

export const BUSINESS_TYPES: { id: string; label: string; labelKu: string; emoji: string }[] = [
  { id: 'mobileShop',  label: 'Mobile Shop',       labelKu: 'دووکانی مۆبایل',      emoji: '📱' },
  { id: 'electronics', label: 'Electronics',        labelKu: 'ئەلیکترۆنیات',        emoji: '🖥️' },
  { id: 'clothing',    label: 'Clothing Store',     labelKu: 'جل و بەرگ',           emoji: '👕' },
  { id: 'watches',     label: 'Watches Store',      labelKu: 'کاتژمێر',             emoji: '⌚' },
  { id: 'cosmetics',   label: 'Cosmetics Store',    labelKu: 'ئارایشت و جوانکاری',  emoji: '💄' },
  { id: 'onlinePage',  label: 'Online Page',        labelKu: 'پەیجی ئۆنلاین',       emoji: '🌐' },
  { id: 'personal',    label: 'Personal Business',  labelKu: 'کاری تایبەت',         emoji: '🏠' },
  { id: 'restaurant',  label: 'Restaurant',         labelKu: 'چێشتخانە و کافێ',     emoji: '🍽️' },
  { id: 'pharmacy',    label: 'Pharmacy',           labelKu: 'دەرمانخانە',          emoji: '💊' },
  { id: 'supermarket', label: 'Supermarket',        labelKu: 'سوپەرمارکێت',         emoji: '🛒' },
];
