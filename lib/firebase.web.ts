import { Platform } from 'react-native';

// Firebase Web Auth Implementation
// Uses Firebase Authentication REST API so authentication works seamlessly across Web and Desktop (Electron).
const FIREBASE_API_KEY = 'AIzaSyAPt_45ZxiC6VZALYX65NN_igouWJ-Qpjo';
const BASE_AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';

export const isFirebaseAvailable = true;

export interface WebUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  providerData: Array<{ providerId: string }>;
  _idToken?: string;
  _refreshToken?: string;
  getIdToken: () => Promise<string>;
  reload: () => Promise<void>;
}

let currentWebUser: WebUser | null = null;
const authListeners = new Set<(user: WebUser | null) => void>();

function notifyAuthListeners() {
  authListeners.forEach((listener) => {
    try {
      listener(currentWebUser);
    } catch (e) {
      console.warn('[FirebaseWeb] Auth listener error:', e);
    }
  });
}

function parseFirebaseError(data: any): Error {
  const rawMsg = data?.error?.message || 'UNKNOWN_ERROR';
  const err: any = new Error(rawMsg);
  if (rawMsg.includes('EMAIL_NOT_FOUND')) {
    err.code = 'auth/user-not-found';
  } else if (rawMsg.includes('INVALID_PASSWORD') || rawMsg.includes('INVALID_LOGIN_CREDENTIALS')) {
    err.code = 'auth/wrong-password';
  } else if (rawMsg.includes('USER_DISABLED')) {
    err.code = 'auth/user-disabled';
  } else if (rawMsg.includes('EMAIL_EXISTS')) {
    err.code = 'auth/email-already-in-use';
  } else if (rawMsg.includes('OPERATION_NOT_ALLOWED')) {
    err.code = 'auth/operation-not-allowed';
  } else if (rawMsg.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
    err.code = 'auth/too-many-requests';
  } else if (rawMsg.includes('WEAK_PASSWORD')) {
    err.code = 'auth/weak-password';
  } else if (rawMsg.includes('INVALID_EMAIL')) {
    err.code = 'auth/invalid-email';
  } else {
    err.code = 'auth/invalid-credential';
  }
  return err;
}

function createWebUser(data: any): WebUser {
  return {
    uid: data.localId || data.userId || 'web_user_' + Date.now(),
    email: data.email || null,
    displayName: data.displayName || null,
    photoURL: data.photoUrl || null,
    phoneNumber: data.phoneNumber || null,
    emailVerified: Boolean(data.emailVerified),
    providerData: [{ providerId: 'password' }],
    _idToken: data.idToken,
    _refreshToken: data.refreshToken,
    getIdToken: async () => data.idToken || '',
    reload: async () => {},
  };
}

export function getFirebaseAuth(): any {
  return {
    get currentUser() {
      return currentWebUser;
    },
  };
}

export function onAuthStateChanged(_auth: any, callback: (user: WebUser | null) => void): () => void {
  authListeners.add(callback);
  callback(currentWebUser);
  return () => {
    authListeners.delete(callback);
  };
}

export function signInWithCredential(): Promise<never> {
  return Promise.reject(new Error('Firebase signInWithCredential is not supported on web.'));
}

export async function signOut(): Promise<void> {
  currentWebUser = null;
  notifyAuthListeners();
}

export const GoogleAuthProvider = {
  credential(): never {
    throw new Error('GoogleAuthProvider.credential is mobile-only.');
  },
};

export const AppleAuthProvider = {
  credential(): never {
    throw new Error('AppleAuthProvider.credential is iOS-only.');
  },
};

export async function createUserWithEmailAndPassword(_auth: any, email: string, password: string): Promise<{ user: WebUser }> {
  try {
    const res = await fetch(`${BASE_AUTH_URL}:signUp?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password, returnSecureToken: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw parseFirebaseError(data);
    }
    const user = createWebUser(data);
    currentWebUser = user;
    notifyAuthListeners();
    return { user };
  } catch (err: any) {
    if (err.code) throw err;
    const networkErr: any = new Error(err.message || 'Network request failed');
    networkErr.code = 'auth/network-request-failed';
    throw networkErr;
  }
}

export async function signInWithEmailAndPassword(_auth: any, email: string, password: string): Promise<{ user: WebUser }> {
  try {
    const res = await fetch(`${BASE_AUTH_URL}:signInWithPassword?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password, returnSecureToken: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw parseFirebaseError(data);
    }
    const user = createWebUser(data);
    currentWebUser = user;
    notifyAuthListeners();
    return { user };
  } catch (err: any) {
    if (err.code) throw err;
    const networkErr: any = new Error(err.message || 'Network request failed');
    networkErr.code = 'auth/network-request-failed';
    throw networkErr;
  }
}

export async function signInWithIdToken(idToken: string): Promise<{ user: WebUser }> {
  try {
    const res = await fetch(`${BASE_AUTH_URL}:signInWithIdp?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postBody: `id_token=${idToken}&providerId=google.com`,
        requestUri: 'http://localhost',
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw parseFirebaseError(data);
    }
    const user = createWebUser(data);
    currentWebUser = user;
    notifyAuthListeners();
    return { user };
  } catch (err: any) {
    if (err.code) throw err;
    const networkErr: any = new Error(err.message || 'Network request failed');
    networkErr.code = 'auth/network-request-failed';
    throw networkErr;
  }
}

export async function sendPasswordResetEmail(_auth: any, email: string): Promise<void> {
  try {
    const res = await fetch(`${BASE_AUTH_URL}:sendOobCode?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: email.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw parseFirebaseError(data);
    }
  } catch (err: any) {
    if (err.code) throw err;
    const networkErr: any = new Error(err.message || 'Network request failed');
    networkErr.code = 'auth/network-request-failed';
    throw networkErr;
  }
}

export async function reload(_user: any): Promise<void> {
  // No-op on web
}

export async function updateProfile(user: WebUser, profile: { displayName?: string; photoURL?: string }): Promise<void> {
  if (profile.displayName) user.displayName = profile.displayName;
  if (profile.photoURL) user.photoURL = profile.photoURL;
  if (user._idToken) {
    try {
      await fetch(`${BASE_AUTH_URL}:update?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: user._idToken,
          displayName: profile.displayName || user.displayName,
          photoUrl: profile.photoURL || user.photoURL,
          returnSecureToken: true,
        }),
      });
    } catch {}
  }
  notifyAuthListeners();
}

export async function getIdToken(user: WebUser): Promise<string> {
  return user?._idToken || '';
}

// Cloud Firestore safe no-op stubs on Web (offline store model)
const dummyDocRef = { id: 'dummy', path: 'dummy' };
const dummySnapshot = {
  exists: () => false,
  data: () => null,
  id: 'dummy',
  empty: true,
  docs: [],
  size: 0,
};

export function getFirebaseFirestore(): any {
  return {
    collection: () => dummyDocRef,
    doc: () => dummyDocRef,
  };
}

export const collection = () => dummyDocRef;
export const doc = () => dummyDocRef;
export const getDoc = async () => dummySnapshot;
export const getDocs = async () => dummySnapshot;
export const setDoc = async () => {};
export const deleteDoc = async () => {};
export const writeBatch = () => ({
  set: () => {},
  delete: () => {},
  update: () => {},
  commit: async () => {},
});
export const onSnapshot = (_ref: any, callback?: any) => {
  if (typeof callback === 'function') {
    callback(dummySnapshot);
  }
  return () => {};
};
export const serverTimestamp = () => new Date();
export const query = () => dummyDocRef;
export const where = () => dummyDocRef;
