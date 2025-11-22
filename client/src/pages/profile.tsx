import { useEffect, useState } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { Settings, Database, Package, Bell, HelpCircle, LogOut, ChevronRight, Edit2, Check, X, Save, Plus, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useUser } from "@/lib/userContext";
import { toast } from "sonner";
import avatarImage from "@assets/generated_images/professional_user_avatar_portrait.png";
import { saveFirebaseConfig, getFirebaseConfig, clearFirebaseConfig } from "@/lib/firebaseConfig";

const menuItems = [
  { icon: Package, label: "My Orders", path: "/orders", color: "text-purple-600 bg-purple-50" },
  { icon: Bell, label: "Notifications", path: "/notifications", color: "text-orange-600 bg-orange-50" },
  { icon: HelpCircle, label: "Help & Support", path: "/help", color: "text-green-600 bg-green-50" },
];

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  title: string;
  selectedColor?: string;
  selectedSize?: string;
  selectedUnit?: string;
}

interface AdminOrder {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: string;
  paymentMethod?: string;
  orderNumber?: number;
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
  const [showFirebaseSettings, setShowFirebaseSettings] = useState(false);
  const [showOrders, setShowOrders] = useState(true);
  const [showItems, setShowItems] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showStoreSettings, setShowStoreSettings] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemForm, setNewItemForm] = useState({ 
    title: "", 
    price: "", 
    category: "",
    units: [] as string[],
    sizes: [] as string[],
    colors: [] as string[],
    available: true,
  });
  const [unitInput, setUnitInput] = useState("");
  const [sizeInput, setSizeInput] = useState("");
  const [colorInput, setColorInput] = useState("");
  const [currentColorHex, setCurrentColorHex] = useState("#000000");
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserRole, setNewUserRole] = useState<string>("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  // Store Settings States
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  
  // Firebase Config States
  const [projectId, setProjectId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [firebaseApiKey, setFirebaseApiKey] = useState("");
  const [firebaseProjectId, setFirebaseProjectId] = useState("");
  const [firebaseAppId, setFirebaseAppId] = useState("");
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState("");
  const [firebaseStorageBucket, setFirebaseStorageBucket] = useState("");
  const [firebaseMessagingSenderId, setFirebaseMessagingSenderId] = useState("");
  const [firebaseMeasurementId, setFirebaseMeasurementId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      setLocation("/login");
    }
  }, [isLoggedIn, isLoading, setLocation]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Load Firebase config from Firestore
        const response = await fetch("/api/firebase/config");
        if (response.ok) {
          const config = await response.json();
          console.log("Loaded Firebase config from Firestore:", config);
          setProjectId(config.projectId || "");
          setPrivateKey(config.privateKey || "");
          setClientEmail(config.clientEmail || "");
          setFirebaseApiKey(config.firebaseApiKey || "");
          setFirebaseProjectId(config.firebaseProjectId || "");
          setFirebaseAppId(config.firebaseAppId || "");
          setFirebaseAuthDomain(config.firebaseAuthDomain || "");
          setFirebaseStorageBucket(config.firebaseStorageBucket || "");
          setFirebaseMessagingSenderId(config.firebaseMessagingSenderId || "");
          setFirebaseMeasurementId(config.firebaseMeasurementId || "");
        }
      } catch (error) {
        console.error("Failed to load Firebase config from server:", error);
      }

      // Also load from localStorage as fallback
      const localConfig = getFirebaseConfig();
      if (localConfig) {
        setFirebaseApiKey(localConfig.apiKey || "");
        setFirebaseProjectId(localConfig.projectId || "");
        setFirebaseAppId(localConfig.appId || "");
        setFirebaseAuthDomain(localConfig.authDomain || "");
        setFirebaseStorageBucket(localConfig.storageBucket || "");
        setFirebaseMessagingSenderId(localConfig.messagingSenderId || "");
        setFirebaseMeasurementId(localConfig.measurementId || "");
      }
    };

    if (showFirebaseSettings) {
      loadConfig();
    }
  }, [showFirebaseSettings]);

  useEffect(() => {
    const loadStoreSettings = async () => {
      try {
        const response = await fetch("/api/store-settings");
        if (response.ok) {
          const data = await response.json();
          console.log("Loaded store settings from Firestore:", data);
          
          setStoreName(data.name || "");
          setStoreAddress(data.address || "");
          setStorePhone(data.phone || "");
          setStoreEmail(data.email || "");
        }
      } catch (error) {
        console.error("Failed to load store settings:", error);
      }
    };

    if (showStoreSettings) {
      loadStoreSettings();
    }
  }, [showStoreSettings]);

  const handleSaveServerConfig = async () => {
    if (!projectId || !privateKey || !clientEmail) {
      toast.error("Please fill in all Firebase configuration fields");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/firebase/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          privateKey,
          clientEmail,
          firebaseApiKey,
          firebaseProjectId,
          firebaseAppId,
          firebaseAuthDomain,
          firebaseStorageBucket,
          firebaseMessagingSenderId,
          firebaseMeasurementId,
        }),
      });

      if (response.ok) {
        toast.success("Firebase configuration saved to Firestore successfully!");
        setClientEmail("");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to save configuration");
      }
    } catch (error) {
      toast.error("Failed to connect to server");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAuthConfig = () => {
    if (!firebaseApiKey || !firebaseProjectId || !firebaseAppId) {
      toast.error("Please fill in all Firebase Authentication fields");
      return;
    }

    try {
      saveFirebaseConfig({
        apiKey: firebaseApiKey,
        projectId: firebaseProjectId,
        appId: firebaseAppId,
        authDomain: firebaseAuthDomain,
        storageBucket: firebaseStorageBucket,
        messagingSenderId: firebaseMessagingSenderId,
        measurementId: firebaseMeasurementId,
      });
      toast.success("Firebase Authentication settings saved!");
    } catch (error) {
      toast.error("Failed to save authentication settings");
    }
  };

  const handleClearAuthConfig = () => {
    try {
      clearFirebaseConfig();
      setFirebaseApiKey("");
      setFirebaseProjectId("");
      setFirebaseAppId("");
      setFirebaseAuthDomain("");
      setFirebaseStorageBucket("");
      setFirebaseMessagingSenderId("");
      setFirebaseMeasurementId("");
      toast.success("Firebase Authentication settings cleared!");
    } catch (error) {
      toast.error("Failed to clear authentication settings");
    }
  };

  const handleSaveStoreSettings = async () => {
    if (!storeName || !storeAddress || !storePhone || !storeEmail) {
      toast.error("Please fill in all store fields");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/store-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: storeName,
          address: storeAddress,
          phone: storePhone,
          email: storeEmail,
        }),
      });

      if (response.ok) {
        toast.success("Store settings saved successfully!");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to connect to server");
    } finally {
      setIsSaving(false);
    }
  };

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

  const fetchAllUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products/admin");
      if (response.ok) {
        const data = await response.json();
        setItems(data || []);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
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

  const handleUserRoleUpdate = async (userId: string, role: string) => {
    try {
      const response = await fetch("/api/user/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      if (response.ok) {
        toast.success(`User role updated to ${role}!`);
        setEditingUserId(null);
        setNewUserRole("");
        fetchAllUsers();
      } else {
        toast.error("Failed to update user role");
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error("Failed to update user role");
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
          <button 
            onClick={() => setLocation("/settings")}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50"
            data-testid="button-settings"
          >
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
            {user.role === "admin" && (
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
                Admin
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 w-full">
          {activeTab === "profile" ? (
            // Profile Tab
            <>
              {user && (
                <div className="px-6 py-4 space-y-3">
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
              {/* Orders Section */}
              <button
                onClick={() => setShowOrders(!showOrders)}
                className="w-full flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-200 hover:border-purple-300 transition-colors mb-6"
                data-testid="button-toggle-orders"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-100 text-purple-600">
                    <Package className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-sm text-purple-900">Orders Management</span>
                </div>
                <ChevronRight className={`w-5 h-5 text-purple-400 transition-transform ${showOrders ? "rotate-90" : ""}`} />
              </button>

              {/* Orders Content */}
              {showOrders && (
                <div className="mb-6">
                  {/* Status Filters */}
                  {orders.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4">
                      <p className="text-xs font-semibold text-gray-500 mb-3">Filter by Status</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedStatusFilter(null)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                            selectedStatusFilter === null
                              ? "bg-black text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          data-testid="filter-all"
                        >
                          All
                        </button>
                        <button
                          onClick={() => setSelectedStatusFilter("pending")}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                            selectedStatusFilter === "pending"
                              ? "bg-amber-100 text-amber-700 border border-amber-300"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          data-testid="filter-pending"
                        >
                          Pending
                        </button>
                        <button
                          onClick={() => setSelectedStatusFilter("confirmed")}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                            selectedStatusFilter === "confirmed"
                              ? "bg-blue-100 text-blue-700 border border-blue-300"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          data-testid="filter-confirmed"
                        >
                          Confirmed
                        </button>
                        <button
                          onClick={() => setSelectedStatusFilter("processing")}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                            selectedStatusFilter === "processing"
                              ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          data-testid="filter-processing"
                        >
                          Processing
                        </button>
                        <button
                          onClick={() => setSelectedStatusFilter("shipped")}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                            selectedStatusFilter === "shipped"
                              ? "bg-blue-100 text-blue-700 border border-blue-300"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          data-testid="filter-shipped"
                        >
                          Shipped
                        </button>
                        <button
                          onClick={() => setSelectedStatusFilter("completed")}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                            selectedStatusFilter === "completed"
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          data-testid="filter-completed"
                        >
                          Completed
                        </button>
                        <button
                          onClick={() => setSelectedStatusFilter("cancelled")}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                            selectedStatusFilter === "cancelled"
                              ? "bg-red-100 text-red-700 border border-red-300"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          data-testid="filter-cancelled"
                        >
                          Cancelled
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Orders List */}
                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No orders yet</div>
                  ) : (
                    <div className="space-y-3">
                      {orders.filter(order => selectedStatusFilter === null || order.status === selectedStatusFilter).map((order) => (
                        <div
                          key={order.id}
                          className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-gray-500">Order Number</p>
                              <p className="text-sm font-bold text-gray-900" data-testid={`text-order-number-${order.id}`}>
                                #{order.orderNumber || "N/A"}
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
                                <div className="space-y-2">
                                  {order.items.map((item, idx) => (
                                    <div key={`${item.id}-${idx}`} className="flex flex-col gap-1">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-700">
                                          {item.quantity}x {item.title}
                                        </span>
                                        <span className="font-semibold text-gray-900">
                                          ${(item.quantity * item.price).toFixed(2)}
                                        </span>
                                      </div>
                                      {(item.selectedColor || item.selectedSize || item.selectedUnit) && (
                                        <div className="flex flex-wrap gap-1 ml-2">
                                          {item.selectedUnit && <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-semibold">{item.selectedUnit}</span>}
                                          {item.selectedSize && <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[8px] font-semibold">{item.selectedSize}</span>}
                                          {item.selectedColor && <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[8px] font-semibold">{item.selectedColor}</span>}
                                        </div>
                                      )}
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

              {/* Users Management Section */}
              <button
                onClick={() => {
                  setShowUsers(!showUsers);
                  if (!showUsers) fetchAllUsers();
                }}
                className="w-full flex items-center justify-between p-4 bg-cyan-50 rounded-2xl border border-cyan-200 hover:border-cyan-300 transition-colors mb-6"
                data-testid="button-toggle-users"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-cyan-100 text-cyan-600">
                    <Database className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-sm text-cyan-900">User Management</span>
                </div>
                <ChevronRight className={`w-5 h-5 text-cyan-400 transition-transform ${showUsers ? "rotate-90" : ""}`} />
              </button>

              {/* Users Content */}
              {showUsers && (
                <div className="mb-6">
                  {/* Search Users */}
                  <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4">
                    <input
                      type="text"
                      placeholder="Search users by email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      data-testid="input-search-users"
                    />
                  </div>

                  {usersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No users found</div>
                  ) : (
                    <div className="space-y-3">
                      {users.filter(u => u.email.toLowerCase().includes(userSearchQuery.toLowerCase())).map((u) => (
                        <div
                          key={u.id}
                          className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-gray-300 transition-colors"
                          data-testid={`card-user-${u.id}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-900" data-testid={`text-user-email-${u.id}`}>{u.email}</p>
                              <p className="text-xs text-gray-500 truncate">{u.id.substring(0, 12)}...</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              u.role === "admin" 
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-700"
                            }`} data-testid={`badge-role-${u.id}`}>
                              {u.role || "user"}
                            </span>
                          </div>

                          {editingUserId === u.id ? (
                            <div className="flex gap-2">
                              <select
                                value={newUserRole}
                                onChange={(e) => setNewUserRole(e.target.value)}
                                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                data-testid={`select-user-role-${u.id}`}
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                onClick={() => handleUserRoleUpdate(u.id, newUserRole)}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg flex items-center justify-center gap-1 hover:bg-green-700 transition-colors text-xs font-semibold"
                                data-testid={`button-save-user-role-${u.id}`}
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUserId(null);
                                  setNewUserRole("");
                                }}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-1 hover:bg-gray-300 transition-colors text-xs font-semibold"
                                data-testid={`button-cancel-user-role-${u.id}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingUserId(u.id);
                                setNewUserRole(u.role || "user");
                              }}
                              className="w-full px-3 py-2 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center gap-1 hover:bg-amber-200 transition-colors text-xs font-semibold"
                              data-testid={`button-edit-user-role-${u.id}`}
                            >
                              <Edit2 className="w-3 h-3" />
                              Change Role
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Categories Management Section */}
              <button
                onClick={() => {
                  setShowCategories(!showCategories);
                  if (!showCategories) fetchCategories();
                }}
                className="w-full flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-200 hover:border-green-300 transition-colors mb-6"
                data-testid="button-categories-section"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-green-100 text-green-600">
                    <Package className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-sm text-green-900">Categories</span>
                </div>
                <ChevronRight className={`w-5 h-5 text-green-400 transition-transform ${showCategories ? "rotate-90" : ""}`} />
              </button>

              {/* Categories List */}
              {showCategories && (
                <div className="mb-6">
                  {/* Add New Category */}
                  <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4">
                    <h3 className="text-sm font-bold mb-3">Add New Category</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        data-testid="input-category-name"
                      />
                      <button
                        onClick={async () => {
                          if (newCategoryName.trim()) {
                            try {
                              const response = await fetch("/api/categories", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: newCategoryName }),
                              });
                              if (response.ok) {
                                const data = await response.json();
                                setCategories([...categories, { id: data.id, name: data.name }]);
                                setNewCategoryName("");
                                toast.success("Category added!");
                              } else {
                                toast.error("Failed to add category");
                              }
                            } catch (error) {
                              toast.error("Failed to add category");
                            }
                          } else {
                            toast.error("Enter category name");
                          }
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center gap-1 hover:bg-green-700 transition-colors text-sm"
                        data-testid="button-add-category"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Categories List */}
                  {categories.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No categories yet</div>
                  ) : (
                    <div className="space-y-2">
                      {categories.map((cat) => (
                        <div
                          key={cat.id}
                          className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:border-gray-300 transition-colors"
                          data-testid={`card-category-${cat.id}`}
                        >
                          {editingCategoryId === cat.id ? (
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                defaultValue={cat.name}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                data-testid={`input-edit-category-${cat.id}`}
                              />
                              <button
                                onClick={async () => {
                                  if (newCategoryName.trim()) {
                                    try {
                                      const response = await fetch("/api/categories", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ id: cat.id, name: newCategoryName }),
                                      });
                                      if (response.ok) {
                                        setCategories(categories.map(c => c.id === cat.id ? { ...c, name: newCategoryName } : c));
                                        setEditingCategoryId(null);
                                        setNewCategoryName("");
                                        toast.success("Category updated!");
                                      } else {
                                        toast.error("Failed to update category");
                                      }
                                    } catch (error) {
                                      toast.error("Failed to update category");
                                    }
                                  }
                                }}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors text-xs"
                                data-testid={`button-save-category-${cat.id}`}
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCategoryId(null);
                                  setNewCategoryName("");
                                }}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-300 transition-colors text-xs"
                                data-testid={`button-cancel-category-${cat.id}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="font-semibold text-sm text-gray-900">{cat.name}</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingCategoryId(cat.id);
                                    setNewCategoryName(cat.name);
                                  }}
                                  className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center hover:bg-amber-200 transition-colors text-xs"
                                  data-testid={`button-edit-category-${cat.id}`}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`/api/categories/${cat.id}`, {
                                        method: "DELETE",
                                      });
                                      if (response.ok) {
                                        setCategories(categories.filter(c => c.id !== cat.id));
                                        toast.success("Category deleted!");
                                      } else {
                                        toast.error("Failed to delete category");
                                      }
                                    } catch (error) {
                                      toast.error("Failed to delete category");
                                    }
                                  }}
                                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg flex items-center justify-center hover:bg-red-200 transition-colors text-xs"
                                  data-testid={`button-delete-category-${cat.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Products Management Section */}
              <button
                onClick={() => {
                  setShowItems(!showItems);
                  if (!showItems) {
                    fetchProducts();
                    fetchCategories();
                  }
                }}
                className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-200 hover:border-blue-300 transition-colors mb-6 mt-6"
                data-testid="button-toggle-items"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-100 text-blue-600">
                    <Package className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-sm text-blue-900">Products</span>
                </div>
                <ChevronRight className={`w-5 h-5 text-blue-400 transition-transform ${showItems ? "rotate-90" : ""}`} />
              </button>

              {/* Items Content */}
              {showItems && (
                <div className="mb-6">
                  {/* Add New Item Form */}
                  <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4">
                    <h3 className="text-sm font-bold mb-3">{editingItemId ? "Edit Product" : "Add New Product"}</h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Product Title"
                        value={newItemForm.title}
                        onChange={(e) => setNewItemForm({ ...newItemForm, title: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        data-testid="input-item-title"
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={newItemForm.price}
                        onChange={(e) => setNewItemForm({ ...newItemForm, price: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        data-testid="input-item-price"
                      />
                      <select
                        value={newItemForm.category}
                        onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        data-testid="select-item-category"
                      >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                      {/* Units */}
                      <div>
                        <label className="text-xs font-semibold mb-1 block">وحدات (Units) - اختياري</label>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="أضف وحدة"
                            value={unitInput}
                            onChange={(e) => setUnitInput(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                            data-testid="input-item-unit"
                          />
                          <button
                            onClick={() => {
                              if (unitInput.trim()) {
                                setNewItemForm({ ...newItemForm, units: [...newItemForm.units, unitInput.trim()] });
                                setUnitInput("");
                              }
                            }}
                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold"
                            data-testid="button-add-unit"
                          >
                            أضف
                          </button>
                        </div>
                        {newItemForm.units.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {newItemForm.units.map((unit, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                {unit}
                                <button onClick={() => setNewItemForm({ ...newItemForm, units: newItemForm.units.filter((_, idx) => idx !== i) })} className="text-blue-700 hover:text-blue-900">×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Sizes */}
                      <div>
                        <label className="text-xs font-semibold mb-1 block">مقاسات (Sizes) - اختياري</label>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="أضف مقاس"
                            value={sizeInput}
                            onChange={(e) => setSizeInput(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                            data-testid="input-item-size"
                          />
                          <button
                            onClick={() => {
                              if (sizeInput.trim()) {
                                setNewItemForm({ ...newItemForm, sizes: [...newItemForm.sizes, sizeInput.trim()] });
                                setSizeInput("");
                              }
                            }}
                            className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-semibold"
                            data-testid="button-add-size"
                          >
                            أضف
                          </button>
                        </div>
                        {newItemForm.sizes.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {newItemForm.sizes.map((size, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                {size}
                                <button onClick={() => setNewItemForm({ ...newItemForm, sizes: newItemForm.sizes.filter((_, idx) => idx !== i) })} className="text-green-700 hover:text-green-900">×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Colors */}
                      <div>
                        <label className="text-xs font-semibold mb-1 block">ألوان (Colors) - اختياري</label>
                        <div className="space-y-2 mb-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="اسم اللون"
                              value={colorInput}
                              onChange={(e) => setColorInput(e.target.value)}
                              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                              data-testid="input-item-color-name"
                            />
                            <input
                              type="color"
                              value={currentColorHex}
                              onChange={(e) => setCurrentColorHex(e.target.value)}
                              className="w-12 h-10 rounded-lg cursor-pointer border border-gray-200"
                              data-testid="input-item-color-picker"
                            />
                            <button
                              onClick={() => {
                                if (colorInput.trim()) {
                                  setNewItemForm({ ...newItemForm, colors: [...newItemForm.colors, `${colorInput.trim()}|${currentColorHex}`] });
                                  setColorInput("");
                                  setCurrentColorHex("#000000");
                                }
                              }}
                              className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold"
                              data-testid="button-add-color"
                            >
                              أضف
                            </button>
                          </div>
                        </div>
                        {newItemForm.colors.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {newItemForm.colors.map((color, i) => {
                              const colorName = typeof color === 'string' ? color.split('|')[0] : color;
                              const colorHex = typeof color === 'string' ? color.split('|')[1] || '#000000' : '#000000';
                              return (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs border" style={{borderColor: colorHex}}>
                                  <span style={{width: '12px', height: '12px', backgroundColor: colorHex, borderRadius: '3px'}}></span>
                                  {colorName}
                                  <button onClick={() => setNewItemForm({ ...newItemForm, colors: newItemForm.colors.filter((_, idx) => idx !== i) })} className="text-red-700 hover:text-red-900">×</button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <label className="flex items-center gap-2 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={newItemForm.available}
                          onChange={(e) => setNewItemForm({ ...newItemForm, available: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-200"
                          data-testid="checkbox-item-available"
                        />
                        <span className="text-sm">متاح (Available)</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (newItemForm.title && newItemForm.price && newItemForm.category) {
                              try {
                                const response = await fetch("/api/products/admin", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    id: editingItemId || undefined,
                                    title: newItemForm.title,
                                    price: parseFloat(newItemForm.price),
                                    category: newItemForm.category,
                                    units: newItemForm.units.length > 0 ? newItemForm.units : null,
                                    sizes: newItemForm.sizes.length > 0 ? newItemForm.sizes : null,
                                    colors: newItemForm.colors.length > 0 ? newItemForm.colors : null,
                                    available: newItemForm.available,
                                  }),
                                });
                                if (response.ok) {
                                  const data = await response.json();
                                  if (editingItemId) {
                                    setItems(items.map(i => i.id === editingItemId ? { ...data } : i));
                                    toast.success("Product updated!");
                                    setEditingItemId(null);
                                  } else {
                                    setItems([...items, { ...data }]);
                                    toast.success("Product added!");
                                  }
                                  setNewItemForm({ title: "", price: "", category: "", units: [], sizes: [], colors: [], available: true });
                                  setUnitInput("");
                                  setSizeInput("");
                                  setColorInput("");
                                  setCurrentColorHex("#000000");
                                } else {
                                  toast.error("Failed to save product");
                                }
                              } catch (error) {
                                toast.error("Failed to save product");
                              }
                            } else {
                              toast.error("Please fill all fields");
                            }
                          }}
                          className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors text-sm"
                          data-testid="button-add-item"
                        >
                          <Plus className="w-4 h-4" />
                          {editingItemId ? "Update" : "Add"}
                        </button>
                        {editingItemId && (
                          <button
                            onClick={() => {
                              setEditingItemId(null);
                              setNewItemForm({ title: "", price: "", category: "", units: [], sizes: [], colors: [], available: true });
                              setUnitInput("");
                              setSizeInput("");
                              setColorInput("");
                              setCurrentColorHex("#000000");
                            }}
                            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors text-sm"
                            data-testid="button-cancel-item"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No items yet</div>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-900">{item.title}</p>
                              <p className="text-xs text-gray-500">{item.category}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.units && item.units.map((u: string) => <span key={u} className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{u}</span>)}
                                {item.sizes && item.sizes.map((s: string) => <span key={s} className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs">{s}</span>)}
                                {item.colors && item.colors.map((c: string) => {
                                  const colorName = typeof c === 'string' ? c.split('|')[0] : c;
                                  const colorHex = typeof c === 'string' ? c.split('|')[1] || '#000000' : '#000000';
                                  return (
                                    <span key={colorName} className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs flex items-center gap-1 border" style={{borderColor: colorHex}}>
                                      <span style={{width: '8px', height: '8px', backgroundColor: colorHex, borderRadius: '2px'}}></span>
                                      {colorName}
                                    </span>
                                  );
                                })}
                                {!item.available && <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs">غير متاح</span>}
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">${item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingItemId(item.id);
                                setNewItemForm({
                                  title: item.title,
                                  price: item.price.toString(),
                                  category: item.category,
                                  units: item.units || [],
                                  sizes: item.sizes || [],
                                  colors: item.colors || [],
                                  available: item.available !== false,
                                });
                                setUnitInput("");
                                setSizeInput("");
                                setColorInput("");
                                setCurrentColorHex("#000000");
                              }}
                              className="flex-1 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center gap-1 hover:bg-amber-200 transition-colors text-xs font-semibold"
                              data-testid={`button-edit-item-${item.id}`}
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/products/admin/${item.id}`, {
                                    method: "DELETE",
                                  });
                                  if (response.ok) {
                                    setItems(items.filter(i => i.id !== item.id));
                                    if (editingItemId === item.id) {
                                      setEditingItemId(null);
                                      setNewItemForm({ title: "", price: "", category: "", units: [], sizes: [], colors: [], available: true });
                                      setUnitInput("");
                                      setSizeInput("");
                                      setColorInput("");
                                      setCurrentColorHex("#000000");
                                    }
                                    toast.success("Product deleted!");
                                  } else {
                                    toast.error("Failed to delete product");
                                  }
                                } catch (error) {
                                  toast.error("Failed to delete product");
                                }
                              }}
                              className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg flex items-center justify-center gap-1 hover:bg-red-200 transition-colors text-xs font-semibold"
                              data-testid={`button-delete-item-${item.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
