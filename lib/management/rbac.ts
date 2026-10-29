import { EmployeePermissions, PermissionState } from './types';
import { useManagementStore } from '@/store/managementStore';
import { useAuthStore } from '@/store/authStore';
import { isAdminEmail } from '@/lib/adminNotificationService';

export function isModuleHidden(
  permissions: EmployeePermissions | null | undefined,
  moduleId: string
): boolean {
  if (!permissions) return false;
  const state = (permissions as unknown as Record<string, PermissionState>)[moduleId];
  return state === 'hidden';
}

export function isModuleDisabled(
  permissions: EmployeePermissions | null | undefined,
  moduleId: string
): boolean {
  if (!permissions) return false;
  const state = (permissions as unknown as Record<string, PermissionState>)[moduleId];
  return state === 'disabled';
}

export function isActionAllowed(
  permissions: EmployeePermissions | null | undefined,
  actionKey: keyof EmployeePermissions
): boolean {
  if (!permissions) return true;
  const val = permissions[actionKey];
  if (typeof val === 'boolean') return val;
  return val === 'active';
}

/**
 * Hook to check permission for the current active user in any component.
 * If the user is Super-Admin or Business Owner, permissions always allow everything.
 * If the user is an employee, the custom permissions from management are applied.
 */
export function useEffectivePermission(key: keyof EmployeePermissions): {
  state: PermissionState;
  isHidden: boolean;
  isDisabled: boolean;
  isAllowed: boolean;
} {
  const user = useAuthStore((s) => s.user);
  const currentPermissions = useManagementStore((s) => s.currentPermissions);
  const isEmployee = useManagementStore((s) => s.isEmployee);
  const currentEmployeeAccount = useManagementStore((s) => s.currentEmployeeAccount);

  const isAdmin = isAdminEmail(user?.email);

  const isRealEmployee = Boolean(
    isEmployee &&
    currentEmployeeAccount?.email &&
    user?.email &&
    currentEmployeeAccount.email.trim().toLowerCase() === user.email.trim().toLowerCase() &&
    !isAdmin
  );

  // Super-admin or non-employee users/owners have full permissions
  if (isAdmin || !isRealEmployee || !currentPermissions) {
    return {
      state: 'active',
      isHidden: false,
      isDisabled: false,
      isAllowed: true,
    };
  }

  const rawVal = currentPermissions[key];
  if (typeof rawVal === 'boolean') {
    return {
      state: rawVal ? 'active' : 'disabled',
      isHidden: false,
      isDisabled: !rawVal,
      isAllowed: rawVal,
    };
  }

  const state: PermissionState = rawVal ?? 'active';
  return {
    state,
    isHidden: state === 'hidden',
    isDisabled: state === 'disabled',
    isAllowed: state === 'active',
  };
}

