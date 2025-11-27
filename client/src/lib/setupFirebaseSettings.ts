import { getFirestore, doc, setDoc } from "firebase/firestore";

export async function setupFirebaseSettingsFromEnv() {
  try {
    const db = getFirestore();
    
    // Get values from Vite environment variables (only VITE_* are accessible)
    const firebaseSettings = {
      firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
      firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
      firebaseAppId: import.meta.env.VITE_FIREBASE_APP_ID || "",
      firebaseAuthDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
      firebaseStorageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
      firebaseMessagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      firebaseMeasurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
      // Note: FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL are server-side only
      // They must be entered manually in the Settings page
      clientEmail: "",
      privateKey: "",
      updatedAt: new Date(),
    };

    // Save to Firestore
    const firebaseConfigRef = doc(db, "settings", "firebase");
    await setDoc(firebaseConfigRef, firebaseSettings, { merge: true });
    

    return true;
  } catch (error) {

    return false;
  }
}
