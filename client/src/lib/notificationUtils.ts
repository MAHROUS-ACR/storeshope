import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
import { saveFCMToken } from "./firebaseOps";

let messaging: Messaging | null = null;
let appInitialized = false;

export async function initializeNotifications(firebaseConfig: any) {
  try {
    // Ensure firebase config has all required fields for messaging
    if (firebaseConfig && !firebaseConfig.messagingSenderId) {

    }
    
    // Initialize Firebase messaging only if not already done
    if (!appInitialized && firebaseConfig) {
      try {
        const app = initializeApp(firebaseConfig);
        messaging = getMessaging(app);
        appInitialized = true;

      } catch (error: any) {
        if (error.code === 'app/duplicate-app') {
          // App already initialized, get messaging from default app
          try {
            messaging = getMessaging();
            appInitialized = true;

          } catch (e) {

          }
        } else {

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


        // Wait a bit for Service Worker to activate, then send Firebase config
        setTimeout(() => {
          if (registration.active) {
            registration.active.postMessage({
              type: 'INIT_FIREBASE',
              config: firebaseConfig
            });
          } else if (registration.installing) {

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

      }
    }
  } catch (error) {

  }
}

export async function requestNotificationPermission(): Promise<string | null> {
  try {
    if (!('Notification' in window)) {

      return null;
    }

    if (Notification.permission === 'granted') {

      return await getFCMToken();
    }

    if (Notification.permission === 'denied') {

      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {

      return await getFCMToken();
    }


    return null;
  } catch (error) {

    return null;
  }
}

export async function getFCMToken(): Promise<string | null> {
  try {
    if (!messaging) {

      return null;
    }

    // Try with VAPID key from environment or try without it
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    
    const options: any = {};
    if (vapidKey) {
      options.vapidKey = vapidKey;

    } else {

    }

    const token = await getToken(messaging, options);

    if (token) {

      return token;
    }


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

      }
    }
  } catch (error) {

  }
}

export function setupOnMessageListener(callback: (payload: any) => void) {
  try {
    if (!messaging) {

      return;
    }

    // Handle foreground messages
    onMessage(messaging, (payload) => {

      
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


  } catch (error) {

  }
}
