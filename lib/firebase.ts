import { getApps, getApp } from '@react-native-firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';

export const isFirebaseAvailable = true;

export { onAuthStateChanged, signInWithCredential, GoogleAuthProvider };
export { firebaseSignOut as signOut };

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
