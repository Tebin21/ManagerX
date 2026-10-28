export type PermissionState = 'active' | 'disabled' | 'hidden';

export interface EmployeeUsageLimits {
  maxItems: number | 'unlimited';
  maxQuantity: number | 'unlimited';
  maxSales: number | 'unlimited';
  maxInvoices: number | 'unlimited';
  maxQuotations: number | 'unlimited';
}

export interface OnlineStoreConfig {
  enabled: boolean;
  storeName: string;
  subdomain: string;
  status: 'active' | 'suspended';
  activatedAt?: string;
  expiresAt?: string;
}

export interface EmployeePermissions {
  // Modules
  sales: PermissionState;
  purchases: PermissionState;
  inventory: PermissionState;
  reports: PermissionState;
  history: PermissionState;
  invoices: PermissionState;
  debts: PermissionState;
  expenses: PermissionState;
  quotations: PermissionState;
  dashboard: PermissionState;
  onlineStore: PermissionState;

  // Actions
  canDeleteInvoice: boolean;

  // Granular Settings items (button-by-button)
  settingsLanguage: PermissionState;
  settingsProfile: PermissionState;
  settingsCurrency: PermissionState;
  settingsTheme: PermissionState;
  settingsBackup: PermissionState;
  settingsDeleteAccount: PermissionState;
}

export interface EmployeeAccount {
  id: string; // Firebase Auth UID
  email: string;
  displayName: string;
  managerEmail: string; // Bound to manager's official Google/Firebase email
  password?: string;
  passwordUpdatedAt?: string; // ISO date string of last password update
  phone?: string;
  priceAmount?: string; // e.g. "25,000 IQD" or "$20"
  durationDays?: number; // e.g. 30, 90, 365
  startedAt?: string; // ISO date string (Subscription start)
  expiresAt?: string; // ISO date string
  status: 'active' | 'suspended';
  managerStatus?: 'active' | 'suspended'; // If manager is suspended, all employees under this manager are locked
  limits?: EmployeeUsageLimits;
  onlineStore?: OnlineStoreConfig;
  createdAt: string;
  lastLoginAt?: string;
  lastLogoutAt?: string;
  deviceModel?: string;
  deviceName?: string;
  permissions: EmployeePermissions;
}

export const DEFAULT_USAGE_LIMITS: EmployeeUsageLimits = {
  maxItems: 20,
  maxQuantity: 30,
  maxSales: 15,
  maxInvoices: 40,
  maxQuotations: 5,
};

export const UNLIMITED_USAGE_LIMITS: EmployeeUsageLimits = {
  maxItems: 'unlimited',
  maxQuantity: 'unlimited',
  maxSales: 'unlimited',
  maxInvoices: 'unlimited',
  maxQuotations: 'unlimited',
};

export const DEFAULT_EMPLOYEE_PERMISSIONS: EmployeePermissions = {
  sales: 'active',
  purchases: 'active',
  inventory: 'active',
  reports: 'disabled',
  history: 'active',
  invoices: 'active',
  debts: 'active',
  expenses: 'active',
  quotations: 'active',
  dashboard: 'active',
  onlineStore: 'disabled',

  canDeleteInvoice: false,

  settingsLanguage: 'disabled',
  settingsProfile: 'hidden',
  settingsCurrency: 'hidden',
  settingsTheme: 'active',
  settingsBackup: 'hidden',
  settingsDeleteAccount: 'hidden',
};

