// Initialize OneSignal when available
let OneSignalInstance: any = null;

const getOneSignal = async (timeout = 3000) => {
  if (OneSignalInstance) return OneSignalInstance;

  const start = Date.now();
  while (!OneSignalInstance && Date.now() - start < timeout) {
    OneSignalInstance = (window as any).OneSignal;
    if (OneSignalInstance) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  return OneSignalInstance;
};

export const sendNotification = async (title: string, message: string, data?: any) => {
  try {
    const OneSignal = await getOneSignal();
    if (!OneSignal) return;

    await OneSignal.Notifications.sendNotification({
      title: title,
      body: message,
      ...(data && { data: data }),
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

export const requestPushPermission = async () => {
  try {
    const OneSignal = await getOneSignal(5000);
    if (!OneSignal) {
      console.warn("OneSignal not available");
      return false;
    }

    console.log("📲 Requesting push notification permission...");
    const permission = await OneSignal.Notifications.requestPermission();
    console.log("📱 Permission result:", permission);

    // Wait for subscription to complete
    let isSubscribed = false;
    let attempts = 0;
    while (!isSubscribed && attempts < 20) {
      await new Promise(r => setTimeout(r, 250));
      isSubscribed = OneSignal.User.PushSubscription.isSubscribed;
      attempts++;
    }

    console.log("✅ Subscription status:", isSubscribed);
    return isSubscribed;
  } catch (error) {
    console.error("Error requesting permission:", error);
    return false;
  }
};

export const getPlayerId = async () => {
  try {
    const OneSignal = await getOneSignal();
    if (!OneSignal) return null;

    const id = await OneSignal.User.getId();
    console.log("🆔 OneSignal Player ID:", id);
    return id;
  } catch (error) {
    console.error("Error getting player ID:", error);
    return null;
  }
};

export const setUserId = async (userId: string) => {
  try {
    if (!userId) return;
    const OneSignal = await getOneSignal(5000);
    if (!OneSignal) {
      console.warn("OneSignal not available for registration");
      return;
    }

    console.log("🔐 Registering user in OneSignal:", userId);
    await OneSignal.login(userId);
    console.log("✅ User registered in OneSignal");

    // Get and log player ID
    const playerId = await getPlayerId();
    if (playerId) {
      console.log("✅ Player registered with ID:", playerId);
    }
  } catch (error) {
    console.error("Error registering user:", error);
  }
};

export const enableNotifications = async (userId: string) => {
  try {
    console.log("🔔 Enabling notifications for user:", userId);
    
    // Step 1: Request permission and wait for subscription
    const isSubscribed = await requestPushPermission();
    console.log("📱 Is subscribed after permission:", isSubscribed);
    
    // Step 2: Register user only if subscribed
    if (isSubscribed) {
      await setUserId(userId);
    } else {
      console.warn("⚠️ User did not subscribe to push notifications");
      return false;
    }
    
    console.log("✅ Notifications enabled successfully!");
    return true;
  } catch (error) {
    console.error("❌ Failed to enable notifications:", error);
    return false;
  }
};

// Setup subscription listener for when user subscribes via OneSignal permission popup
export const setupSubscriptionListener = async () => {
  try {
    const OneSignal = await getOneSignal(5000);
    if (!OneSignal) return;

    // Listen for subscription changes
    OneSignal.User.PushSubscription.addEventListener("change", async (change: any) => {
      const isSubscribed = OneSignal.User.PushSubscription.isSubscribed;

      if (isSubscribed) {
        // User just subscribed to push notifications
        const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        if (authUser?.id) {
          await setUserId(authUser.id);
        }
      }
    });
  } catch (error) {
    console.error("Error setting up subscription listener:", error);
  }
};
