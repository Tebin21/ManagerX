import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getOrCreateDeviceId } from '@/lib/deviceId';

// Default Vercel production backend URL; can be overridden via EXPO_PUBLIC_TELEMETRY_URL
const TELEMETRY_URL =
  process.env.EXPO_PUBLIC_TELEMETRY_URL ||
  'https://froshiar-website.vercel.app';

const LAST_INSTALL_PING_KEY = '@froshiar_telemetry_last_install_ping';
const LAST_LOGIN_PING_KEY = '@froshiar_telemetry_last_login_ping';
const PING_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes cooldown for heartbeat

interface UserPayload {
  userId: string;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
  businessName?: string | null;
}

/**
 * Sends a real device ping upon application launch/open.
 * Tracks installs, opens, OS version, and hardware device ID.
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

    const appVersion =
      Constants.expoConfig?.version ??
      Constants.manifest2?.extra?.expoClient?.version ??
      '1.0.0';

    const payload = {
      deviceId,
      platform: Platform.OS,
      osVersion: String(Platform.Version ?? ''),
      appVersion,
      brand: Platform.OS === 'ios' ? 'Apple' : 'Android',
      modelName: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device',
      timestamp: new Date().toISOString(),
    };

    const url = `${TELEMETRY_URL.replace(/\/+$/, '')}/api/telemetry/install`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeout);

    if (response && response.ok) {
      await AsyncStorage.setItem(LAST_INSTALL_PING_KEY, String(now));
    }
  } catch (err) {
    // Non-blocking background telemetry: fail silently
    if (__DEV__) {
      console.log('[Telemetry] Ping failed (silent):', err);
    }
  }
}

/**
 * Sends a real user authentication/login event to the telemetry backend.
 * Records the user's UID, email, business name, and device.
 */
export async function trackUserLogin(user: UserPayload): Promise<void> {
  if (!user || !user.userId) return;

  try {
    const deviceId = await getOrCreateDeviceId();
    const appVersion =
      Constants.expoConfig?.version ??
      Constants.manifest2?.extra?.expoClient?.version ??
      '1.0.0';

    const payload = {
      userId: user.userId,
      email: user.email ?? null,
      phone: user.phone ?? null,
      displayName: user.displayName ?? null,
      businessName: user.businessName ?? null,
      deviceId,
      platform: Platform.OS,
      appVersion,
      timestamp: new Date().toISOString(),
    };

    const url = `${TELEMETRY_URL.replace(/\/+$/, '')}/api/telemetry/login`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeout);
    await AsyncStorage.setItem(LAST_LOGIN_PING_KEY, String(Date.now()));
  } catch (err) {
    // Non-blocking
    if (__DEV__) {
      console.log('[Telemetry] User tracking failed (silent):', err);
    }
  }
}
