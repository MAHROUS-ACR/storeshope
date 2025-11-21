import admin from "firebase-admin";

let firebaseInitialized = false;

export function initializeFirebase(projectId: string, privateKey: string, clientEmail: string) {
  if (firebaseInitialized) {
    return admin.app();
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        clientEmail,
      }),
    });
    
    firebaseInitialized = true;
    return app;
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    throw error;
  }
}

export function getFirestore() {
  if (!firebaseInitialized) {
    throw new Error("Firebase not initialized. Please configure Firebase settings first.");
  }
  return admin.firestore();
}

export function getAuth() {
  if (!firebaseInitialized) {
    throw new Error("Firebase not initialized. Please configure Firebase settings first.");
  }
  return admin.auth();
}

export function isFirebaseConfigured() {
  return firebaseInitialized;
}
