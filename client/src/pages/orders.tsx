import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/userContext";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { toast } from "sonner";
import { getOrders } from "@/lib/firebaseOps";

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

export default function OrdersPage() {
  const [location, setLocation] = useLocation();
  const { user, isLoggedIn, isLoading: authLoading } = useUser();
  const { language } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      setLocation("/login");
    }
  }, [isLoggedIn, authLoading, setLocation]);

  useEffect(() => {
    async function fetchOrders() {
      setIsLoading(true);
      try {
        setFirebaseConfigured(true);
        
        // Fetch orders from Firebase (filtered by user ID if available)
        const firebaseOrders = await getOrders(user?.id);
        
        if (firebaseOrders && firebaseOrders.length > 0) {
          setOrders(firebaseOrders as Order[]);
          // Update localStorage with Firebase data
          localStorage.setItem("orders", JSON.stringify(firebaseOrders));
        } else {
          // Fallback to localStorage if no Firebase orders
          const savedOrders = localStorage.getItem("orders");
          if (savedOrders) {
            setOrders(JSON.parse(savedOrders));
          } else {
            setOrders([]);
          }
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        // Fallback to localStorage
        try {
          const savedOrders = localStorage.getItem("orders");
          if (savedOrders) {
            setOrders(JSON.parse(savedOrders));
          } else {
            setOrders([]);
          }
        } catch (e) {
          console.error("Failed to load from localStorage:", e);
          setOrders([]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
    // Refresh orders when page becomes visible or location changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchOrders();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [location, user?.id]);

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

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pb-4 pt-2 flex items-center gap-4 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => {
              // Check if there's a previousPage stored in sessionStorage
              const previousPage = sessionStorage.getItem('previousPage');
              const backPath = previousPage || '/';
              sessionStorage.removeItem('previousPage'); // Clear after use
              setLocation(backPath);
            }}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{t("myOrders", language)}</h1>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-5">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📦</span>
            </div>
            <h2 className="text-lg font-bold mb-2">{t("noOrdersYet", language)}</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              {t("noOrdersFound", language)}
            </p>
            <button
              onClick={() => setLocation("/")}
              className="px-5 py-2 bg-black text-white rounded-full text-sm font-semibold"
              data-testid="button-start-shopping"
            >
              {t("startShopping", language)}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar pb-40 w-full">
            <div className="w-full px-5 py-4 space-y-3">
              {orders.filter(order => !user || !(order as any).userId || (order as any).userId === user.id)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((order) => (
                <div key={order.id}>
                  <button
                    onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                    className="w-full p-4 bg-white rounded-2xl border border-gray-100 hover:border-primary hover:shadow-sm transition-all text-left"
                    data-testid={`order-L.E {order.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Order #{(order as any).orderNumber || "N/A"}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="font-bold text-lg" data-testid={`total-L.E {order.id}`}>
                          L.E {order.total.toFixed(2)}
                        </p>
                        <span
                          className={`text-xs font-semibold px-5 py-1 rounded-full border L.E {getStatusColor(
                            order.status
                          )}`}
                          data-testid={`status-L.E {order.id}`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </button>

                  {selectedOrder?.id === order.id && (
                    <div className="mt-3 bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-100">
                        <div>
                          <p className="text-xs font-semibold text-gray-500">{t("orderDetailsLabel", language)}</p>
                          <p className="text-sm font-bold text-gray-900">#{selectedOrder.orderNumber || "N/A"}</p>
                        </div>
                        <button
                          onClick={() => setSelectedOrder(null)}
                          className="text-gray-400 hover:text-gray-600"
                          data-testid="button-close-details"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Items Details */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 mb-2">{t("items", language)}</p>
                        <div className="space-y-2">
                          {selectedOrder.items.map((item, idx) => (
                            <div key={`L.E {item.id}-L.E {idx}`} className="flex flex-col gap-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-700">
                                  {item.quantity}x {item.title}
                                </span>
                                <span className="font-semibold text-gray-900">
                                  L.E {(item.quantity * item.price).toFixed(2)}
                                </span>
                              </div>
                              {(item.selectedColor || item.selectedSize || item.selectedUnit) && (
                                <div className="flex flex-wrap gap-1 ml-2">
                                  {item.selectedUnit && <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-semibold">{item.selectedUnit}</span>}
                                  {item.selectedSize && <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[8px] font-semibold">{item.selectedSize}</span>}
                                  {item.selectedColor && (() => {
                                    const [colorName, colorHex] = typeof item.selectedColor === 'string' ? item.selectedColor.split('|') : [item.selectedColor, '#000000'];
                                    return (
                                      <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-semibold" style={{backgroundColor: colorHex || '#000000', color: ['#ffffff', '#f0f0f0', '#e0e0e0'].includes((colorHex || '#000000').toLowerCase()) ? '#000000' : '#ffffff'}}>
                                        {colorName}
                                      </span>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shipping Information */}
                      {(selectedOrder.shippingAddress || selectedOrder.shippingPhone || selectedOrder.shippingZone) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 mb-2">{t("deliveryInfoLabel", language)}</p>
                          <div className="space-y-1.5">
                            {selectedOrder.shippingAddress && (
                              <div>
                                <p className="text-xs text-gray-500">{t("address", language)}</p>
                                <p className="text-xs font-medium text-gray-900">{selectedOrder.shippingAddress}</p>
                              </div>
                            )}
                            {selectedOrder.shippingPhone && (
                              <div>
                                <p className="text-xs text-gray-500">{t("phone", language)}</p>
                                <p className="text-xs font-medium text-gray-900">{selectedOrder.shippingPhone}</p>
                              </div>
                            )}
                            {selectedOrder.shippingZone && (
                              <div>
                                <p className="text-xs text-gray-500">{t("zone", language)}</p>
                                <p className="text-xs font-medium text-gray-900">{selectedOrder.shippingZone}</p>
                              </div>
                            )}
                            {selectedOrder.shippingCost !== undefined && selectedOrder.shippingCost > 0 && (
                              <div>
                                <p className="text-xs text-gray-500">{t("shippingCost", language)}</p>
                                <p className="text-xs font-medium text-gray-900">L.E {selectedOrder.shippingCost.toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Order Summary */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 mb-2">{t("orderSummary", language)}</p>
                        <div className="space-y-1 text-xs">
                          {selectedOrder.subtotal !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">{t("subtotal", language)}</span>
                              <span className="font-medium text-gray-900">L.E {selectedOrder.subtotal.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedOrder.discountedTotal !== undefined && selectedOrder.subtotal !== undefined && selectedOrder.discountedTotal < selectedOrder.subtotal && (
                            <>
                              <div className="flex justify-between text-green-600 font-semibold">
                                <span>{language === "ar" ? "الخصم" : "Discount"}</span>
                                <span>-L.E {(selectedOrder.subtotal - selectedOrder.discountedTotal).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-green-600 font-semibold">
                                <span>{language === "ar" ? "بعد الخصم" : "After Discount"}</span>
                                <span>L.E {selectedOrder.discountedTotal.toFixed(2)}</span>
                              </div>
                            </>
                          )}
                          {selectedOrder.shippingCost !== undefined && selectedOrder.shippingCost > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">{t("shipping", language)}</span>
                              <span className="font-medium text-gray-900">L.E {selectedOrder.shippingCost.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-100">
                            <span>{t("total", language)}</span>
                            <span>L.E {selectedOrder.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-gray-500">
                        <p>{t("placedAt", language)} {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
