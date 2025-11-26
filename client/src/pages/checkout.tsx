import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cartContext";
import { useUser } from "@/lib/userContext";
import { toast } from "sonner";
import { getShippingZones, saveOrder } from "@/lib/firebaseOps";
import { sendNotificationToAdmins } from "@/lib/notificationAPI";

interface Zone {
  id: string;
  name: string;
  shippingCost: number;
}

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { items, clearCart } = useCart();
  const { user, isLoggedIn, isLoading: authLoading } = useUser();

  const [paymentSelected, setPaymentSelected] = useState("");
  const [shippingSelected, setShippingSelected] = useState("");
  const [zoneSelected, setZoneSelected] = useState<Zone | null>(null);
  const [zonesList, setZonesList] = useState<Zone[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      setLocation("/login");
    }
  }, [isLoggedIn, authLoading, setLocation]);

  // Load shipping zones
  useEffect(() => {
    const loadZones = async () => {
      setIsLoadingZones(true);
      try {
        const zones = await getShippingZones();
        setZonesList(
          (zones || []).map((z: any) => ({
            id: z.id,
            name: z.name,
            shippingCost: Number(z.shippingCost) || 0,
          }))
        );
      } catch (err) {
        console.error("Failed to load zones:", err);
        toast.error("Failed to load zones");
      } finally {
        setIsLoadingZones(false);
      }
    };
    loadZones();
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = zoneSelected?.shippingCost || 0;
  const grandTotal = subtotal + shipping;
  const isFormValid = paymentSelected && shippingSelected && zoneSelected;

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error("اختر جميع الخيارات - Select all options");
      return;
    }

    if (!items || items.length === 0) {
      toast.error("السلة فارغة - Cart is empty");
      return;
    }

    if (!user?.id) {
      toast.error("يجب تسجيل الدخول - You must login");
      return;
    }

    setIsSubmitting(true);

    try {
      const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const orderObj = {
        id: orderId,
        orderNumber: Math.floor(Date.now() / 1000),
        userId: user.id,
        items: [...items],
        subtotal,
        shippingCost: shipping,
        total: grandTotal,
        status: "pending",
        paymentMethod: paymentSelected,
        shippingType: shippingSelected,
        shippingZone: zoneSelected?.name,
        createdAt: new Date().toISOString(),
      };

      console.log("📝 Submitting order:", orderObj);
      const savedId = await saveOrder(orderObj);
      if (!savedId) throw new Error("saveOrder returned null");

      console.log("✅ Order saved successfully:", savedId);
      toast.success("✅ تم الطلب");

      // تنظيف السلة
      clearCart();
      Object.keys(localStorage)
        .filter(k => k.startsWith("cart"))
        .forEach(k => localStorage.removeItem(k));

      // إرسال notification
      sendNotificationToAdmins("New Order", `L.E ${grandTotal.toFixed(2)}`).catch(() => {});

      setIsSubmitting(false);
      
      // Refresh page after 2 seconds to reset all values and Firebase state
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("❌ Order error:", error?.message || error);
      toast.error("خطأ في الطلب - " + (error?.message || "Unknown error"));
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <MobileWrapper>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">السلة فارغة - Empty Cart</h2>
            <button
              onClick={() => setLocation("/cart")}
              className="bg-black text-white px-6 py-3 rounded-lg font-semibold"
            >
              العودة - Back
            </button>
          </div>
        </div>
      </MobileWrapper>
    );
  }

  return (
    <MobileWrapper>
      <div className="w-full flex flex-col h-screen bg-white">
        {/* Header */}
        <div className="border-b px-5 py-4 flex-shrink-0">
          <button
            onClick={() => setLocation("/cart")}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3 hover:bg-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">الدفع - Checkout</h1>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ paddingBottom: "160px" }}>
          {/* Order Summary */}
          <section className="bg-blue-50 rounded-xl p-4 mb-6">
            <h2 className="font-bold text-lg mb-3">ملخص الطلب - Order Summary</h2>
            <div className="space-y-2 mb-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.title}</span>
                  <span>L.E {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 mb-2">
              <div className="flex justify-between font-semibold">
                <span>Subtotal:</span>
                <span>L.E {subtotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Shipping:</span>
              <span>L.E {shipping.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>L.E {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </section>

          {/* Payment Method */}
          <section className="mb-6">
            <h3 className="font-bold text-lg mb-3">طريقة الدفع - Payment Method</h3>
            <div className="space-y-2">
              <button
                onClick={() => setPaymentSelected("delivery")}
                className={`w-full p-4 rounded-lg border-2 font-semibold transition ${
                  paymentSelected === "delivery" ? "border-black bg-black text-white" : "border-gray-200 bg-white"
                }`}
              >
                💵 الدفع عند الاستلام - Cash on Delivery
              </button>
              <button
                onClick={() => setPaymentSelected("card")}
                className={`w-full p-4 rounded-lg border-2 font-semibold transition ${
                  paymentSelected === "card" ? "border-black bg-black text-white" : "border-gray-200 bg-white"
                }`}
              >
                💳 بطاقة ائتمان - Card Payment
              </button>
            </div>
          </section>

          {/* Shipping Type */}
          <section className="mb-6">
            <h3 className="font-bold text-lg mb-3">الشحن - Shipping</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShippingSelected("saved")}
                className={`w-full p-4 rounded-lg border-2 font-semibold transition ${
                  shippingSelected === "saved" ? "border-black bg-black text-white" : "border-gray-200 bg-white"
                }`}
              >
                📍 العنوان المحفوظ - Saved Address
              </button>
              <button
                onClick={() => setShippingSelected("new")}
                className={`w-full p-4 rounded-lg border-2 font-semibold transition ${
                  shippingSelected === "new" ? "border-black bg-black text-white" : "border-gray-200 bg-white"
                }`}
              >
                ✏️ عنوان جديد - New Address
              </button>
            </div>
          </section>

          {/* Zones */}
          {shippingSelected && (
            <section className="mb-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-3">المنطقة - Select Zone</h3>
              {isLoadingZones ? (
                <p className="text-center text-gray-600 py-4">⏳ جاري التحميل...</p>
              ) : zonesList.length === 0 ? (
                <p className="text-center text-gray-600 py-4">لا توجد مناطق</p>
              ) : (
                <div className="space-y-2">
                  {zonesList.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => setZoneSelected(z)}
                      className={`w-full p-4 rounded-lg border-2 font-semibold transition ${
                        zoneSelected?.id === z.id ? "border-black bg-black text-white" : "border-gray-300 bg-white"
                      }`}
                    >
                      {z.name} - L.E {z.shippingCost.toFixed(2)}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Bottom button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 max-w-[390px] mx-auto">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className={`w-full py-4 rounded-lg font-bold text-lg transition ${
              isSubmitting || !isFormValid
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-black text-white hover:bg-gray-900 active:scale-95"
            }`}
          >
            {isSubmitting ? "⏳ جاري الحفظ..." : `✅ اطلب الآن - Place Order`}
          </button>
        </div>
      </div>
    </MobileWrapper>
  );
}
