/**
 * Firebase Config Storage - JSON File Only
 * Reads/writes from public/firebase-config.json
 * Simple file-based config shared by all users
 */

export interface FirebaseConfigData {
  configured: boolean;
  firebaseApiKey: string;
  firebaseProjectId: string;
  firebaseAppId: string;
  firebaseAuthDomain: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseMeasurementId?: string;
}

const CONFIG_URL = "/firebase-config.json";

/**
 * Read Firebase config from JSON file
 */
export async function getFirebaseConfig(): Promise<FirebaseConfigData | null> {
  try {
    const response = await fetch(CONFIG_URL);
    if (!response.ok) return null;
    
    const config = await response.json() as FirebaseConfigData;
    
    // Check if configured
    if (config.configured && config.firebaseApiKey && config.firebaseProjectId && config.firebaseAppId) {
      return config;
    }
    return null;
  } catch (error) {
    console.error("Error reading firebase config:", error);
    return null;
  }
}

/**
 * Check if config is configured
 */
export async function isConfigured(): Promise<boolean> {
  const config = await getFirebaseConfig();
  return config !== null;
}

/**
 * Save Firebase config to JSON file (requires backend)
 * Client-side only approach: return the config object
 */
export function prepareConfigForSave(config: FirebaseConfigData): FirebaseConfigData {
  return {
    ...config,
    configured: true,
  };
}
