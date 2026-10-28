import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EmployeeAccount,
  EmployeePermissions,
  DEFAULT_EMPLOYEE_PERMISSIONS,
} from '@/lib/management/types';
import {
  subscribeToEmployees,
  subscribeToEmployeeLive,
  subscribeToManagerEmployees,
} from '@/lib/management/managementService';

interface ManagementState {
  employees: EmployeeAccount[];
  managedEmployees: EmployeeAccount[];
  isLoading: boolean;
  isEmployee: boolean;
  isManager: boolean;
  currentEmployeeAccount: EmployeeAccount | null;
  currentPermissions: EmployeePermissions | null;

  setEmployees: (employees: EmployeeAccount[]) => void;
  setManagedEmployees: (employees: EmployeeAccount[]) => void;
  setCurrentEmployee: (account: EmployeeAccount | null) => void;
  updateCurrentPermissions: (permissions: EmployeePermissions) => void;
  clearEmployeeSession: () => void;
  initSuperAdminSubscription: () => () => void;
  initEmployeeLiveSubscription: (email: string) => () => void;
  initManagerSubscription: (managerEmail: string) => () => void;
}

export const useManagementStore = create<ManagementState>()(
  persist(
    (set, get) => ({
      employees: [],
      managedEmployees: [],
      isLoading: false,
      isEmployee: false,
      isManager: false,
      currentEmployeeAccount: null,
      currentPermissions: null,

      setEmployees: (employees) => set({ employees, isLoading: false }),

      setManagedEmployees: (managedEmployees) =>
        set({
          managedEmployees,
          isManager: managedEmployees.length > 0,
        }),

      setCurrentEmployee: (account) => {
        if (!account) {
          set({
            isEmployee: false,
            currentEmployeeAccount: null,
            currentPermissions: null,
          });
        } else {
          set({
            isEmployee: true,
            currentEmployeeAccount: account,
            currentPermissions: account.permissions || DEFAULT_EMPLOYEE_PERMISSIONS,
          });
        }
      },

      updateCurrentPermissions: (permissions) =>
        set((state) => ({
          currentPermissions: permissions,
          currentEmployeeAccount: state.currentEmployeeAccount
            ? { ...state.currentEmployeeAccount, permissions }
            : null,
        })),

      clearEmployeeSession: () =>
        set({
          isEmployee: false,
          currentEmployeeAccount: null,
          currentPermissions: null,
        }),

      initSuperAdminSubscription: () => {
        set({ isLoading: true });
        const unsubscribe = subscribeToEmployees((employees) => {
          get().setEmployees(employees);
        });
        return unsubscribe;
      },

      initEmployeeLiveSubscription: (email: string) => {
        const unsubscribe = subscribeToEmployeeLive(email, (account) => {
          if (!account) {
            get().clearEmployeeSession();
            return;
          }
          if (account.status === 'suspended') {
            // Suspended by management!
            get().clearEmployeeSession();
            // Force sign out
            import('@/store/authStore').then((m) => m.useAuthStore.getState().signOut());
            return;
          }
          get().setCurrentEmployee(account);
        });
        return unsubscribe;
      },

      initManagerSubscription: (managerEmail: string) => {
        if (!managerEmail) return () => {};
        const unsubscribe = subscribeToManagerEmployees(managerEmail, (managed) => {
          get().setManagedEmployees(managed);
        });
        return unsubscribe;
      },
    }),
    {
      name: '@froshiar_management_store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isEmployee: state.isEmployee,
        isManager: state.isManager,
        managedEmployees: state.managedEmployees,
        currentEmployeeAccount: state.currentEmployeeAccount,
        currentPermissions: state.currentPermissions,
      }),
    }
  )
);

