import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeNotifications, setupOnMessageListener } from "./lib/notificationUtils";

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase and notifications
async function setupApp() {
  try {
    // Initialize notifications with config
    await initializeNotifications(firebaseConfig);

    // Setup message listener
    setupOnMessageListener((payload) => {
      console.log("Notification received in foreground:", payload);
    });

    // Request permission after a short delay to not block app startup
    setTimeout(() => {
      import("./lib/notificationUtils").then(({ requestNotificationPermission }) => {
        requestNotificationPermission().catch(err => {
          console.log("Notification permission setup deferred");
        });
      });
    }, 2000);
  } catch (error) {
    console.log("Notification setup deferred:", error);
  }
}

setupApp();

createRoot(document.getElementById("root")!).render(<App />);
