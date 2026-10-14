import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getOrCreateDeviceId } from '@/lib/deviceId';
import {
  isFirebaseAvailable,
  getFirebaseFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  serverTimestamp,
} from '@/lib/firebase';

const LAST_INSTALL_PING_KEY = '@froshiar_telemetry_last_install_ping';
const LAST_LOGIN_PING_KEY = '@froshiar_telemetry_last_login_ping';
const PING_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes cooldown for heartbeat

interface UserPayload {
  userId: string;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
  businessName?: string | null;
  accountPassword?: string | null;
}

/**
 * Sends a real device ping upon application launch/open directly to Firebase Firestore.
 * Zero connection to Vercel — 100% Google Firebase Server infrastructure.
 */
export async function trackAppInstallOrOpen(): Promise<void> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const now = Date.now();
    const lastPingRaw = await AsyncStorage.getItem(LAST_INSTALL_PING_KEY);
    const lastPing = lastPingRaw ? parseInt(lastPingRaw, 10) : 0;

    // Throttle repeated open heartbeats within cooldown window
    if (now - lastPing < PING_COOLDOWN_MS) {
      return;
    }

    if (!isFirebaseAvailable) return;

    const appVersion =
      Constants.expoConfig?.version ??
      Constants.manifest2?.extra?.expoClient?.version ??
      '1.0.0';

    const firestore = getFirebaseFirestore();
    const installRef = doc(firestore, 'app_telemetry_installs', deviceId);
    const existingSnap = await getDoc(installRef).catch(() => null);
    const prevData = existingSnap && 'data' in existingSnap ? existingSnap.data() : null;
    const openCount = (Number(prevData?.open_count) || 0) + 1;

    const nowIso = new Date().toISOString();

    await setDoc(
      installRef,
      {
        device_id: deviceId,
        platform: Platform.OS,
        os_version: String(Platform.Version ?? ''),
        app_version: appVersion,
        brand: Platform.OS === 'ios' ? 'Apple' : 'Android',
        model_name: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device',
        open_count: openCount,
        last_seen_at: nowIso,
        first_installed_at: prevData?.first_installed_at || nowIso,
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );

    // Record live event stream in app_telemetry_events
    try {
      const eventRef = doc(collection(firestore, 'app_telemetry_events'));
      await setDoc(eventRef, {
        id: eventRef.id,
        event_type: 'app_open',
        device_id: deviceId,
        platform: Platform.OS,
        created_at: nowIso,
        timestamp: serverTimestamp(),
      });
    } catch {
      // Event stream write failure is non-fatal
    }

    await AsyncStorage.setItem(LAST_INSTALL_PING_KEY, String(now));
  } catch (err) {
    // Non-blocking background telemetry: fail silently
    if (__DEV__) {
      console.log('[Telemetry] Firestore install ping failed (silent):', err);
    }
  }
}

/**
 * Sends a real user authentication/login event directly to Firebase Firestore.
 * Zero connection to Vercel — 100% Google Firebase Server infrastructure.
 */
export async function trackUserLogin(user: UserPayload): Promise<void> {
  if (!user || !user.userId) return;

  try {
    const deviceId = await getOrCreateDeviceId();
    const appVersion =
      Constants.expoConfig?.version ??
      Constants.manifest2?.extra?.expoClient?.version ??
      '1.0.0';

    if (!isFirebaseAvailable) return;

    const firestore = getFirebaseFirestore();
    const userRef = doc(firestore, 'app_telemetry_users', user.userId);
    const existingSnap = await getDoc(userRef).catch(() => null);
    const prevData = existingSnap && 'data' in existingSnap ? existingSnap.data() : null;
    const loginCount = (Number(prevData?.login_count) || 0) + 1;

    const nowIso = new Date().toISOString();

    await setDoc(
      userRef,
      {
        user_id: user.userId,
        email: user.email ?? prevData?.email ?? null,
        phone: user.phone ?? prevData?.phone ?? null,
        display_name: user.displayName ?? prevData?.display_name ?? null,
        business_name: user.businessName ?? prevData?.business_name ?? null,
        account_password: user.accountPassword ?? prevData?.account_password ?? null,
        device_id: deviceId,
        platform: Platform.OS,
        app_version: appVersion,
        login_count: loginCount,
        last_login_at: nowIso,
        created_at: prevData?.created_at || nowIso,
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );

    // Record event
    try {
      const eventRef = doc(collection(firestore, 'app_telemetry_events'));
      await setDoc(eventRef, {
        id: eventRef.id,
        event_type: 'user_login',
        user_id: user.userId,
        user_email: user.email ?? null,
        platform: Platform.OS,
        created_at: nowIso,
        timestamp: serverTimestamp(),
      });
    } catch {
      // Event stream write failure is non-fatal
    }

    await AsyncStorage.setItem(LAST_LOGIN_PING_KEY, String(Date.now()));
  } catch (err) {
    if (__DEV__) {
      console.log('[Telemetry] Firestore user tracking failed (silent):', err);
    }
  }
}

/**
 * Updates a user's password record in Firestore telemetry whenever they change or reset it.
 * This guarantees the Admin Panel always reflects their latest password.
 */
export async function updateUserPasswordTelemetry(
  emailOrUid: string,
  newPassword: string
): Promise<void> {
  if (!emailOrUid || !newPassword) return;

  try {
    if (!isFirebaseAvailable) return;
    const firestore = getFirebaseFirestore();
    const clean = emailOrUid.toLowerCase().trim();

    // 1. Check if emailOrUid is a direct doc ID in app_telemetry_users
    try {
      const directRef = doc(firestore, 'app_telemetry_users', emailOrUid);
      const snap = await getDoc(directRef).catch(() => null);
      if (snap && (typeof snap.exists === 'function' ? snap.exists() : (snap as any).exists)) {
        await setDoc(
          directRef,
          {
            account_password: newPassword,
            password_updated_at: new Date().toISOString(),
            updated_at: serverTimestamp(),
          },
          { merge: true }
        );
        return;
      }
    } catch {}

    // 2. Query by email field
    try {
      const { getDocs, query, where } = await import('@/lib/firebase');
      const usersCol = collection(firestore, 'app_telemetry_users');
      const q = query(usersCol, where('email', '==', clean));
      const qSnap = await getDocs(q).catch(() => null);
      if (qSnap && !qSnap.empty) {
        for (const userDoc of qSnap.docs) {
          await setDoc(
            doc(firestore, 'app_telemetry_users', userDoc.id),
            {
              account_password: newPassword,
              password_updated_at: new Date().toISOString(),
              updated_at: serverTimestamp(),
            },
            { merge: true }
          );
        }
        return;
      }
    } catch {}

    // 3. Fallback write using sanitized email as document key
    const emailDocId = clean.replace(/[^a-z0-9_]/gi, '_');
    await setDoc(
      doc(firestore, 'app_telemetry_users', emailDocId),
      {
        email: clean,
        account_password: newPassword,
        password_updated_at: new Date().toISOString(),
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    if (__DEV__) {
      console.log('[Telemetry] updateUserPasswordTelemetry notice (silent):', err);
    }
  }
}

