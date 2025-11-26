import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Edit2, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/userContext";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { toast } from "sonner";
import { getOrders, updateOrder, saveOrder } from "@/lib/firebaseOps";
import { sendNotification } from "@/lib/notificationAPI";

interface CartItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  image?: string;
  selectedColor?: string;
  selectedSize?: string;
  selectedUnit?: string;
}

interface Order {
  id: string;
  orderNumber?: number;
  userId?: string;
  items: CartItem[];
  total: number;
  status: string;
  paymentMethod?: string;
  createdAt: string;
  subtotal?: number;
  discountedTotal?: number;
  shippingCost?: number;
  shippingAddress?: string;
  shippingPhone?: string;
  shippingZone?: string;
}

export default function OrderDetailsPage() {
  const [location, setLocation] = useLocation();
  const { user, isLoggedIn, isLoading: authLoading } = useUser();
  const { language } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("pending");
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [completedOrdersValue, setCompletedOrdersValue] = useState(0);
  const [orderUser, setOrderUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);

  // Extract order ID from URL
  const orderId = location.split("/order/")[1]?.split("?")[0];
  // Determine back path based on user role and store tab preference
  const handleBack = () => {
    // Check if there's a previousPage stored in sessionStorage
    const previousPage = sessionStorage.getItem('previousPage');
    const backPath = previousPage || '/profile';
    
    if (user?.role === 'admin') {
      sessionStorage.setItem('preferredTab', 'admin');
    } else {
      sessionStorage.removeItem('preferredTab');
    }
    
    sessionStorage.removeItem('previousPage'); // Clear after use
    setLocation(backPath);
  };

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      setLocation("/login");
    }
    console.log("📊 ORDER PAGE - User:", user?.email, "Role:", user?.role, "Is Admin:", user?.role === 'admin');
  }, [isLoggedIn, authLoading, setLocation, user]);

  useEffect(() => {
    if (!orderId) return;

    setIsLoading(true);
    const fetchOrder = async () => {
      try {
        // Fetch from Firebase only
        const orders = await getOrders(user?.role === 'admin' ? undefined : user?.id);
        const foundOrder = orders?.find((o: any) => o.id === orderId);
        if (foundOrder) {
          setOrder(foundOrder as Order);
        }
      } catch (error) {
        console.error("Error loading order:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, user]);

  // Calculate order statistics once order is loaded
  useEffect(() => {
    if (!order) return;

    // Calculate user order statistics for admin
    if (user?.role === 'admin' && order.userId) {
      const calculateStats = async () => {
        try {
          const allOrders = await getOrders();
          const userOrders = allOrders.filter((o: any) => o.userId === order.userId);
          const completedOrdersList = userOrders.filter((o: any) => o.status === 'completed');
          setTotalOrders(userOrders.length);
          setCompletedOrders(completedOrdersList.length);
          const totalValue = completedOrdersList.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
          setCompletedOrdersValue(totalValue);
        } catch (e) {
          console.error("Error calculating statistics:", e);
        }
      };
      calculateStats();
    }
  }, [order, user?.role]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "confirmed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!order?.id || !status || status === order.status) return;
    
    setIsProcessing(true);
    try {
      // Create a new document with updated status instead of updating existing one
      const newOrderData = {
        ...order,
        status,
        updatedAt: new Date().toISOString()
      };
      
      // Remove id from the data since saveOrder creates a new document
      const { id, ...orderDataWithoutId } = newOrderData;
      
      // Save as new document
      const newOrderId = await saveOrder(orderDataWithoutId);
      
      if (newOrderId) {
        console.log("✅ New order document created with ID:", newOrderId);
        toast.success(`Status updated! New document: ${newOrderId}`);
        
        // Update current view
        setOrder(prev => prev ? { ...prev, status, id: newOrderId } : null);
        setEditingStatus(false);
        setNewStatus("pending");
      } else {
        toast.error("Failed to create new document");
      }
    } catch (error: any) {
      console.error("❌ Error updating status:", error);
      toast.error("Error: " + error?.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pb-4 pt-2 flex items-center gap-4 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{t("orderDetails", language)}</h1>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : !order ? (
          <div className="flex-1 flex flex-col items-center justify-center px-5">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-lg font-bold mb-2">{t("orderNotFound", language)}</h2>
            <button
              onClick={handleBack}
              className="px-5 py-2 bg-black text-white rounded-full text-sm font-semibold mt-4"
            >
              {user?.role === 'admin' ? t("backToAdmin", language) : t("backToAccount", language)}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar pb-40 w-full">
            <div className="w-full px-5 py-4 space-y-4">
              {/* Order Header */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("orderNumber", language)}</p>
                    <p className="font-semibold text-lg font-mono">#{order.orderNumber || order.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  {editingStatus ? (
                    <div className="flex gap-1 items-center">
                      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="px-2 py-1 border rounded text-xs" data-testid="select-status">
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button type="button" onClick={() => {
                        if (newStatus && newStatus !== order.status) {
                          handleStatusUpdate(newStatus);
                        } else {
                          toast.error("Select different status");
                        }
                      }} disabled={isProcessing} className="px-3 py-1 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:bg-gray-400" data-testid="button-save-status">✓</button>
                      <button type="button" onClick={() => { setEditingStatus(false); setNewStatus(order?.status || "pending"); }} className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500" data-testid="button-cancel-status">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded border ${getStatusColor(order?.status || "pending")}`}>{order?.status || "pending"}</span>
                      <button type="button" onClick={() => { 
                        setEditingStatus(true); 
                        setNewStatus(order?.status || "pending"); 
                      }} className="px-2 py-1 text-primary hover:bg-gray-100 rounded" data-testid="button-edit-status"><Edit2 className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                </p>
                {order.paymentMethod && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.paymentMethod === "card" ? t("cardPayment", language) : t("payOnDelivery", language)}
                  </p>
                )}
              </div>

              {/* Items */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-semibold text-sm mb-3">{t("items", language)}</h3>
                <div className="space-y-3">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <div key={idx} className="pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                        <div className="flex justify-between mb-1">
                          <p className="text-sm font-medium">{item.quantity}x {item.title}</p>
                          <p className="text-sm font-semibold">{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                        {(item.selectedColor || item.selectedSize || item.selectedUnit) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.selectedUnit && (
                              <span className="inline-block px-5 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                                {item.selectedUnit}
                              </span>
                            )}
                            {item.selectedSize && (
                              <span className="inline-block px-5 py-1 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                                {item.selectedSize}
                              </span>
                            )}
                            {item.selectedColor && (() => {
                              const [colorName, colorHex] = typeof item.selectedColor === 'string' 
                                ? item.selectedColor.split('|') 
                                : [item.selectedColor, '#000000'];
                              return (
                                <span 
                                  className="inline-block px-5 py-1 rounded text-[10px] font-medium text-white"
                                  style={{backgroundColor: colorHex || '#000000'}}
                                  title={colorName}
                                >
                                  {colorName}
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("noItems", language)}</p>
                  )}
                </div>
              </div>

              {/* Shipping Details */}
              {(order.shippingAddress || order.shippingPhone || order.shippingZone) && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <h3 className="font-semibold text-sm mb-3">{t("deliveryInfo", language)}</h3>
                  <div className="space-y-3">
                    {order.shippingAddress && (
                      <div>
                        <p className="text-xs text-muted-foreground">{t("address", language)}</p>
                        <p className="text-sm font-medium">{order.shippingAddress}</p>
                      </div>
                    )}
                    {order.shippingPhone && (
                      <div>
                        <p className="text-xs text-muted-foreground">{t("phone", language)}</p>
                        <p className="text-sm font-medium">{order.shippingPhone}</p>
                      </div>
                    )}
                    {order.shippingZone && (
                      <div>
                        <p className="text-xs text-muted-foreground">{t("zone", language)}</p>
                        <p className="text-sm font-medium">{order.shippingZone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-semibold text-sm mb-3">{t("orderSummary", language)} (L.E)</h3>
                <div className="space-y-2">
                  {order.subtotal !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("subtotal", language)}</span>
                      <span>{order.subtotal.toFixed(2)}</span>
                    </div>
                  )}
                  {order.discountedTotal !== undefined && order.subtotal !== undefined && order.discountedTotal < order.subtotal && (
                    <>
                      <div className="flex justify-between text-sm text-green-600 font-semibold">
                        <span>{language === "ar" ? "الخصم" : "Discount"}</span>
                        <span>-{(order.subtotal - order.discountedTotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-green-600">
                        <span>{language === "ar" ? "بعد الخصم" : "After Discount"}</span>
                        <span>{order.discountedTotal.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {order.shippingCost !== undefined && order.shippingCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("shipping", language)}</span>
                      <span>{order.shippingCost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-gray-100 pt-2 mt-2">
                    <span>{t("total", language)}</span>
                    <span>L.E {order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* User Information */}
              {(orderUser?.username || order?.userId) && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-semibold text-sm mb-5">{language === "ar" ? "بيانات المستخدم" : "Customer Information"}</h3>
                  
                  <div className="flex items-center gap-6">
                    {/* User Avatar or Profile Image */}
                    {userProfileImage ? (
                      <img 
                        src={userProfileImage} 
                        alt="User Profile" 
                        className="w-24 h-24 rounded-full object-cover shadow-lg ring-4 ring-blue-100 flex-shrink-0" 
                        data-testid="avatar-user-image"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-5xl font-bold flex-shrink-0 shadow-lg ring-4 ring-blue-100" data-testid="avatar-user">
                        {userLoading ? "..." : (orderUser?.username?.charAt(0).toUpperCase() || "U")}
                      </div>
                    )}
                    
                    {/* User Details */}
                    <div className="flex-1 min-w-0">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{language === "ar" ? "الاسم" : "Name"}</p>
                        <p className="font-semibold text-sm mb-3" data-testid="text-username">{orderUser?.username || "-"}</p>
                      </div>
                      
                      {orderUser?.email && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">{language === "ar" ? "البريد الإلكتروني" : "Email"}</p>
                          <p className="font-medium text-sm text-blue-600 break-all" data-testid="text-email">{orderUser?.email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Statistics (Admin View) */}
              {user?.role === 'admin' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-semibold text-sm mb-4">{language === "ar" ? "إحصائيات الطلب" : "Order Statistics"}</h3>
                  
                  {/* Order Statistics */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">{language === "ar" ? "الأوردرات المكتملة" : "Completed Orders"}</p>
                      <p className="text-2xl font-bold text-emerald-700 mt-1" data-testid="text-completed-orders">{completedOrders}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">{language === "ar" ? "إجمالي الأوردرات" : "Total Orders"}</p>
                      <p className="text-2xl font-bold text-blue-700 mt-1" data-testid="text-total-orders">{totalOrders}</p>
                    </div>
                  </div>

                  {/* Completed Orders Value */}
                  {completedOrdersValue > 0 && (
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{language === "ar" ? "قيمة الأوردرات المكتملة" : "Completed Orders Value"}</p>
                      <p className="text-3xl font-bold text-emerald-600 mt-2" data-testid="text-completed-orders-value">L.E {completedOrdersValue.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
