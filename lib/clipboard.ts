import { requireOptionalNativeModule } from 'expo-modules-core';

interface ExpoClipboardNativeModule {
  setStringAsync?: (text: string, options?: Record<string, unknown>) => Promise<boolean>;
}

// Memoized so the (potential) unavailability is only logged once per app session —
// same reasoning as lib/deviceId.ts.
let nativeModule: ExpoClipboardNativeModule | null | undefined;

// IMPORTANT: expo-clipboard's own entry point (Clipboard.js -> ExpoClipboard.js) calls
// expo-modules-core's requireNativeModule('ExpoClipboard') at module-evaluation time,
// which throws synchronously — "Cannot find native module 'ExpoClipboard'" — if the
// native module isn't compiled into the running binary (e.g. a dev-client/APK/IPA built
// before this dependency was added). Importing 'expo-clipboard' at all — even via a
// dynamic import() wrapped in try/catch — risks that throw escaping as an uncaught
// startup crash depending on the bundler's module-evaluation timing. Going straight
// through expo-modules-core's requireOptionalNativeModule() instead avoids the throwing
// code path entirely: it returns null and only logs a warning when the module is missing.
// Same strategy as lib/deviceId.ts uses for ExpoApplication — never import 'expo-clipboard'
// directly anywhere in the app.
function getNativeModule(): ExpoClipboardNativeModule | null {
  if (nativeModule === undefined) {
    nativeModule = requireOptionalNativeModule<ExpoClipboardNativeModule>('ExpoClipboard');
    if (__DEV__) {
      console.log(
        nativeModule
          ? '[Froshiar] Clipboard available — using ExpoClipboard.'
          : '[Froshiar] Clipboard unavailable (ExpoClipboard native module not linked) — copy actions will report failure instead of crashing.'
      );
    }
  }
  return nativeModule;
}

// Copies text to the system clipboard. Returns true on success, false if the native
// module isn't linked (needs a rebuild) or the copy call itself failed — callers must
// treat false as "couldn't copy" and offer a fallback (e.g. show the link so the user
// can copy it manually) rather than assume it always works.
export async function copyToClipboard(text: string): Promise<boolean> {
  const ExpoClipboard = getNativeModule();
  if (!ExpoClipboard?.setStringAsync) return false;
  try {
    await ExpoClipboard.setStringAsync(text, {});
    return true;
  } catch {
    return false;
  }
}
