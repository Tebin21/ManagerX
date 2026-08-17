import { getApps, getApp } from '@react-native-firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  AppleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

export const isFirebaseAvailable = true;

export { onAuthStateChanged, signInWithCredential, GoogleAuthProvider, AppleAuthProvider };
export { firebaseSignOut as signOut };
export { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile };
export { collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch, onSnapshot, serverTimestamp, query, where };

export function getFirebaseAuth(): FirebaseAuthTypes.Module {
  if (getApps().length === 0) {
    throw new Error(
      'Firebase native app "[DEFAULT]" is not initialized. The native build is missing ' +
        'or has a stale GoogleService-Info.plist/google-services.json. Rebuild the dev ' +
        'client (expo prebuild --clean + reinstall) — a Metro/JS reload alone cannot fix this.'
    );
  }
  return getAuth(getApp());
}

export function getFirebaseFirestore(): FirebaseFirestoreTypes.Module {
  if (getApps().length === 0) {
    throw new Error(
      'Firebase native app "[DEFAULT]" is not initialized. The native build is missing ' +
        'or has a stale GoogleService-Info.plist/google-services.json. Rebuild the dev ' +
        'client (expo prebuild --clean + reinstall) — a Metro/JS reload alone cannot fix this.'
    );
  }
  return getFirestore(getApp());
}
