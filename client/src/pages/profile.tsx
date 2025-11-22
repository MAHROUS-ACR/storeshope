import { useEffect, useState } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { Settings, Database, Package, Bell, HelpCircle, LogOut, ChevronRight, Edit2, Check, X, Save } from "lucide-react";
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
  const [showStoreSettings, setShowStoreSettings] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  
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
        const response = await fetch("/api/firebase/config");
        if (response.ok) {
          const serverConfig = await response.json();
          setProjectId(serverConfig.projectId || "");
          setPrivateKey(serverConfig.privateKey || "");
          setClientEmail(serverConfig.clientEmail || "");
          setFirebaseApiKey(serverConfig.firebaseApiKey || "");
          setFirebaseProjectId(serverConfig.firebaseProjectId || "");
          setFirebaseAppId(serverConfig.firebaseAppId || "");
          setFirebaseAuthDomain(serverConfig.firebaseAuthDomain || "");
          setFirebaseStorageBucket(serverConfig.firebaseStorageBucket || "");
          setFirebaseMessagingSenderId(serverConfig.firebaseMessagingSenderId || "");
          setFirebaseMeasurementId(serverConfig.firebaseMeasurementId || "");
        }
      } catch (error) {
        console.error("Failed to load Firebase config from server:", error);
      }

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
        }),
      });

      if (response.ok) {
        toast.success("Firebase configuration saved successfully!");
        setProjectId("");
        setPrivateKey("");
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
        toast.error(error.message || "Failed to save store settings");
      }
    } catch (error) {
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
              {/* Firebase Settings Toggle Button */}
              <button
                onClick={() => setShowFirebaseSettings(!showFirebaseSettings)}
                className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-200 hover:border-blue-300 transition-colors mb-6"
                data-testid="button-firebase-settings"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-100 text-blue-600">
                    <Database className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-sm text-blue-900">Firebase Settings</span>
                </div>
                <ChevronRight className={`w-5 h-5 text-blue-400 transition-transform ${showFirebaseSettings ? "rotate-90" : ""}`} />
              </button>

              {/* Firebase Settings Content */}
              {showFirebaseSettings && (
                <div className="space-y-6 mb-6">
                  {/* Server Config Section */}
                  <div className="bg-white rounded-2xl p-4 border border-gray-200">
                    <h3 className="text-lg font-bold mb-4">Firebase Data Configuration</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-4">
                      <div className="flex items-start gap-3">
                        <Database className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-semibold text-blue-900 mb-1 text-xs">Setup Instructions</p>
                          <ol className="text-blue-800 space-y-1 list-decimal list-inside text-xs leading-relaxed">
                            <li>Go to Firebase Console → Project Settings</li>
                            <li>Navigate to Service Accounts tab</li>
                            <li>Click "Generate New Private Key"</li>
                            <li>Copy the values from the JSON file</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold mb-2">Project ID</label>
                        <input
                          type="text"
                          value={projectId}
                          onChange={(e) => setProjectId(e.target.value)}
                          placeholder="your-project-id"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          data-testid="input-project-id"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-2">Client Email</label>
                        <input
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          data-testid="input-client-email"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-2">Private Key</label>
                        <textarea
                          value={privateKey}
                          onChange={(e) => setPrivateKey(e.target.value)}
                          placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                          rows={4}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-xs resize-none"
                          data-testid="input-private-key"
                        />
                      </div>

                      <button
                        onClick={handleSaveServerConfig}
                        disabled={isSaving}
                        className="w-full bg-black text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        data-testid="button-save-server-config"
                      >
                        {isSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Server Config
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Auth Config Section */}
                  <div className="bg-white rounded-2xl p-4 border border-gray-200">
                    <h3 className="text-lg font-bold mb-3">Firebase Authentication</h3>
                    <p className="text-xs text-gray-600 mb-4">Configure client-side authentication</p>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold mb-2">API Key</label>
                        <input
                          type="text"
                          value={firebaseApiKey}
                          onChange={(e) => setFirebaseApiKey(e.target.value)}
                          placeholder="AIza..."
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          data-testid="input-firebase-api-key"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-2">Project ID</label>
                        <input
                          type="text"
                          value={firebaseProjectId}
                          onChange={(e) => setFirebaseProjectId(e.target.value)}
                          placeholder="your-project-id"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          data-testid="input-firebase-project-id"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-2">App ID</label>
                        <input
                          type="text"
                          value={firebaseAppId}
                          onChange={(e) => setFirebaseAppId(e.target.value)}
                          placeholder="1:123456789:web:abc..."
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          data-testid="input-firebase-app-id"
                        />
                      </div>

                      <button
                        onClick={handleSaveAuthConfig}
                        className="w-full bg-primary text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors text-sm"
                        data-testid="button-save-auth-config"
                      >
                        <Save className="w-4 h-4" />
                        Save Authentication
                      </button>

                      {firebaseApiKey && (
                        <button
                          onClick={handleClearAuthConfig}
                          className="w-full bg-red-50 text-red-600 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 border border-red-200 hover:bg-red-100 transition-colors text-sm"
                          data-testid="button-clear-auth-config"
                        >
                          <LogOut className="w-4 h-4" />
                          Clear Settings
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Store Settings Section */}
              <button
                onClick={() => setShowStoreSettings(!showStoreSettings)}
                className="w-full flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-200 hover:border-emerald-300 transition-colors mb-6"
                data-testid="button-toggle-store-settings"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-100 text-emerald-600">
                    <Settings className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-sm text-emerald-900">Store Settings</span>
                </div>
                <ChevronRight className={`w-5 h-5 text-emerald-400 transition-transform ${showStoreSettings ? "rotate-90" : ""}`} />
              </button>

              {/* Store Settings Content */}
              {showStoreSettings && (
                <div className="mb-6 bg-white rounded-2xl p-4 border border-gray-200">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold mb-2">Store Name</label>
                      <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="Your Store Name"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        data-testid="input-store-name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-2">Address</label>
                      <input
                        type="text"
                        value={storeAddress}
                        onChange={(e) => setStoreAddress(e.target.value)}
                        placeholder="Store Address"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        data-testid="input-store-address"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={storePhone}
                        onChange={(e) => setStorePhone(e.target.value)}
                        placeholder="+1 234 567 8900"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        data-testid="input-store-phone"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-2">Email</label>
                      <input
                        type="email"
                        value={storeEmail}
                        onChange={(e) => setStoreEmail(e.target.value)}
                        placeholder="info@store.com"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        data-testid="input-store-email"
                      />
                    </div>

                    <button
                      onClick={handleSaveStoreSettings}
                      disabled={isSaving}
                      className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      data-testid="button-save-store-settings"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Store Settings
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

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
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
