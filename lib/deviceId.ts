import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import nacl from 'tweetnacl';
import { saveSetting, loadSetting } from '@/lib/sqlite';
import { bytesToBase64, asciiToBytes, DEVICE_PREFIX } from '@/lib/license/licenseCore';

const SETTING_KEY = 'device_id';

interface ExpoApplicationNativeModule {
  androidId?: string | null;
  getIosIdForVendorAsync?: () => Promise<string | null>;
}

// Memoized so the (potential) unavailability is only logged once per app session,
// not once per getOrCreateDeviceId() call. `undefined` means "not looked up yet" —
// distinct from `null`, which means "looked up, genuinely unavailable".
let nativeModule: ExpoApplicationNativeModule | null | undefined;

// IMPORTANT: expo-application's own entry point (Application.js -> ExpoApplication.js)
// calls expo-modules-core's requireNativeModule('ExpoApplication') at module-evaluation
// time, which throws synchronously — "Cannot find native module 'ExpoApplication'" — if
// the native module isn't compiled into the running binary (e.g. a dev-client/APK/IPA
// built before this dependency was added). Importing 'expo-application' at all — even
// via a dynamic import() wrapped in try/catch — risks that throw escaping as an uncaught
// startup crash depending on the bundler's module-evaluation timing. Going straight
// through expo-modules-core's requireOptionalNativeModule() instead avoids the throwing
// code path entirely: it returns null and only logs a warning when the module is missing.
function getNativeModule(): ExpoApplicationNativeModule | null {
  if (nativeModule === undefined) {
    nativeModule = requireOptionalNativeModule<ExpoApplicationNativeModule>('ExpoApplication');
    if (__DEV__) {
      console.log(
        nativeModule
          ? '[ManagerX] Hardware Device ID available — using ExpoApplication.'
          : '[ManagerX] Hardware Device ID unavailable (ExpoApplication native module not linked) — using fallback Device ID.'
      );
    }
  }
  return nativeModule;
}

function formatFriendlyId(hash: Uint8Array): string {
  const raw = bytesToBase64(hash.slice(0, 8))
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .padEnd(8, '0')
    .slice(0, 8);
  return `${DEVICE_PREFIX}${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

async function readRawPlatformId(): Promise<string> {
  const Application = getNativeModule();
  if (Application) {
    try {
      if (Platform.OS === 'android') {
        const id = Application.androidId;
        if (id) return id;
      } else if (Platform.OS === 'ios') {
        const id = await Application.getIosIdForVendorAsync?.();
        if (id) return id;
      }
    } catch {
      // Module loaded fine but the call itself failed (e.g. rare native-side edge
      // case) — fall through to the fallback below, never block the user.
    }
  }
  return `FALLBACK-${Date.now()}-${Math.random()}`;
}

export async function getOrCreateDeviceId(): Promise<string> {
  const cached = await loadSetting(SETTING_KEY);
  if (cached) return cached;

  const rawId = await readRawPlatformId();
  const hash = nacl.hash(asciiToBytes(rawId));
  const friendly = formatFriendlyId(hash);

  await saveSetting(SETTING_KEY, friendly);
  return friendly;
}
