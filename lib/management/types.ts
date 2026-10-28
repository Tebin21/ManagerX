export type PermissionState = 'active' | 'disabled' | 'hidden';

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
  createdAt: string;
  status: 'active' | 'suspended';
  lastLoginAt?: string;
  lastLogoutAt?: string;
  deviceModel?: string;
  deviceName?: string;
  permissions: EmployeePermissions;
}

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

  canDeleteInvoice: false,

  settingsLanguage: 'disabled',
  settingsProfile: 'hidden',
  settingsCurrency: 'hidden',
  settingsTheme: 'active',
  settingsBackup: 'hidden',
  settingsDeleteAccount: 'hidden',
};

