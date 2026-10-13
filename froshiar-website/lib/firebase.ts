import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAPt_45ZxiC6VZALYX65NN_igouWJ-Qpjo',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'managerx-bac3a.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'managerx-bac3a',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'managerx-bac3a.firebasestorage.app',
  messagingSenderId: '1097351210121',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1097351210121:web:froshiar',
};

let _firestore: Firestore | null = null;

export function getClientFirestore(): Firestore | null {
  try {
    if (!_firestore) {
      const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      _firestore = getFirestore(app);
    }
    return _firestore;
  } catch {
    return null;
  }
}
