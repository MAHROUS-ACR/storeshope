import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/userContext";
import { toast } from "sonner";

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
  items: CartItem[];
  total: number;
  status: string;
  paymentMethod?: string;
  createdAt: string;
  subtotal?: number;
  shippingCost?: number;
  shippingAddress?: string;
  shippingPhone?: string;
  shippingZone?: string;
}

export default function OrdersPage() {
  const [location, setLocation] = useLocation();
  const { user, isLoggedIn, isLoading: authLoading } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      setLocation("/login");
    }
  }, [isLoggedIn, authLoading, setLocation]);

  useEffect(() => {
    async function fetchOrders() {
      setIsLoading(true);
      try {
        // Check Firebase status
        const statusResponse = await fetch("/api/firebase/status");
        const status = await statusResponse.json();
        setFirebaseConfigured(status.configured);

        // If Firebase is configured and user exists, fetch from server
        if (status.configured && user?.id) {
          // Fetch orders from Firebase via server
          const response = await fetch("/api/orders", {
            headers: {
              "x-user-id": user.id,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setOrders(data || []);
            // Update localStorage with server data
            if (data && data.length > 0) {
              localStorage.setItem("orders", JSON.stringify(data));
            }
          } else {
            // Fallback to localStorage on error
            const savedOrders = localStorage.getItem("orders");
            if (savedOrders) {
              setOrders(JSON.parse(savedOrders));
            } else {
              setOrders([]);
            }
          }
        } else {
          // Firebase not configured - use localStorage
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
  }, [location, user]);

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
        <div className="px-6 pb-4 pt-2 flex items-center gap-4 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setLocation("/")}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">My Orders</h1>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📦</span>
            </div>
            <h2 className="text-lg font-bold mb-2">No orders yet</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Your orders will appear here once you place one
            </p>
            <button
              onClick={() => setLocation("/")}
              className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold"
              data-testid="button-start-shopping"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar pb-24 w-full">
            <div className="w-full px-6 py-4 space-y-3">
              {orders.filter(order => !user || !(order as any).userId || (order as any).userId === user.id).map((order) => (
                <div
                  key={order.id}
                  className="p-4 bg-white rounded-2xl border border-gray-100"
                  data-testid={`order-${order.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Order Number</p>
                      <p className="font-semibold text-sm font-mono">#{(order as any).orderNumber || "N/A"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full border ${getStatusColor(
                          order.status
                        )}`}
                        data-testid={`status-${order.id}`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      {order.paymentMethod && (
                        <p className="text-xs text-muted-foreground">
                          {order.paymentMethod === "card" ? "💳 Card" : "🚚 On Delivery"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Items List */}
                  {order.items && order.items.length > 0 ? (
                    <div className="space-y-2 mb-3 pb-3 border-b border-gray-100">
                      {order.items.slice(0, 2).map((item, i) => (
                        <div key={i} data-testid={`item-${order.id}-${i}`}>
                          <p className="text-xs font-medium">{item.quantity}x {item.title}</p>
                          {(item.selectedColor || item.selectedSize || item.selectedUnit) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.selectedUnit && <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px]">{item.selectedUnit}</span>}
                              {item.selectedSize && <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[8px]">{item.selectedSize}</span>}
                              {item.selectedColor && (() => {
                                const [colorName, colorHex] = typeof item.selectedColor === 'string' ? item.selectedColor.split('|') : [item.selectedColor, '#000000'];
                                return (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-medium" style={{backgroundColor: colorHex || '#000000', color: ['#ffffff', '#f0f0f0', '#e0e0e0'].includes((colorHex || '#000000').toLowerCase()) ? '#000000' : '#ffffff'}}>
                                    {colorName}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-xs text-muted-foreground font-medium">
                          +{order.items.length - 2} more items
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mb-3 pb-3 border-b border-gray-100">
                      <p className="text-xs text-muted-foreground">No items</p>
                    </div>
                  )}

                  {/* Shipping Details */}
                  {((order as any).shippingAddress || (order as any).shippingPhone || (order as any).shippingZone) && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-700">Delivery Information</p>
                      {(order as any).shippingAddress && (
                        <div className="text-xs">
                          <p className="text-gray-500">Address:</p>
                          <p className="font-medium">{(order as any).shippingAddress}</p>
                        </div>
                      )}
                      {(order as any).shippingPhone && (
                        <div className="text-xs">
                          <p className="text-gray-500">Phone:</p>
                          <p className="font-medium">{(order as any).shippingPhone}</p>
                        </div>
                      )}
                      {(order as any).shippingZone && (
                        <div className="text-xs">
                          <p className="text-gray-500">Zone:</p>
                          <p className="font-medium">{(order as any).shippingZone}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2 border border-gray-100">
                    {(order as any).subtotal !== undefined && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Subtotal:</span>
                        <span>${((order as any).subtotal || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {(order as any).shippingCost !== undefined && (order as any).shippingCost > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Shipping:</span>
                        <span>${((order as any).shippingCost || 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
                      <span>Total:</span>
                      <span data-testid={`total-${order.id}`}>${order.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
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
