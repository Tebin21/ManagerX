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

export const AppleAuthProvider = {
  credential(): never {
    throw new Error('Firebase Auth is not available on web.');
  },
};

export function createUserWithEmailAndPassword(): Promise<never> {
  return Promise.reject(new Error('Firebase Auth is not available on web.'));
}

export function signInWithEmailAndPassword(): Promise<never> {
  return Promise.reject(new Error('Firebase Auth is not available on web.'));
}

export function sendPasswordResetEmail(): Promise<never> {
  return Promise.reject(new Error('Firebase Auth is not available on web.'));
}

export function reload(): Promise<never> {
  return Promise.reject(new Error('Firebase Auth is not available on web.'));
}

export function updateProfile(): Promise<never> {
  return Promise.reject(new Error('Firebase Auth is not available on web.'));
}

export function getIdToken(): Promise<never> {
  return Promise.reject(new Error('Firebase Auth is not available on web.'));
}

export function getFirebaseFirestore(): never {
  throw new Error('Cloud Firestore is not available on web.');
}

// Cloud Firestore modular-API stubs — every cloud sync entry point (lib/cloudSync/*)
// checks isFirebaseAvailable before calling any of these, so throwing here is only
// ever a defensive backstop, not a path expected to run on web.
function unavailable(): never {
  throw new Error('Cloud Firestore is not available on web.');
}
export const collection = unavailable;
export const doc = unavailable;
export const getDoc = unavailable;
export const getDocs = unavailable;
export const setDoc = unavailable;
export const deleteDoc = unavailable;
export const writeBatch = unavailable;
export const onSnapshot = unavailable;
export const serverTimestamp = unavailable;
export const query = unavailable;
export const where = unavailable;
