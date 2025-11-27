import { useState, useEffect, useRef } from "react";
import { Bell, Trash2, Check } from "lucide-react";
import { useUser } from "@/lib/userContext";
import { useLanguage } from "@/lib/languageContext";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { playNotificationSound } from "@/lib/notificationUtils";

interface Notification {
  id: string;
  type: string;
  message: string;
  messageEn: string;
  read: boolean;
  createdAt: string;
  orderId?: string;
  orderNumber?: number;
}

export function NotificationCenter() {
  const { user } = useUser();
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const db = getFirestore();
      const notificationsRef = collection(db, "notifications");
      const q = user.role === "admin" 
        ? query(notificationsRef)
        : query(notificationsRef, where("userId", "==", user.id));
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
      
      // Check if there are new unread notifications and play sound
      const previousUnreadCount = notifications.filter((n) => !n.read).length;
      const newUnreadCount = (data || []).filter((n) => !n.read).length;
      
      if (newUnreadCount > previousUnreadCount && previousUnreadCount > 0) {
        // New unread notifications detected - play sound
        playNotificationSound();
      }
      
      setNotifications(data || []);

    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications on mount and periodically
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    // Poll for new notifications every 10 seconds (improved responsiveness)
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user?.id, user?.role]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const db = getFirestore();
      const notifRef = doc(db, "notifications", notificationId);
      await updateDoc(notifRef, { read: true });
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {

    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      const db = getFirestore();
      const notifRef = doc(db, "notifications", notificationId);
      await deleteDoc(notifRef);
      
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {

    }
  };

  const handleClearAll = async () => {
    try {
      const db = getFirestore();
      const notificationsRef = collection(db, "notifications");
      
      // Delete all notifications from Firestore
      for (const notification of notifications) {
        const notifRef = doc(db, "notifications", notification.id);
        await deleteDoc(notifRef);
      }
      
      setNotifications([]);
      setIsOpen(false);

    } catch (error) {

    }
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return language === "ar" ? "للتو" : "Just now";
    if (diffMins < 60)
      return `${diffMins} ${language === "ar" ? "دقيقة" : "minutes"} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
      return `${diffHours} ${language === "ar" ? "ساعة" : "hours"} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${language === "ar" ? "يوم" : "days"} ago`;
  };

  if (!user?.id) return null;

  return (
    <div className="relative inline-block">
      {/* Bell Icon Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        data-testid="button-notifications"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span
            className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
            data-testid="text-unread-count"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu - Positioned below button */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-80 overflow-y-auto"
          style={{
            width: "280px",
            maxWidth: "calc(100vw - 20px)",
            ...(language === "ar" ? { right: "-180px" } : { left: "-180px" }),
          }}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-2">
            <h3 className="font-semibold text-gray-900 text-sm">
              {language === "ar" ? "الإشعارات" : "Notifications"}
            </h3>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {language === "ar"
                  ? `${unreadCount} إشعار جديد`
                  : `${unreadCount} new notification${unreadCount !== 1 ? "s" : ""}`}
              </p>
            )}
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>{language === "ar" ? "لا توجد إشعارات" : "No notifications"}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.read ? "bg-blue-50" : ""
                  }`}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        {language === "ar"
                          ? notification.message
                          : notification.messageEn}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                      {notification.orderNumber && (
                        <p className="text-xs text-blue-600 mt-1">
                          {language === "ar" ? "الطلب رقم" : "Order"} #{notification.orderNumber}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-1 hover:bg-blue-100 rounded transition-colors"
                          data-testid={`button-mark-read-${notification.id}`}
                          aria-label="Mark as read"
                        >
                          <Check className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                        data-testid={`button-delete-notification-${notification.id}`}
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 p-2 bg-gray-50">
              <button
                onClick={handleClearAll}
                className="w-full text-sm text-gray-600 hover:text-gray-900 py-1"
                data-testid="button-clear-notifications"
              >
                {language === "ar"
                  ? "حذف جميع الإشعارات"
                  : "Clear all notifications"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
