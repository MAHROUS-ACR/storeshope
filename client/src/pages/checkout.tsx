import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cartContext";
import { useUser } from "@/lib/userContext";
import { toast } from "sonner";
import { getShippingZones, saveOrder } from "@/lib/firebaseOps";
import { sendNotificationToAdmins } from "@/lib/notificationAPI";

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { items, clearCart } = useCart();
  const { user, isLoggedIn, isLoading: authLoading } = useUser();

  const [payment, setPayment] = useState<string>("");
  const [shipping, setShipping] = useState<string>("");
  const [zone, setZone] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);

  // Auth check
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      setLocation("/login");
    }
  }, [isLoggedIn, authLoading, setLocation]);

  // Load zones
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const z = await getShippingZones();
        setZones(z || []);
      } catch (e) {
        console.error("Error loading zones:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingCost = zone?.shippingCost ? parseFloat(zone.shippingCost) : 0;
  const total = subtotal + shippingCost;

  const handleOrder = async () => {
    if (!payment || !shipping || !zone) {
      toast.error("ملء جميع الحقول - Fill all fields");
      return;
    }

    if (items.length === 0) {
      toast.error("السلة فارغة - Cart empty");
      return;
    }

    setPlacing(true);

    try {
      const order = {
        id: `order-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        orderNumber: Math.floor(Date.now() / 1000),
        userId: user?.id,
        items,
        subtotal,
        shippingCost,
        total,
        status: "pending",
        paymentMethod: payment,
        shippingType: shipping,
        shippingZone: zone.name,
        createdAt: new Date().toISOString(),
      };

      const orderId = await saveOrder(order);

      if (orderId) {
        toast.success("✅ تم الطلب");
        clearCart();
        localStorage.removeItem("cart");
        
        sendNotificationToAdmins("New Order", `L.E ${total.toFixed(2)}`).catch(() => {});

        setTimeout(() => setLocation("/cart"), 800);
      } else {
        toast.error("فشل الحفظ");
        setPlacing(false);
      }
    } catch (e) {
      console.error("Order error:", e);
      toast.error("خطأ");
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <MobileWrapper>
        <div className="flex flex-col items-center justify-center h-screen px-5">
          <h2 className="text-xl font-bold mb-4">السلة فارغة</h2>
          <button
            onClick={() => setLocation("/cart")}
            className="px-6 py-3 bg-black text-white rounded-xl font-semibold"
          >
            العودة
          </button>
        </div>
      </MobileWrapper>
    );
  }

  return (
    <MobileWrapper>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="px-5 py-4 border-b">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setLocation("/cart")}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">الدفع</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ paddingBottom: "140px" }}>
          {/* Order Summary */}
          <div className="bg-blue-50 rounded-2xl p-4 mb-6">
            <h2 className="font-bold text-lg mb-3">الملخص</h2>
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm mb-2">
                <span>{item.quantity}x {item.title}</span>
                <span>L.E {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 mb-2 flex justify-between font-semibold">
              <span>المجموع:</span>
              <span>L.E {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>الشحن:</span>
              <span>L.E {shippingCost.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-lg font-bold">
              <span>الإجمالي:</span>
              <span>L.E {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3">الدفع</h3>
            <div className="space-y-2">
              <button
                onClick={() => setPayment("delivery")}
                className={`w-full p-4 rounded-xl border-2 font-semibold ${
                  payment === "delivery"
                    ? "border-black bg-black text-white"
                    : "border-gray-200"
                }`}
              >
                💵 عند الاستلام
              </button>
              <button
                onClick={() => setPayment("card")}
                className={`w-full p-4 rounded-xl border-2 font-semibold ${
                  payment === "card"
                    ? "border-black bg-black text-white"
                    : "border-gray-200"
                }`}
              >
                💳 بطاقة
              </button>
            </div>
          </div>

          {/* Shipping */}
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3">الشحن</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShipping("saved")}
                className={`w-full p-4 rounded-xl border-2 font-semibold ${
                  shipping === "saved"
                    ? "border-black bg-black text-white"
                    : "border-gray-200"
                }`}
              >
                📍 محفوظ
              </button>
              <button
                onClick={() => setShipping("new")}
                className={`w-full p-4 rounded-xl border-2 font-semibold ${
                  shipping === "new"
                    ? "border-black bg-black text-white"
                    : "border-gray-200"
                }`}
              >
                ✏️ جديد
              </button>
            </div>
          </div>

          {/* Zones */}
          {shipping && (
            <div className="mb-6 bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4">
              <h3 className="font-bold text-lg mb-3">المنطقة</h3>
              {loading ? (
                <p className="text-center text-gray-600">جاري التحميل...</p>
              ) : zones.length > 0 ? (
                <div className="space-y-2">
                  {zones.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => setZone(z)}
                      className={`w-full p-4 rounded-xl border-2 font-semibold ${
                        zone?.id === z.id
                          ? "border-black bg-black text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {z.name} - L.E {(z.shippingCost || 0).toFixed(2)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600">لا توجد مناطق</p>
              )}
            </div>
          )}
        </div>

        {/* Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-5 max-w-[390px] mx-auto">
          <button
            onClick={handleOrder}
            disabled={placing}
            className={`w-full py-4 rounded-2xl font-bold text-lg ${
              placing
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-black text-white"
            }`}
          >
            {placing ? "جاري..." : `اطلب الآن - L.E ${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </MobileWrapper>
  );
}
