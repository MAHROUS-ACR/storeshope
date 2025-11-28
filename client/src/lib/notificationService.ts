import { getFirestore, collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy, limit, getDocs, updateDoc } from "firebase/firestore";

export interface Notification {
  id: string;
  userId: string;
  orderId?: string;
  title: string;
  message: string;
  type: "order_status" | "delivery" | "promo" | "info";
  status?: "pending" | "shipped" | "in_transit" | "received";
  read: boolean;
  createdAt: number;
  expiresAt?: number;
}

let notificationUnsubscribe: (() => void) | null = null;

export const setupNotificationListener = (
  userId: string,
  onNotification: (notification: Notification) => void
) => {
  const firestore = getFirestore();

  if (notificationUnsubscribe) {
    notificationUnsubscribe();
  }

  const q = query(
    collection(firestore, "notifications"),
    where("userId", "==", userId),
    where("read", "==", false),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  notificationUnsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const notification = {
          id: change.doc.id,
          ...change.doc.data(),
        } as Notification;

        if (notification.expiresAt && notification.expiresAt < Date.now()) {
          deleteNotification(notification.id);
          return;
        }

        onNotification(notification);
      }
    });
  });

  return notificationUnsubscribe;
};

export const deleteNotificationListener = () => {
  if (notificationUnsubscribe) {
    notificationUnsubscribe();
    notificationUnsubscribe = null;
  }
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const firestore = getFirestore();
    await updateDoc(doc(firestore, "notifications", notificationId), {
      read: true,
      readAt: Date.now(),
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

export const deleteNotification = async (notificationId: string) => {
  try {
    const firestore = getFirestore();
    await deleteDoc(doc(firestore, "notifications", notificationId));
  } catch (error) {
    console.error("Error deleting notification:", error);
  }
};

export const getUnreadNotificationsCount = async (userId: string) => {
  try {
    const firestore = getFirestore();
    const q = query(
      collection(firestore, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
};

export const createOrderStatusNotification = async (
  userId: string,
  orderId: string,
  status: "pending" | "shipped" | "in_transit" | "received",
  language: "ar" | "en" = "ar"
) => {
  try {
    const firestore = getFirestore();
    
    const statusLabels = {
      ar: {
        pending: "قيد الانتظار",
        shipped: "تم الشحن",
        in_transit: "قيد التوصيل",
        received: "تم الاستلام",
      },
      en: {
        pending: "Pending",
        shipped: "Shipped",
        in_transit: "In Transit",
        received: "Received",
      },
    };

    const messages = {
      ar: {
        pending: "تم استقبال طلبك ✅",
        shipped: "تم شحن طلبك 📦",
        in_transit: "طلبك في الطريق إليك 🚚",
        received: "تم استلام طلبك 🎉",
      },
      en: {
        pending: "Your order has been received ✅",
        shipped: "Your order has been shipped 📦",
        in_transit: "Your order is on its way 🚚",
        received: "Your order has been delivered 🎉",
      },
    };

    await addDoc(collection(firestore, "notifications"), {
      userId,
      orderId,
      title: statusLabels[language][status] || status,
      message: messages[language][status] || "Order status updated",
      type: "order_status",
      status,
      read: false,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};
