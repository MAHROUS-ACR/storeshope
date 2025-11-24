/**
 * Firebase Config Storage - Environment Variables Only
 * Simple: read from env vars (import.meta.env)
 * If no env vars, show Setup page
 */

import { initializeApp, getApps } from "firebase/app";

export interface FirebaseConfigData {
  firebaseApiKey: string;
  firebaseProjectId: string;
  firebaseAppId: string;
  firebaseAuthDomain: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseMeasurementId?: string;
}

/**
 * Get config from environment variables
 */
export function getConfigFromEnv(): FirebaseConfigData | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;

  // Must have at least these 4 fields
  if (!apiKey || !projectId || !appId || !authDomain) {
    return null;
  }

  return {
    firebaseApiKey: apiKey,
    firebaseProjectId: projectId,
    firebaseAppId: appId,
    firebaseAuthDomain: authDomain,
    firebaseStorageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    firebaseMeasurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
}

/**
 * Check if Firebase is configured
 */
export function isFirebaseConfigured(): boolean {
  return getConfigFromEnv() !== null;
}

/**
 * Initialize Firebase with config
 */
export function initializeFirebase(): boolean {
  try {
    const config = getConfigFromEnv();
    if (!config) return false;

    if (getApps().length === 0) {
      initializeApp({
        apiKey: config.firebaseApiKey,
        authDomain: config.firebaseAuthDomain,
        projectId: config.firebaseProjectId,
        storageBucket: config.firebaseStorageBucket || "",
        messagingSenderId: config.firebaseMessagingSenderId || "",
        appId: config.firebaseAppId,
        measurementId: config.firebaseMeasurementId,
      });
    }
    return true;
  } catch (error: any) {
    if (!error.message?.includes('duplicate-app')) {
      console.error("Error initializing Firebase:", error);
    }
    return false;
  }
}
