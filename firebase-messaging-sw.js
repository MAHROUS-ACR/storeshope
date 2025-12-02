// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Initialize Firebase with default config (will be passed from client)
let firebaseApp;
let messaging;

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

// Handle incoming messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INIT_FIREBASE') {
    const config = event.data.config;
    
    try {
      firebaseApp = firebase.initializeApp(config);
      messaging = firebase.messaging(firebaseApp);
      console.log('✅ Firebase initialized in Service Worker');
      setupBackgroundMessages();
    } catch (error) {
      console.error('❌ Failed to initialize Firebase in SW:', error);
    }
  }
});

// Setup background message handler
function setupBackgroundMessages() {
  if (!firebase.messaging.isSupported()) {
    console.log('⚠️ Firebase Messaging not supported');
    return;
  }

  if (!messaging) {
    console.warn('⚠️ Messaging not available yet');
    return;
  }

  try {
    messaging.onBackgroundMessage((payload) => {
      console.log('Received background message:', payload);
      
      const notificationTitle = payload.notification?.title || 'Flux Wallet';
      const notificationOptions = {
        body: payload.notification?.body,
        icon: payload.notification?.icon || '/storeshope/favicon.png',
        badge: '/storeshope/favicon.png',
        tag: payload.data?.orderId || 'notification',
        data: payload.data,
        click_action: payload.data?.click_action || '/storeshope/',
        requireInteraction: true,
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });

    console.log('✅ Background message handler setup complete');
  } catch (error) {
    console.error('❌ Error setting up background messages:', error);
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.click_action || '/storeshope/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
