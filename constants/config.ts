export const SUPPORT_PHONE = '07708229696';

export type ModuleId =
  | 'purchases'
  | 'sales'
  | 'inventory'
  | 'reports'
  | 'history'
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
    id: 'history',
    labelKey: 'dashboard.history',
    icon: 'people',
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
];

export type BusinessType = string;

export const BUSINESS_TYPES: { id: string; label: string; emoji: string }[] = [
  { id: 'mobileShop',  label: 'Mobile Shop',       emoji: '📱' },
  { id: 'electronics', label: 'Electronics',        emoji: '🖥️' },
  { id: 'clothing',    label: 'Clothing Store',     emoji: '👕' },
  { id: 'watches',     label: 'Watches Store',      emoji: '⌚' },
  { id: 'cosmetics',   label: 'Cosmetics Store',    emoji: '💄' },
  { id: 'onlinePage',  label: 'Online Page',        emoji: '🌐' },
  { id: 'personal',    label: 'Personal Business',  emoji: '🏠' },
  { id: 'restaurant',  label: 'Restaurant',         emoji: '🍽️' },
  { id: 'pharmacy',    label: 'Pharmacy',           emoji: '💊' },
  { id: 'supermarket', label: 'Supermarket',        emoji: '🛒' },
];
