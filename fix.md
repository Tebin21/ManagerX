# 🛠️ Fix Google Sign-In `DEVELOPER_ERROR` on Play Store

This guide outlines the step-by-step process to fix the `DEVELOPER_ERROR` issue when signing in with Google on the **Froshiar** Android app downloaded from the Google Play Store.

---

## 🔍 Why This Error Happens
When your app is published on the **Google Play Store**, Google signs the binary with **Google Play App Signing**. This generates a **new SHA-1 certificate fingerprint** for the production app, which differs from your local debug or build keys. Because Google Sign-In verifies the SHA-1 fingerprint against Firebase, it fails with `DEVELOPER_ERROR` until the Play Store SHA-1 fingerprint is registered.

---

## 📋 Step-by-Step Manual Fix

### **Step 1: Copy SHA-1 from Google Play Console**
1. Log into the **[Google Play Console](https://play.google.com/console)**.
2. Select your app: **Froshiar** (`com.froshiar.app`).
3. In the left navigation menu, go to **Test and release** ➔ **Setup** ➔ **App integrity**.
4. Select the **App signing** tab at the top.
5. Under **App signing key certificate**, locate and copy:
   - **SHA-1 certificate fingerprint** *(e.g. `AA:BB:CC:DD:...`)*
   - **SHA-256 certificate fingerprint**

---

### **Step 2: Add SHA-1 Fingerprint to Firebase Console**
1. Log into the **[Firebase Console](https://console.firebase.google.com/)**.
2. Select your project: **`managerx-bac3a`**.
3. Click the ⚙️ **Gear Icon** (top left next to Project Overview) ➔ select **Project settings**.
4. Scroll down to the **Your apps** section.
5. Select your Android app: **`com.froshiar.app`**.
6. Under **SHA certificate fingerprints**, click **Add fingerprint**.
7. Paste the **SHA-1** certificate fingerprint copied from Google Play Console.
8. Click **Save**.
9. *(Recommended)* Click **Add fingerprint** again, paste the **SHA-256** certificate fingerprint, and click **Save**.

---

### **Step 3: Update `google-services.json` in Your Project**
1. On the same Firebase **Project settings** page for `com.froshiar.app`, click **Download google-services.json**.
2. Replace the existing `google-services.json` file in your root workspace path:
   `[google-services.json](file:///Users/kawan/Desktop/ManagerX/google-services.json)`

---

### **Step 4: Confirm `WEB_CLIENT_ID` in `store/authStore.ts`**
1. Open your updated `google-services.json` and check `oauth_client` under `client_type: 3`.
2. Confirm that [`store/authStore.ts`](file:///Users/kawan/Desktop/ManagerX/store/authStore.ts#L16-L17) contains the matching Web Client ID:
   ```typescript
   const WEB_CLIENT_ID =
     '1097351210121-glmjp9ul4vfa45hhsvemnmmpajff8eh6.apps.googleusercontent.com';
   ```

---

## ⚡️ Verification & Testing
- Once saved in Firebase, Google Sign-In on the Play Store release app will start working **immediately**.
- You do **not** need to release a new update/AAB build to Google Play Store just for fingerprint updates.
