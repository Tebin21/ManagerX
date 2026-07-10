import { NativeModules } from 'react-native';

// IMPORTANT: @react-native-community/netinfo's index.js requires
// ./internal/nativeInterface, which throws synchronously — "NativeModule.RNCNetInfo is
// null" — the instant it's evaluated, if the native module isn't compiled into the
// running binary (e.g. a dev-client/APK built before this dependency was added). A
// plain `import NetInfo from '@react-native-community/netinfo'` at the top of any file
// triggers that evaluation immediately and can crash the whole app at startup — this is
// not an Expo module, so it has no requireOptionalNativeModule equivalent of its own.
//
// Instead of importing the package directly anywhere, check the same native registry it
// reads (react-native's NativeModules, a plain object — reading a missing key never
// throws) and only ever require() the package once that check has already confirmed it's
// safe. Mirrors the requireOptionalNativeModule strategy in lib/deviceId.ts, adapted for
// a non-Expo native module.
function isNetInfoLinked(): boolean {
  return !!NativeModules.RNCNetInfo;
}

let warnedOnce = false;

function warnUnavailableOnce(): void {
  if (__DEV__ && !warnedOnce) {
    warnedOnce = true;
    console.log(
      '[Froshiar] NetInfo unavailable (RNCNetInfo native module not linked) — ' +
      'connectivity-triggered sync is disabled until the next native rebuild; ' +
      'app-foreground sync still works as a fallback.'
    );
  }
}

// Subscribes to connectivity changes. Returns an unsubscribe function. If the native
// module isn't linked, this is a no-op (the listener is simply never invoked) instead of
// crashing the app.
export function addConnectivityListener(listener: (isConnected: boolean) => void): () => void {
  if (!isNetInfoLinked()) {
    warnUnavailableOnce();
    return () => {};
  }

  try {
    // Lazily required — only ever reached after isNetInfoLinked() has already proven
    // the native module is present, so the package's own throwing check never fires.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NetInfo = require('@react-native-community/netinfo').default;
    return NetInfo.addEventListener((state: { isConnected: boolean | null }) => {
      listener(!!state.isConnected);
    });
  } catch {
    warnUnavailableOnce();
    return () => {};
  }
}
