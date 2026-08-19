import admin from 'firebase-admin';
import { config } from './config';

// Using firebase-admin from a plain Node server (as opposed to Firebase Cloud
// Functions) does NOT require the Firebase Blaze billing plan — verifyIdToken()
// and auth().updateUser() are standard Firebase Authentication Admin operations,
// free on any plan. Only Cloud Functions itself requires Blaze, and this project
// deliberately avoids Cloud Functions entirely.
function loadServiceAccount(): admin.ServiceAccount {
  if (!config.firebaseServiceAccountJson) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON is not set. Generate one in the Firebase Console ' +
        `(Project Settings > Service Accounts > Generate new private key) for project ` +
        `"${config.firebaseProjectId}" and set its full JSON contents as this env var ` +
        '(or the firebaseServiceAccountJson field in config.local.json for local dev).'
    );
  }
  try {
    return JSON.parse(config.firebaseServiceAccountJson);
  } catch (e) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ' + (e instanceof Error ? e.message : String(e))
    );
  }
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount()),
    projectId: config.firebaseProjectId,
  });
}

export { admin };
export const auth = admin.auth();
export const firestore = admin.firestore();
