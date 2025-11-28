export const sendNotification = async (title: string, message: string, data?: any) => {
  try {
    if (typeof window === 'undefined') return;

    const OneSignal = (window as any).OneSignal;
    if (!OneSignal) return;

    await OneSignal.Notifications.sendNotification({
      title: title,
      body: message,
      ...(data && { data: data }),
    });
  } catch (error) {
    // Silently handle errors
  }
};

export const setUserId = (userId: string) => {
  try {
    if (typeof window === 'undefined' || !userId) return;

    const OneSignal = (window as any).OneSignal;
    if (!OneSignal) return;

    OneSignal.login(userId).catch(() => {
      // Silently handle errors
    });
  } catch (error) {
    // Silently handle errors
  }
};

export const setUserEmail = (email: string) => {
  try {
    if (typeof window === 'undefined' || !email) return;

    const OneSignal = (window as any).OneSignal;
    if (!OneSignal) return;

    OneSignal.User.addEmail(email).catch(() => {
      // Silently handle errors
    });
  } catch (error) {
    // Silently handle errors
  }
};
