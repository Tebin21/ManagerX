// Web stub — @react-native-firebase has no web implementation; Firebase Auth is mobile-only.

export const isFirebaseAvailable = false;

export function getFirebaseAuth(): never {
  throw new Error('Firebase Auth is not available on web.');
}

export function onAuthStateChanged(_auth: never, callback: (user: null) => void): () => void {
  callback(null);
  return () => {};
}

export function signInWithCredential(): Promise<never> {
  return Promise.reject(new Error('Firebase Auth is not available on web.'));
}

export function signOut(): Promise<void> {
  return Promise.resolve();
}

export const GoogleAuthProvider = {
  credential(): never {
    throw new Error('Firebase Auth is not available on web.');
  },
};
