import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
import { saveFCMToken } from "./firebaseOps";

let messaging: Messaging | null = null;
let appInitialized = false;

export async function initializeNotifications(firebaseConfig: any) {
  try {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('✅ Service Worker registered');

        // Send Firebase config to Service Worker
        if (registration.active) {
          registration.active.postMessage({
            type: 'INIT_FIREBASE',
            config: firebaseConfig
          });
        }
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }

    // Initialize Firebase app if not already done
    if (firebaseConfig && !appInitialized) {
      const app = initializeApp(firebaseConfig);
      messaging = getMessaging(app);
      appInitialized = true;
      console.log('✅ Firebase Messaging initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing notifications:', error);
  }
}

export async function requestNotificationPermission(): Promise<string | null> {
  try {
    if (!('Notification' in window)) {
      console.log('⚠️ Browser does not support notifications');
      return null;
    }

    if (Notification.permission === 'granted') {
      console.log('✅ Notification permission already granted');
      return await getFCMToken();
    }

    if (Notification.permission === 'denied') {
      console.log('⚠️ Notification permission denied');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      return await getFCMToken();
    }

    console.log('⚠️ Notification permission not granted');
    return null;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return null;
  }
}

export async function getFCMToken(): Promise<string | null> {
  try {
    if (!messaging) {
      console.warn('⚠️ Messaging not initialized');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: 'BE7rM5Nq_L8c9QX3Y6K2P1M4W8S3A9J6V5Z0C4D7E2F8L3N1R6T9U2X5Y0B3'
    });

    if (token) {
      console.log('✅ FCM Token received:', token.substring(0, 20) + '...');
      return token;
    }

    console.log('⚠️ Unable to get FCM token');
    return null;
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
}

export function setupOnMessageListener(callback: (payload: any) => void) {
  try {
    if (!messaging) {
      console.warn('⚠️ Messaging not initialized');
      return;
    }

    // Handle foreground messages
    onMessage(messaging, (payload) => {
      console.log('📬 Foreground message received:', payload);
      
      // Show notification even in foreground
      if (payload.notification) {
        new Notification(payload.notification.title || 'Flux Wallet', {
          body: payload.notification.body,
          icon: payload.notification.icon || '/favicon.png',
          badge: '/favicon.png',
          tag: payload.data?.orderId || 'notification',
          data: payload.data,
        });
      }

      callback(payload);
    });

    console.log('✅ Message listener setup complete');
  } catch (error) {
    console.error('❌ Error setting up message listener:', error);
  }
}
