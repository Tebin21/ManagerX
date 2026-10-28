import { Platform } from 'react-native';
import {
  getFirebaseFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  query,
} from '@/lib/firebase';
import { EmployeeAccount, EmployeePermissions, DEFAULT_EMPLOYEE_PERMISSIONS } from './types';
import { getOrCreateDeviceId } from '@/lib/deviceId';

const COLLECTION_NAME = 'employee_accounts';

export function getCleanDocId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9_]/gi, '_');
}

/**
 * Returns user-friendly device info (OS + model/brand).
 */
export async function getCurrentDeviceInfo(): Promise<{ deviceModel: string; deviceName: string }> {
  try {
    const osName = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web';
    const osVersion = Platform.Version ? ` ${Platform.Version}` : '';
    const hwId = await getOrCreateDeviceId();
    const shortHw = hwId ? ` (${hwId.slice(0, 10)})` : '';

    return {
      deviceModel: `${osName}${osVersion}`,
      deviceName: `${osName} Device${shortHw}`,
    };
  } catch {
    return {
      deviceModel: Platform.OS || 'Unknown',
      deviceName: 'Mobile Device',
    };
  }
}

/**
 * Subscribes in real-time to all employee accounts (Super-Admin view).
 */
export function subscribeToEmployees(
  onEmployeesUpdate: (employees: EmployeeAccount[]) => void
): () => void {
  try {
    const db = getFirebaseFirestore();
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: EmployeeAccount[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as EmployeeAccount;
          if (data && data.email) {
            list.push({
              ...data,
              id: d.id,
              permissions: {
                ...DEFAULT_EMPLOYEE_PERMISSIONS,
                ...(data.permissions || {}),
              },
            });
          }
        });
        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        onEmployeesUpdate(list);
      },
      (err) => {
        console.warn('[ManagementService] subscribeToEmployees error:', err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[ManagementService] Failed to init snapshot:', err);
    return () => {};
  }
}

/**
 * Subscribes to a single employee account in real-time (Employee Client view).
 * When Super-Admin toggles permissions or suspends the employee, this triggers instantly.
 */
export function subscribeToEmployeeLive(
  email: string,
  onUpdate: (employee: EmployeeAccount | null) => void
): () => void {
  try {
    const db = getFirebaseFirestore();
    const docId = getCleanDocId(email);
    const docRef = doc(db, COLLECTION_NAME, docId);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onUpdate(null);
          return;
        }
        const data = snapshot.data() as EmployeeAccount;
        onUpdate({
          ...data,
          id: snapshot.id,
          permissions: {
            ...DEFAULT_EMPLOYEE_PERMISSIONS,
            ...(data.permissions || {}),
          },
        });
      },
      (err) => {
        console.warn('[ManagementService] subscribeToEmployeeLive error:', err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[ManagementService] Failed to subscribe to employee live:', err);
    return () => {};
  }
}

/**
 * Creates or updates an employee account in Firestore.
 */
export async function createEmployeeAccount(input: {
  email: string;
  password: string;
  displayName: string;
  managerEmail: string;
  permissions?: Partial<EmployeePermissions>;
}): Promise<EmployeeAccount> {
  const db = getFirebaseFirestore();
  const cleanEmail = input.email.trim().toLowerCase();
  const docId = getCleanDocId(cleanEmail);
  const docRef = doc(db, COLLECTION_NAME, docId);

  const existing = await getDoc(docRef);
  if (existing.exists()) {
    throw new Error('EMPLOYEE_EMAIL_ALREADY_EXISTS');
  }

  const newAccount: EmployeeAccount & { password?: string } = {
    id: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    email: cleanEmail,
    password: input.password,
    displayName: input.displayName.trim(),
    managerEmail: input.managerEmail.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
    status: 'active',
    permissions: {
      ...DEFAULT_EMPLOYEE_PERMISSIONS,
      ...(input.permissions || {}),
    },
  };

  await setDoc(docRef, newAccount, { merge: true });
  return newAccount;
}

/**
 * Updates permissions for an existing employee.
 */
export async function updateEmployeePermissions(
  docIdOrEmail: string,
  permissions: Partial<EmployeePermissions>
): Promise<void> {
  const db = getFirebaseFirestore();
  const docId = getCleanDocId(docIdOrEmail);
  const docRef = doc(db, COLLECTION_NAME, docId);

  const snap = await getDoc(docRef);
  const existing = (snap.data() as EmployeeAccount)?.permissions || DEFAULT_EMPLOYEE_PERMISSIONS;

  const merged = {
    ...existing,
    ...permissions,
  };

  await setDoc(docRef, { permissions: merged }, { merge: true });
}

/**
 * Toggles an employee's status between 'active' and 'suspended'.
 */
export async function setEmployeeStatus(
  docIdOrEmail: string,
  status: 'active' | 'suspended'
): Promise<void> {
  const db = getFirebaseFirestore();
  const docId = getCleanDocId(docIdOrEmail);
  const docRef = doc(db, COLLECTION_NAME, docId);

  await setDoc(docRef, { status }, { merge: true });
}

/**
 * Deletes an employee account.
 */
export async function deleteEmployeeAccount(docIdOrEmail: string): Promise<void> {
  const db = getFirebaseFirestore();
  const docId = getCleanDocId(docIdOrEmail);
  const { deleteDoc: firestoreDelete } = await import('@/lib/firebase');
  await firestoreDelete(doc(db, COLLECTION_NAME, docId));
}

/**
 * Records employee login and captures device information.
 */
export async function recordEmployeeLogin(email: string): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const docId = getCleanDocId(email);
    const docRef = doc(db, COLLECTION_NAME, docId);
    const deviceInfo = await getCurrentDeviceInfo();

    await setDoc(
      docRef,
      {
        lastLoginAt: new Date().toISOString(),
        deviceModel: deviceInfo.deviceModel,
        deviceName: deviceInfo.deviceName,
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[ManagementService] Failed to record login session:', e);
  }
}

/**
 * Records employee logout.
 */
export async function recordEmployeeLogout(email: string): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const docId = getCleanDocId(email);
    const docRef = doc(db, COLLECTION_NAME, docId);

    await setDoc(
      docRef,
      {
        lastLogoutAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[ManagementService] Failed to record logout session:', e);
  }
}

/**
 * Authenticates an employee by email and password against Firestore records.
 */
export async function authenticateEmployee(
  email: string,
  passwordAttempt: string
): Promise<{ success: boolean; error?: string; account?: EmployeeAccount }> {
  try {
    const db = getFirebaseFirestore();
    const docId = getCleanDocId(email);
    const docRef = doc(db, COLLECTION_NAME, docId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    }

    const data = snap.data() as EmployeeAccount & { password?: string };

    if (data.status === 'suspended') {
      return { success: false, error: 'ACCOUNT_SUSPENDED' };
    }

    if (data.password && data.password !== passwordAttempt) {
      return { success: false, error: 'WRONG_PASSWORD' };
    }

    return {
      success: true,
      account: {
        ...data,
        id: snap.id,
        permissions: {
          ...DEFAULT_EMPLOYEE_PERMISSIONS,
          ...(data.permissions || {}),
        },
      },
    };
  } catch (err: any) {
    console.error('[ManagementService] authenticateEmployee error:', err);
    return { success: false, error: err?.message || 'AUTH_ERROR' };
  }
}

