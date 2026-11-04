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
import { EmployeeAccount, EmployeePermissions, DEFAULT_EMPLOYEE_PERMISSIONS, ALL_ACTIVE_PERMISSIONS } from './types';
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
  role?: 'manager' | 'employee' | 'user';
  phone?: string;
  priceAmount?: string;
  limits?: import('./types').EmployeeUsageLimits;
}): Promise<EmployeeAccount> {
  const db = getFirebaseFirestore();
  const cleanEmail = input.email.trim().toLowerCase();
  const docId = getCleanDocId(cleanEmail);
  const docRef = doc(db, COLLECTION_NAME, docId);

  const existing = await getDoc(docRef);
  if (existing.exists()) {
    throw new Error('EMPLOYEE_EMAIL_ALREADY_EXISTS');
  }

  const isManagerRole = input.role === 'manager';
  const defaultLimits: import('./types').EmployeeUsageLimits = isManagerRole
    ? {
        maxItems: 'unlimited',
        maxQuantity: 'unlimited',
        maxSales: 'unlimited',
        maxInvoices: 'unlimited',
        maxQuotations: 'unlimited',
      }
    : (input.limits || {
        maxItems: 'unlimited',
        maxQuantity: 'unlimited',
        maxSales: 'unlimited',
        maxInvoices: 'unlimited',
        maxQuotations: 'unlimited',
      });

  const newAccount: EmployeeAccount & { password?: string } = {
    id: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    email: cleanEmail,
    password: input.password,
    displayName: input.displayName.trim(),
    managerEmail: (input.managerEmail || cleanEmail).trim().toLowerCase(),
    phone: input.phone?.trim() || undefined,
    priceAmount: input.priceAmount || (isManagerRole ? 'PRO / هەمیشەیی' : undefined),
    role: input.role || 'employee',
    createdAt: new Date().toISOString(),
    status: 'active',
    limits: defaultLimits,
    permissions: isManagerRole
      ? ALL_ACTIVE_PERMISSIONS
      : {
          ...DEFAULT_EMPLOYEE_PERMISSIONS,
          ...(input.permissions || {}),
        },
  };

  await setDoc(docRef, newAccount, { merge: true });

  // If this is a store manager or PRO account, mirror to user_subscriptions so PRO activates instantly everywhere
  if (isManagerRole || input.role === 'user') {
    try {
      const subRef = doc(db, 'user_subscriptions', docId);
      await setDoc(
        subRef,
        {
          id: docId,
          email: cleanEmail,
          customerName: input.displayName.trim(),
          phone: input.phone?.trim() || null,
          status: 'active',
          tier: 'pro',
          planId: 'lifetime',
          startDate: new Date().toISOString(),
          priceAmount: input.priceAmount || 'PRO / هەمیشەیی',
          limits: defaultLimits,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('[ManagementService] user_subscriptions sync warning:', e);
    }
  }

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
 * Updates an employee's login password directly from manager panel.
 * Safely resolves the exact Firestore document and merges timestamp for instant Admin syncing.
 */
export async function updateEmployeePassword(
  docIdOrEmail: string,
  newPassword: string,
  explicitDocId?: string
): Promise<void> {
  const db = getFirebaseFirestore();
  const cleanId = getCleanDocId(docIdOrEmail);
  const candidateIds = Array.from(new Set([
    explicitDocId,
    cleanId,
    docIdOrEmail.trim(),
    docIdOrEmail.trim().toLowerCase(),
  ])).filter(Boolean) as string[];

  let targetDocRef = null;
  for (const cid of candidateIds) {
    try {
      const ref = doc(db, COLLECTION_NAME, cid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        targetDocRef = ref;
        break;
      }
    } catch {
      // Continue to next candidate
    }
  }

  // If not found by candidate doc IDs, search collection by email field
  if (!targetDocRef) {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const snap = await getDocs(colRef);
      const targetEmail = docIdOrEmail.trim().toLowerCase();
      for (const d of snap.docs) {
        const data = d.data() as EmployeeAccount;
        if (
          (data.email && data.email.trim().toLowerCase() === targetEmail) ||
          d.id === cleanId
        ) {
          targetDocRef = doc(db, COLLECTION_NAME, d.id);
          break;
        }
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback if still not found
  if (!targetDocRef) {
    targetDocRef = doc(db, COLLECTION_NAME, cleanId);
  }

  const timestamp = new Date().toISOString();
  await setDoc(targetDocRef, {
    password: newPassword,
    passwordUpdatedAt: timestamp,
    updatedAt: timestamp,
  }, { merge: true });
}

/**
 * Updates full account details (email, password, displayName, managerEmail, phone, priceAmount, etc.)
 */
export async function updateEmployeeAccountDetails(
  docIdOrEmail: string,
  updates: Partial<EmployeeAccount>
): Promise<void> {
  const db = getFirebaseFirestore();
  const docId = getCleanDocId(docIdOrEmail);
  const docRef = doc(db, COLLECTION_NAME, docId);

  await setDoc(docRef, updates, { merge: true });
}

/**
 * Renews subscription for an employee by adding days to expiresAt.
 */
export async function renewEmployeeSubscription(
  docIdOrEmail: string,
  additionalDays: number,
  newPriceAmount?: string
): Promise<string> {
  const db = getFirebaseFirestore();
  const docId = getCleanDocId(docIdOrEmail);
  const docRef = doc(db, COLLECTION_NAME, docId);

  const snap = await getDoc(docRef);
  const currentData = snap.data() as EmployeeAccount;

  let baseDate = new Date();
  if (currentData?.expiresAt && new Date(currentData.expiresAt).getTime() > Date.now()) {
    baseDate = new Date(currentData.expiresAt);
  }
  baseDate.setDate(baseDate.getDate() + additionalDays);
  const newExpiresAt = baseDate.toISOString();

  const payload: Partial<EmployeeAccount> = {
    expiresAt: newExpiresAt,
    status: 'active',
  };
  if (newPriceAmount) {
    payload.priceAmount = newPriceAmount;
  }

  await setDoc(docRef, payload, { merge: true });
  return newExpiresAt;
}

/**
 * Updates Online Store configuration for an account.
 */
export async function updateOnlineStoreConfig(
  docIdOrEmail: string,
  onlineStore: Partial<import('./types').OnlineStoreConfig>
): Promise<void> {
  const db = getFirebaseFirestore();
  const docId = getCleanDocId(docIdOrEmail);
  const docRef = doc(db, COLLECTION_NAME, docId);

  const snap = await getDoc(docRef);
  const existingStore = (snap.data() as EmployeeAccount)?.onlineStore || {
    enabled: false,
    storeName: '',
    subdomain: '',
    status: 'suspended' as const,
  };

  await setDoc(
    docRef,
    {
      onlineStore: {
        ...existingStore,
        ...onlineStore,
      },
    },
    { merge: true }
  );
}

/**
 * Suspends or activates a manager, which cascades to all employees linked to this manager!
 */
export async function setManagerSuspension(
  managerEmail: string,
  managerStatus: 'active' | 'suspended'
): Promise<void> {
  const db = getFirebaseFirestore();
  const cleanManager = managerEmail.trim().toLowerCase();
  const colRef = collection(db, COLLECTION_NAME);
  const snap = await getDocs(colRef);

  const batchUpdates: Promise<any>[] = [];
  snap.forEach((d) => {
    const data = d.data() as EmployeeAccount;
    if ((data.managerEmail || '').trim().toLowerCase() === cleanManager) {
      batchUpdates.push(
        setDoc(doc(db, COLLECTION_NAME, d.id), { managerStatus }, { merge: true })
      );
    }
  });

  await Promise.all(batchUpdates);
}

/**
 * Subscribes in real-time to employees supervised by a specific manager.
 */
export function subscribeToManagerEmployees(
  managerEmail: string,
  onUpdate: (employees: EmployeeAccount[]) => void
): () => void {
  try {
    const cleanManager = (managerEmail || '').trim().toLowerCase();
    if (!cleanManager || !cleanManager.includes('@')) {
      onUpdate([]);
      return () => {};
    }

    const db = getFirebaseFirestore();
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: EmployeeAccount[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as EmployeeAccount;
          const empMgr = (data.managerEmail || '').trim().toLowerCase();
          const empEmail = (data.email || '').trim().toLowerCase();
          // Strict tenant check: Must strictly match manager's email and not be the manager themselves
          if (data && empEmail && empMgr === cleanManager && empEmail !== cleanManager) {
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
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        onUpdate(list);
      },
      (err) => {
        console.warn('[ManagementService] subscribeToManagerEmployees error:', err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[ManagementService] Failed to init manager subscription:', err);
    return () => {};
  }
}

/**
 * Stores manager's Google Drive connection status so employees inherit data sync.
 */
export async function linkManagerGoogleDrive(
  managerEmail: string,
  driveInfo: { email: string; isConnected: boolean; lastSyncAt?: string }
): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const docId = `gdrive_${getCleanDocId(managerEmail)}`;
    const docRef = doc(db, 'manager_drive_links', docId);

    await setDoc(
      docRef,
      {
        managerEmail: managerEmail.trim().toLowerCase(),
        driveEmail: driveInfo.email,
        isConnected: driveInfo.isConnected,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[ManagementService] Failed to link manager google drive:', e);
  }
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

    // Also register in general telemetry so employee logins appear in admin live users & events
    import('@/lib/telemetry').then((m) => {
      m.trackUserLogin({
        userId: docId,
        email,
        displayName: 'کارمەند (' + email.split('@')[0] + ')',
        provider: 'employee',
      });
    }).catch(() => {});
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

function parseFirestoreRestValue(val: any): any {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('mapValue' in val) return parseFirestoreRestFields(val.mapValue?.fields || {});
  if ('arrayValue' in val) return (val.arrayValue?.values || []).map(parseFirestoreRestValue);
  return null;
}

export function parseFirestoreRestFields(fields: any): any {
  if (!fields || typeof fields !== 'object') return {};
  const result: any = {};
  for (const [key, val] of Object.entries(fields)) {
    result[key] = parseFirestoreRestValue(val);
  }
  return result;
}

/**
 * Authenticates an employee or store manager by email and password against Firestore records.
 * Uses concurrent REST and SDK calls to ensure lightning-fast login on Desktop (macOS / Windows) and Mobile.
 */
export async function authenticateEmployee(
  email: string,
  passwordAttempt: string
): Promise<{ success: boolean; error?: string; account?: EmployeeAccount }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docId = getCleanDocId(cleanEmail);

    let data: (EmployeeAccount & { password?: string; targetPlatform?: string }) | null = null;
    let accountId = docId;

    // 1. Direct fast Firestore REST call (zero dependency, instant, ignores cache lockouts)
    try {
      const restUrl = `https://firestore.googleapis.com/v1/projects/managerx-bac3a/databases/(default)/documents/employee_accounts/${docId}`;
      const res = await Promise.race([
        fetch(restUrl, { method: 'GET', headers: { Accept: 'application/json' } }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
      if (res && res.ok) {
        const json = await res.json();
        if (json && json.fields) {
          data = parseFirestoreRestFields(json.fields);
          accountId = json.name ? json.name.split('/').pop() : docId;
        }
      }
    } catch (restErr) {
      console.warn('[ManagementService] REST account fetch error:', restErr);
    }

    // 2. Fallback to Firestore SDK
    if (!data) {
      try {
        const db = getFirebaseFirestore();
        if (db) {
          const docRef = doc(db, COLLECTION_NAME, docId);
          const snap = await Promise.race([
            getDoc(docRef),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
          ]);
          if (snap && typeof snap.exists === 'function' && snap.exists()) {
            data = snap.data() as any;
            accountId = snap.id;
          }
        }
      } catch (sdkErr) {
        console.warn('[ManagementService] SDK account fetch error:', sdkErr);
      }
    }

    if (!data) {
      return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    }

    if (data.status === 'suspended') {
      return { success: false, error: 'ACCOUNT_SUSPENDED' };
    }

    // Check operating system restriction if specified (macOS vs Windows)
    if (data.targetPlatform && data.targetPlatform !== 'all') {
      const isMac =
        typeof window !== 'undefined' &&
        ((window as any).desktopAPI?.platform === 'darwin' ||
          navigator?.userAgent?.toLowerCase().includes('mac'));
      const isWindows =
        typeof window !== 'undefined' &&
        ((window as any).desktopAPI?.platform === 'win32' ||
          navigator?.userAgent?.toLowerCase().includes('win'));

      if (data.targetPlatform === 'macos' && isWindows) {
        return { success: false, error: 'PLATFORM_MISMATCH_MACOS' };
      }
      if (data.targetPlatform === 'windows' && isMac) {
        return { success: false, error: 'PLATFORM_MISMATCH_WINDOWS' };
      }
    }

    if (data.password && data.password !== passwordAttempt) {
      return { success: false, error: 'WRONG_PASSWORD' };
    }

    return {
      success: true,
      account: {
        ...data,
        id: accountId,
        permissions:
          data.role === 'manager'
            ? ALL_ACTIVE_PERMISSIONS
            : {
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

/**
 * Subscribes in real-time to an account's usage limits, status and expiration across Firestore.
 * Concurrently listens to employee_accounts[cleanId] AND user_subscriptions[cleanId].
 * Triggers instantly whenever an admin raises limits (individual numbers or unlimited) on the admin website.
 */
export function subscribeToAccountLimitsLive(
  email: string,
  onUpdate: (account: EmployeeAccount | null) => void
): () => void {
  if (!email || !email.includes('@')) {
    return () => {};
  }

  try {
    const db = getFirebaseFirestore();
    const cleanId = getCleanDocId(email);

    let empData: EmployeeAccount | null = null;
    let subData: any = null;
    let hasReceivedEmp = false;
    let hasReceivedSub = false;

    const emitMerged = () => {
      if (!empData && !subData) {
        if (hasReceivedEmp && hasReceivedSub) {
          onUpdate(null);
        }
        return;
      }

      // Merge limits: prioritize explicit limits from either document
      let limits = empData?.limits || subData?.limits;

      // If user_subscriptions has lifetime or pro tier and no specific limit, treat as unlimited
      if (!limits && subData) {
        if (subData.planId === 'lifetime' || subData.tier === 'pro') {
          limits = {
            maxItems: 'unlimited',
            maxQuantity: 'unlimited',
            maxSales: 'unlimited',
            maxInvoices: 'unlimited',
            maxQuotations: 'unlimited',
          };
        }
      }

      const status = empData?.status || subData?.status || 'active';
      const expiresAt = empData?.expiresAt ?? subData?.expiresAt;
      let upgradeReceipt = empData?.upgradeReceipt || subData?.upgradeReceipt;
      if (upgradeReceipt && !upgradeReceipt.priceAmount) {
        upgradeReceipt = {
          ...upgradeReceipt,
          priceAmount: empData?.priceAmount || subData?.priceAmount || null,
        };
      }

      const merged: EmployeeAccount = {
        id: empData?.id || cleanId,
        email: email.trim().toLowerCase(),
        displayName: empData?.displayName || subData?.customerName || email.split('@')[0],
        managerEmail: empData?.managerEmail || email.trim().toLowerCase(),
        priceAmount: empData?.priceAmount || subData?.priceAmount || upgradeReceipt?.priceAmount,
        startedAt: empData?.startedAt || subData?.startDate || upgradeReceipt?.startDate,
        status,
        expiresAt,
        limits,
        onlineStore: empData?.onlineStore || subData?.onlineStore,
        permissions: empData?.permissions || ALL_ACTIVE_PERMISSIONS,
        createdAt: empData?.createdAt || subData?.startDate || new Date().toISOString(),
        role: empData?.accountType === 'registered' || subData ? 'user' : (empData?.role || 'user'),
        accountType: empData?.accountType || 'registered',
        upgradeReceipt,
      };

      onUpdate(merged);
    };

    const unsubEmp = onSnapshot(
      doc(db, COLLECTION_NAME, cleanId),
      (snap) => {
        hasReceivedEmp = true;
        if (snap.exists()) {
          const data = snap.data() as EmployeeAccount;
          empData = {
            ...data,
            id: snap.id,
            permissions: {
              ...DEFAULT_EMPLOYEE_PERMISSIONS,
              ...(data.permissions || {}),
            },
          };
        } else {
          empData = null;
        }
        emitMerged();
      },
      (err) => {
        hasReceivedEmp = true;
        console.warn('[ManagementService] subscribeToAccountLimitsLive emp error:', err);
        emitMerged();
      }
    );

    const unsubSub = onSnapshot(
      doc(db, 'user_subscriptions', cleanId),
      (snap) => {
        hasReceivedSub = true;
        if (snap.exists()) {
          subData = snap.data();
        } else {
          subData = null;
        }
        emitMerged();
      },
      (err) => {
        hasReceivedSub = true;
        console.warn('[ManagementService] subscribeToAccountLimitsLive sub error:', err);
        emitMerged();
      }
    );

    return () => {
      unsubEmp();
      unsubSub();
    };
  } catch (err) {
    console.warn('[ManagementService] Failed to subscribe to account limits live:', err);
    return () => {};
  }
}


