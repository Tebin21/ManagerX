export const SUPPORT_PHONE = '07708229696';
export const SUPPORT_EMAIL = 'tebin.faruq@gmail.com';

export type ModuleId =
  | 'purchases'
  | 'sales'
  | 'inventory'
  | 'reports'
  | 'customers'
  | 'debt';

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
    id: 'customers',
    labelKey: 'dashboard.customers',
    icon: 'people',
    descriptionKey: 'modules.customers.description',
    route: '/(app)/customers',
  },
  {
    id: 'debt',
    labelKey: 'dashboard.debt',
    icon: 'wallet',
    descriptionKey: 'modules.debt.description',
    route: '/(app)/debt',
  },
];

export type BusinessType =
  | 'mobileShop'
  | 'clothing'
  | 'watches'
  | 'cosmetics'
  | 'onlinePage'
  | 'personal';

export const BUSINESS_TYPES: { id: BusinessType; labelKey: string; emoji: string }[] = [
  { id: 'mobileShop', labelKey: 'setup.types.mobileShop', emoji: '📱' },
  { id: 'clothing', labelKey: 'setup.types.clothing', emoji: '👕' },
  { id: 'watches', labelKey: 'setup.types.watches', emoji: '⌚' },
  { id: 'cosmetics', labelKey: 'setup.types.cosmetics', emoji: '💄' },
  { id: 'onlinePage', labelKey: 'setup.types.onlinePage', emoji: '🌐' },
  { id: 'personal', labelKey: 'setup.types.personal', emoji: '🏠' },
];
