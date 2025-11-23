import { useState, useEffect, useRef } from "react";
import { Bell, Trash2, Check } from "lucide-react";
import { useUser } from "@/lib/userContext";
import { useLanguage } from "@/lib/languageContext";

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
      const endpoint = user.role === "admin" ? "/api/notifications/admin" : "/api/notifications";
      const response = await fetch(endpoint, {
        headers: {
          "x-user-id": user.id,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data || []);
        console.log(`✅ Fetched ${data?.length || 0} notifications`);
      }
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications on mount and periodically
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
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
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
      }
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }
    } catch (error) {
      console.error("❌ Error deleting notification:", error);
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
                onClick={() => {
                  setNotifications([]);
                  setIsOpen(false);
                }}
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
