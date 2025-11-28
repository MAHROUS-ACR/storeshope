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
      return;
    }

    console.log("📲 Requesting push notification permission...");
    // Show the native browser permission prompt
    const permission = await OneSignal.Notifications.requestPermission();
    console.log("📱 Permission result:", permission);
  } catch (error) {
    console.error("Error requesting permission:", error);
  }
};

// 🔥 Get Player ID after permission
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
    const OneSignal = await getOneSignal();
    if (!OneSignal) {
      console.warn("OneSignal not available for registration");
      return;
    }

    // Register user ID in OneSignal
    console.log("🔐 Registering user in OneSignal:", userId);
    await OneSignal.login(userId);
    console.log("✅ User registered successfully in OneSignal");

    // Check subscription status
    const isSubscribed = OneSignal.User.PushSubscription.isSubscribed;
    console.log("🔔 User subscribed to push:", isSubscribed);

    if (!isSubscribed) {
      console.log("⚠️ User not subscribed yet, attempting to prompt again...");
      await OneSignal.Notifications.requestPermission();
    }
  } catch (error) {
    console.error("Error registering user in OneSignal:", error);
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
