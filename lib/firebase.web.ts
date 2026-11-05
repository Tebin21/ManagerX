import { Platform } from 'react-native';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection as fsCollection,
  doc as fsDoc,
  getDoc as fsGetDoc,
  getDocs as fsGetDocs,
  setDoc as fsSetDoc,
  deleteDoc as fsDeleteDoc,
  writeBatch as fsWriteBatch,
  onSnapshot as fsOnSnapshot,
  serverTimestamp as fsServerTimestamp,
  query as fsQuery,
  where as fsWhere,
  type Firestore,
} from 'firebase/firestore';

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

let _dedicatedWebAuth: any = null;

export async function signInWithGoogleWeb(): Promise<{ user: WebUser }> {
  const { initializeApp, getApps } = await import('firebase/app');
  const {
    initializeAuth,
    getAuth,
    signInWithPopup,
    GoogleAuthProvider: WebGoogleAuthProvider,
    inMemoryPersistence,
    browserLocalPersistence,
    browserPopupRedirectResolver,
  } = await import('firebase/auth');

  if (!_dedicatedWebAuth) {
    const existing = getApps().find((a) => a.name === 'froshiar_web_auth');
    const app =
      existing ||
      initializeApp(
        {
          apiKey: FIREBASE_API_KEY,
          authDomain: 'managerx-bac3a.firebaseapp.com',
          projectId: 'managerx-bac3a',
          storageBucket: 'managerx-bac3a.firebasestorage.app',
          messagingSenderId: '1097351210121',
          appId: '1:1097351210121:web:760994c20ecc605e641258',
        },
        'froshiar_web_auth'
      );

    try {
      _dedicatedWebAuth = initializeAuth(app, {
        persistence: [browserLocalPersistence, inMemoryPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
      });
    } catch {
      _dedicatedWebAuth = getAuth(app);
    }
  }

  const provider = new WebGoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  let result: any = null;
  try {
    result = await signInWithPopup(_dedicatedWebAuth, provider, browserPopupRedirectResolver);
  } catch (err: any) {
    if (err?.message?.includes('Database is closing/hidden') || err?.message?.includes('closing')) {
      await new Promise((r) => setTimeout(r, 600));
      result = await signInWithPopup(_dedicatedWebAuth, provider, browserPopupRedirectResolver);
    } else {
      throw err;
    }
  }

  const fbUser = result.user;
  const token = await fbUser.getIdToken();

  const user: WebUser = {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName,
    photoURL: fbUser.photoURL,
    phoneNumber: fbUser.phoneNumber,
    emailVerified: fbUser.emailVerified,
    providerData: (fbUser.providerData || []).map((p: any) => ({ providerId: p.providerId })),
    _idToken: token,
    _refreshToken: (fbUser as any).refreshToken,
    getIdToken: async () => token,
    reload: async () => {},
  };

  currentWebUser = user;
  notifyAuthListeners();
  return { user };
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

// Cloud Firestore Web & Desktop Implementation
const WEB_FIREBASE_CONFIG = {
  apiKey: FIREBASE_API_KEY,
  authDomain: 'managerx-bac3a.firebaseapp.com',
  projectId: 'managerx-bac3a',
  storageBucket: 'managerx-bac3a.firebasestorage.app',
  messagingSenderId: '1097351210121',
  appId: '1:1097351210121:web:froshiar',
};

let _webFirestore: Firestore | null = null;

export function getFirebaseFirestore(): Firestore {
  try {
    if (!_webFirestore) {
      const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(WEB_FIREBASE_CONFIG);
      _webFirestore = getFirestore(app);
    }
    return _webFirestore;
  } catch (e) {
    console.warn('[FirebaseWeb] getFirebaseFirestore init error:', e);
    const app: FirebaseApp = initializeApp(WEB_FIREBASE_CONFIG, 'froshiar_firestore_app');
    _webFirestore = getFirestore(app);
    return _webFirestore;
  }
}

export const collection = (dbOrRef: any, ...pathSegments: string[]) => {
  try {
    const target = dbOrRef?.id ? dbOrRef : getFirebaseFirestore();
    return (fsCollection as any)(target, ...pathSegments);
  } catch (e) {
    console.warn('[FirebaseWeb] collection call fallback:', e);
    return { id: pathSegments[pathSegments.length - 1] || 'col', path: pathSegments.join('/') } as any;
  }
};

export const doc = (dbOrRef: any, ...pathSegments: string[]) => {
  try {
    const target = dbOrRef?.id ? dbOrRef : getFirebaseFirestore();
    return fsDoc(target, ...pathSegments);
  } catch (e) {
    console.warn('[FirebaseWeb] doc call fallback:', e);
    return { id: pathSegments[pathSegments.length - 1] || 'doc', path: pathSegments.join('/') } as any;
  }
};

export const getDoc = async (docRef: any) => {
  try {
    return await fsGetDoc(docRef);
  } catch (e) {
    console.warn('[FirebaseWeb] getDoc failed:', e);
    return {
      exists: () => false,
      data: () => null,
      id: docRef?.id || '',
    } as any;
  }
};

export const getDocs = async (queryRef: any) => {
  try {
    return await fsGetDocs(queryRef);
  } catch (e) {
    console.warn('[FirebaseWeb] getDocs failed:', e);
    return { docs: [], empty: true, size: 0, forEach: () => {} } as any;
  }
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
  try {
    return await fsSetDoc(docRef, data, options || {});
  } catch (e) {
    console.warn('[FirebaseWeb] setDoc failed:', e);
  }
};

export const deleteDoc = async (docRef: any) => {
  try {
    return await fsDeleteDoc(docRef);
  } catch (e) {
    console.warn('[FirebaseWeb] deleteDoc failed:', e);
  }
};

export const writeBatch = (db?: any) => {
  try {
    return fsWriteBatch(db || getFirebaseFirestore());
  } catch (e) {
    return {
      set: () => {},
      delete: () => {},
      update: () => {},
      commit: async () => {},
    } as any;
  }
};

export const onSnapshot = (ref: any, callback?: any, errorCallback?: any) => {
  try {
    return fsOnSnapshot(
      ref,
      (snap: any) => {
        if (typeof callback === 'function') callback(snap);
      },
      (err: any) => {
        console.warn('[FirebaseWeb] onSnapshot live update error:', err);
        if (typeof errorCallback === 'function') errorCallback(err);
      }
    );
  } catch (e) {
    console.warn('[FirebaseWeb] onSnapshot subscription failed:', e);
    return () => {};
  }
};

export const serverTimestamp = () => {
  try {
    return fsServerTimestamp();
  } catch {
    return new Date();
  }
};

export const query = (colRef: any, ...clauses: any[]) => {
  try {
    return fsQuery(colRef, ...clauses);
  } catch {
    return colRef;
  }
};

export const where = (field: string, op: any, value: any) => {
  try {
    return fsWhere(field, op, value);
  } catch {
    return null as any;
  }
};
