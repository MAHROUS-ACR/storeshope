import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
import { saveFCMToken } from "./firebaseOps";

let messaging: Messaging | null = null;
let appInitialized = false;

export async function initializeNotifications(firebaseConfig: any) {
  try {
    // Initialize Firebase messaging only if not already done
    if (!appInitialized && firebaseConfig) {
      try {
        const app = initializeApp(firebaseConfig);
        messaging = getMessaging(app);
        appInitialized = true;
        console.log('✅ Firebase Messaging initialized');
      } catch (error: any) {
        if (error.code === 'app/duplicate-app') {
          // App already initialized, get messaging from default app
          try {
            messaging = getMessaging();
            appInitialized = true;
            console.log('✅ Firebase Messaging retrieved from existing app');
          } catch (e) {
            console.warn('⚠️ Could not initialize messaging:', e);
          }
        } else {
          console.error('❌ Firebase initialization error:', error);
          throw error;
        }
      }
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      try {
        const basePath = import.meta.env.BASE_URL || '/';
        const swPath = `${basePath}firebase-messaging-sw.js`;
        const scope = basePath;
        const registration = await navigator.serviceWorker.register(swPath, {
          scope: scope
        });
        console.log('✅ Service Worker registered at:', swPath);

        // Wait a bit for Service Worker to activate, then send Firebase config
        setTimeout(() => {
          if (registration.active) {
            registration.active.postMessage({
              type: 'INIT_FIREBASE',
              config: firebaseConfig
            });
          } else if (registration.installing) {
            console.log('⚠️ Service Worker still installing, waiting...');
            registration.installing.addEventListener('statechange', function() {
              if (this.state === 'activated' && registration.active) {
                registration.active.postMessage({
                  type: 'INIT_FIREBASE',
                  config: firebaseConfig
                });
              }
            });
          }
        }, 100);
      } catch (error) {
        console.log('⚠️ Service Worker registration skipped:', error);
      }
    }
  } catch (error) {
    console.error('❌ Error in notifications setup:', error);
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

    // Try with VAPID key from environment or try without it
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    
    const options: any = {};
    if (vapidKey) {
      options.vapidKey = vapidKey;
      console.log('📍 Using VAPID key from environment');
    } else {
      console.log('📍 Attempting to get token without explicit VAPID key');
    }

    const token = await getToken(messaging, options);

    if (token) {
      console.log('✅ FCM Token received:', token.substring(0, 20) + '...');
      return token;
    }

    console.log('⚠️ Unable to get FCM token - no token returned');
    return null;
  } catch (error: any) {
    console.error('❌ Error getting FCM token:', {
      message: error?.message,
      code: error?.code,
      details: String(error)
    });
    return null;
  }
}

export function playNotificationSound() {
  try {
    // Play notification sound
    const audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
    audio.play().catch(e => console.log('Could not play sound:', e));
    
    // Alternative: Use Web Audio API to create a beep if audio fails
    if (!audio.canPlayType('audio/wav')) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (e) {
        console.log('Web Audio API not available');
      }
    }
  } catch (error) {
    console.log('⚠️ Could not play notification sound:', error);
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
      
      // Play notification sound
      playNotificationSound();
      
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
