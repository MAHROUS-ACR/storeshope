import { useEffect, useState } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { Settings, Database, Package, Bell, HelpCircle, LogOut, ChevronRight, Edit2, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { useUser } from "@/lib/userContext";
import { toast } from "sonner";
import avatarImage from "@assets/generated_images/professional_user_avatar_portrait.png";

const menuItems = [
  { icon: Database, label: "Firebase Settings", path: "/settings", color: "text-blue-600 bg-blue-50" },
  { icon: Package, label: "My Orders", path: "/orders", color: "text-purple-600 bg-purple-50" },
  { icon: Bell, label: "Notifications", path: "/notifications", color: "text-orange-600 bg-orange-50" },
  { icon: HelpCircle, label: "Help & Support", path: "/help", color: "text-green-600 bg-green-50" },
];

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  title: string;
}

interface AdminOrder {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: string;
  paymentMethod?: string;
}

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user, isLoggedIn, logout, isLoading } = useUser();
  const [activeTab, setActiveTab] = useState<"profile" | "admin">("profile");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      setLocation("/login");
    }
  }, [isLoggedIn, isLoading, setLocation]);

  const fetchAllOrders = async () => {
    setOrdersLoading(true);
    try {
      const response = await fetch("/api/orders/admin/all");
      if (response.ok) {
        const data = await response.json();
        setOrders(data || []);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success("Order status updated!");
        setEditingOrderId(null);
        setNewStatus("");
        fetchAllOrders();
      } else {
        toast.error("Failed to update order");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("You have been logged out");
    setLocation("/");
  };

  if (isLoading) {
    return (
      <MobileWrapper>
        <div className="w-full flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </MobileWrapper>
    );
  }

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pb-4 pt-2 flex items-center justify-between gap-4 border-b border-gray-100 flex-shrink-0">
          <h1 className="text-xl font-bold">Profile</h1>
          <button className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        {user && (
          <div className="flex gap-0 border-b border-gray-100 flex-shrink-0 px-6 bg-white">
            <button
              onClick={() => setActiveTab("profile")}
              className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
                activeTab === "profile"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              data-testid="tab-profile"
            >
              Account
            </button>
            <button
              onClick={() => {
                setActiveTab("admin");
                fetchAllOrders();
              }}
              className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
                activeTab === "admin"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              data-testid="tab-admin"
            >
              Admin Orders
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 w-full">
          {activeTab === "profile" ? (
            // Profile Tab
            <>
              {user && (
                <div className="px-6 py-4">
                  <div className="bg-gradient-to-br from-primary to-purple-600 rounded-3xl p-4 text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-3 border-white/20">
                        <img src={avatarImage} alt="User" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold" data-testid="text-username">
                          {user.username}
                        </h2>
                        <p className="text-xs opacity-90">{user.id}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full px-6 py-4 space-y-3">
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setLocation(item.path)}
                    className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors group"
                    data-testid={`button-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.color}`}>
                        <item.icon className="w-6 h-6" />
                      </div>
                      <span className="font-semibold text-sm">{item.label}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </button>
                ))}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100 hover:border-red-200 transition-colors group mt-6"
                  data-testid="button-logout"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-100 text-red-600">
                      <LogOut className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-sm text-red-600">Log Out</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-red-400 group-hover:text-red-600 transition-colors" />
                </button>
              </div>
            </>
          ) : (
            // Admin Orders Tab
            <div className="w-full px-4 py-4">
              {ordersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No orders yet</div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500">Order ID</p>
                          <p className="text-sm font-bold text-gray-900 truncate" data-testid={`text-order-id-${order.id}`}>
                            {order.id}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                          className="text-primary hover:text-primary/80 transition-colors"
                          data-testid={`button-expand-order-${order.id}`}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="font-semibold text-gray-900">${order.total.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Items</p>
                          <p className="font-semibold text-gray-900">{order.items.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">User</p>
                          <p className="font-semibold text-gray-900 truncate text-xs">{order.userId.substring(0, 8)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Payment</p>
                          <p className="font-semibold text-gray-900">{order.paymentMethod || "N/A"}</p>
                        </div>
                      </div>

                      {/* Status Edit */}
                      {editingOrderId === order.id ? (
                        <div className="flex gap-2 mb-3">
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            data-testid={`select-status-${order.id}`}
                          >
                            <option value="">Select Status</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <button
                            onClick={() => handleStatusUpdate(order.id, newStatus)}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg flex items-center gap-1 hover:bg-green-700 transition-colors"
                            data-testid={`button-save-status-${order.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingOrderId(null);
                              setNewStatus("");
                            }}
                            className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg flex items-center gap-1 hover:bg-gray-400 transition-colors"
                            data-testid={`button-cancel-edit-${order.id}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-semibold px-3 py-1 rounded-full ${
                              order.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : order.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : order.status === "shipped"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                            data-testid={`status-badge-${order.id}`}
                          >
                            {order.status || "pending"}
                          </span>
                          <button
                            onClick={() => {
                              setEditingOrderId(order.id);
                              setNewStatus(order.status || "pending");
                            }}
                            className="text-primary hover:text-primary/80 transition-colors"
                            data-testid={`button-edit-status-${order.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Expanded Details */}
                      {selectedOrder?.id === order.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-2">Items</p>
                            <div className="space-y-1">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span className="text-gray-700">
                                    {item.quantity}x {item.title}
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    ${(item.quantity * item.price).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-600">
                            <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
