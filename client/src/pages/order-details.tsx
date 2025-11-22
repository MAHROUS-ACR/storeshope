import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Edit2, Check, X } from "lucide-react";
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
  orderNumber?: number;
  userId?: string;
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

export default function OrderDetailsPage() {
  const [location, setLocation] = useLocation();
  const { user, isLoggedIn, isLoading: authLoading } = useUser();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  // Extract order ID from URL
  const orderId = location.split("/order/")[1]?.split("?")[0];

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      setLocation("/login");
    }
  }, [isLoggedIn, authLoading, setLocation]);

  useEffect(() => {
    if (!orderId) return;

    setIsLoading(true);
    try {
      const savedOrders = localStorage.getItem("orders");
      if (savedOrders) {
        const allOrders = JSON.parse(savedOrders);
        const foundOrder = allOrders.find((o: Order) => o.id === orderId);
        // Allow access if: admin user, order belongs to current user, or order has no userId
        if (foundOrder && ((user && user.role === 'admin') || foundOrder.userId === user?.id || !foundOrder.userId)) {
          setOrder(foundOrder);
        }
      }
    } catch (error) {
      console.error("Error loading order:", error);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, user]);

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

  const handleStatusUpdate = (newSts: string) => {
    if (!newSts || !order) return;
    
    try {
      const savedOrders = localStorage.getItem("orders");
      if (savedOrders) {
        const allOrders = JSON.parse(savedOrders);
        const updatedOrders = allOrders.map((o: Order) => 
          o.id === order.id ? { ...o, status: newSts } : o
        );
        localStorage.setItem("orders", JSON.stringify(updatedOrders));
        setOrder({ ...order, status: newSts });
        setEditingStatus(false);
        setNewStatus("");
        toast.success("Order status updated");
      }
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pb-4 pt-2 flex items-center gap-4 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setLocation("/orders")}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Order Details</h1>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : !order ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-lg font-bold mb-2">Order not found</h2>
            <button
              onClick={() => setLocation("/orders")}
              className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold mt-4"
            >
              Back to Orders
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar pb-24 w-full">
            <div className="w-full px-6 py-4 space-y-4">
              {/* Order Header */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="font-semibold text-lg font-mono">#{order.orderNumber || order.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  {editingStatus ? (
                    <div className="flex gap-1">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                        onClick={() => handleStatusUpdate(newStatus)}
                        className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingStatus(false);
                          setNewStatus("");
                        }}
                        className="p-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setEditingStatus(true);
                            setNewStatus(order.status);
                          }}
                          className="p-1 text-primary hover:bg-primary/10 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                </p>
                {order.paymentMethod && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.paymentMethod === "card" ? "💳 Card Payment" : "🚚 Pay on Delivery"}
                  </p>
                )}
              </div>

              {/* Items */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-semibold text-sm mb-3">Items</h3>
                <div className="space-y-3">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <div key={idx} className="pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                        <div className="flex justify-between mb-1">
                          <p className="text-sm font-medium">{item.quantity}x {item.title}</p>
                          <p className="text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                        {(item.selectedColor || item.selectedSize || item.selectedUnit) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.selectedUnit && (
                              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                                {item.selectedUnit}
                              </span>
                            )}
                            {item.selectedSize && (
                              <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                                {item.selectedSize}
                              </span>
                            )}
                            {item.selectedColor && (() => {
                              const [colorName, colorHex] = typeof item.selectedColor === 'string' 
                                ? item.selectedColor.split('|') 
                                : [item.selectedColor, '#000000'];
                              return (
                                <span 
                                  className="inline-block px-2 py-1 rounded text-[10px] font-medium text-white"
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
                    <p className="text-xs text-muted-foreground">No items</p>
                  )}
                </div>
              </div>

              {/* Shipping Details */}
              {(order.shippingAddress || order.shippingPhone || order.shippingZone) && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <h3 className="font-semibold text-sm mb-3">Delivery Information</h3>
                  <div className="space-y-3">
                    {order.shippingAddress && (
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="text-sm font-medium">{order.shippingAddress}</p>
                      </div>
                    )}
                    {order.shippingPhone && (
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium">{order.shippingPhone}</p>
                      </div>
                    )}
                    {order.shippingZone && (
                      <div>
                        <p className="text-xs text-muted-foreground">Zone</p>
                        <p className="text-sm font-medium">{order.shippingZone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-semibold text-sm mb-3">Order Summary</h3>
                <div className="space-y-2">
                  {order.subtotal !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${order.subtotal.toFixed(2)}</span>
                    </div>
                  )}
                  {order.shippingCost !== undefined && order.shippingCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>${order.shippingCost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-gray-100 pt-2 mt-2">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
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
