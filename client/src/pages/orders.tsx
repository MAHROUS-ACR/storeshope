import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CartItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  image?: string;
}

interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: string;
  paymentMethod?: string;
  createdAt: string;
}

export default function OrdersPage() {
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      try {
        // Try to fetch from server
        const response = await fetch("/api/orders");
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setOrders(data);
            // Save to localStorage as backup
            localStorage.setItem("orders", JSON.stringify(data));
          } else {
            // Fallback to localStorage
            const savedOrders = localStorage.getItem("orders");
            if (savedOrders) {
              setOrders(JSON.parse(savedOrders));
            }
          }
        } else {
          // Fallback to localStorage on error
          const savedOrders = localStorage.getItem("orders");
          if (savedOrders) {
            setOrders(JSON.parse(savedOrders));
          }
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        // Fallback to localStorage
        try {
          const savedOrders = localStorage.getItem("orders");
          if (savedOrders) {
            setOrders(JSON.parse(savedOrders));
          }
        } catch (e) {
          console.error("Failed to load from localStorage:", e);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
    // Refresh orders when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchOrders();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

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
      <div className="flex-1 flex flex-col overflow-hidden">
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
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 bg-white rounded-2xl border border-gray-100"
                  data-testid={`order-${order.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Order ID</p>
                      <p className="font-semibold text-sm font-mono">{order.id.slice(0, 12)}</p>
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

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                      <p className="font-bold text-lg" data-testid={`total-${order.id}`}>
                        ${order.total.toFixed(2)}
                      </p>
                    </div>
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
