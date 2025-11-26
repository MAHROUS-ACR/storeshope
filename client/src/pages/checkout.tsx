import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { ArrowLeft, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cartContext";
import { useUser } from "@/lib/userContext";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { toast } from "sonner";
import { getShippingZones, saveOrder } from "@/lib/firebaseOps";
import { sendNotificationToAdmins } from "@/lib/notificationAPI";

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { items, clearCart } = useCart();
  const { user, isLoggedIn, isLoading: authLoading } = useUser();
  const { language } = useLanguage();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "delivery" | null>(null);
  const [shippingType, setShippingType] = useState<"saved" | "new" | null>(null);
  const [selectedZone, setSelectedZone] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingZones, setShippingZones] = useState<any[]>([]);

  // Auth check
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      setLocation("/login");
    }
  }, [isLoggedIn, authLoading, setLocation]);

  // Load shipping zones
  useEffect(() => {
    const load = async () => {
      const zones = await getShippingZones();
      setShippingZones(zones || []);
    };
    load();
  }, []);

  const handlePlaceOrder = async () => {
    try {
      console.log("📤 Place Order called:", { items: items.length, payment: paymentMethod, zone: selectedZone });

      if (!paymentMethod || !shippingType || !selectedZone || items.length === 0) {
        toast.error("Please fill all fields");
        return;
      }

      setIsProcessing(true);

      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const finalTotal = total + shippingCost;

      const orderData = {
        id: `order-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        orderNumber: Math.floor(Date.now() / 1000),
        items,
        total: finalTotal,
        status: "pending",
        paymentMethod,
        shippingType,
        shippingZone: selectedZone,
        shippingCost,
        createdAt: new Date().toISOString(),
        userId: user?.id,
      };

      console.log("💾 Saving order...");
      const savedId = await saveOrder(orderData);

      if (savedId) {
        console.log("✅ Order saved:", savedId);
        toast.success("✅ Order placed!");
        
        setIsProcessing(false);
        clearCart();
        localStorage.removeItem("cart");
        
        sendNotificationToAdmins(
          "New Order",
          `Order placed for L.E ${finalTotal.toFixed(2)}`
        ).catch(() => {});

        setTimeout(() => {
          setLocation("/cart");
        }, 1000);
      } else {
        console.error("❌ Order save failed");
        setIsProcessing(false);
        toast.error("Failed to save order");
      }
    } catch (error) {
      console.error("❌ Error:", error);
      setIsProcessing(false);
      toast.error("Error placing order");
    }
  };

  if (items.length === 0) {
    return (
      <MobileWrapper>
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <h2 className="text-lg font-bold mb-2">Cart is empty</h2>
          <button
            onClick={() => setLocation("/cart")}
            className="px-5 py-2 bg-black text-white rounded-full text-sm font-semibold mt-4"
          >
            Back to cart
          </button>
        </div>
      </MobileWrapper>
    );
  }

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col">
        <div className="px-5 py-4 border-b">
          <button
            onClick={() => setLocation("/cart")}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Payment</h1>
        </div>

        <div className="flex-1 overflow-y-auto pb-40 px-5 py-4">
          {/* Order Summary */}
          <div className="bg-blue-50 rounded-2xl p-4 mb-6">
            <h3 className="font-bold mb-3">Order Summary</h3>
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm mb-2">
                <span>{item.quantity}x {item.title}</span>
                <span>L.E {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 font-bold flex justify-between">
              <span>Total:</span>
              <span>L.E {(items.reduce((sum, item) => sum + item.price * item.quantity, 0) + shippingCost).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <h3 className="font-bold mb-3">Payment Method</h3>
            <button
              onClick={() => setPaymentMethod("delivery")}
              className={`w-full p-4 rounded-xl border-2 mb-3 ${paymentMethod === "delivery" ? "border-black bg-black text-white" : "border-gray-200"}`}
            >
              💳 Cash on Delivery
            </button>
            <button
              onClick={() => setPaymentMethod("card")}
              className={`w-full p-4 rounded-xl border-2 ${paymentMethod === "card" ? "border-black bg-black text-white" : "border-gray-200"}`}
            >
              🏦 Card Payment
            </button>
          </div>

          {/* Shipping */}
          <div className="mb-6">
            <h3 className="font-bold mb-3">Shipping</h3>
            <button
              onClick={() => setShippingType("saved")}
              className={`w-full p-4 rounded-xl border-2 mb-3 ${shippingType === "saved" ? "border-black bg-black text-white" : "border-gray-200"}`}
            >
              📍 Use Saved Address
            </button>
            <button
              onClick={() => setShippingType("new")}
              className={`w-full p-4 rounded-xl border-2 ${shippingType === "new" ? "border-black bg-black text-white" : "border-gray-200"}`}
            >
              ✏️ New Address
            </button>
          </div>

          {/* Shipping Zone */}
          {shippingType && (
            <div className="mb-6">
              <h3 className="font-bold mb-3">Shipping Zone</h3>
              {shippingZones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => {
                    setSelectedZone(zone.name);
                    setShippingCost(zone.cost);
                  }}
                  className={`w-full p-3 rounded-xl border-2 mb-2 ${selectedZone === zone.name ? "border-black bg-black text-white" : "border-gray-200"}`}
                >
                  {zone.name} - L.E {zone.cost}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Sticky Place Order Button at Bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-5 max-w-[390px] mx-auto">
          <button
            onClick={handlePlaceOrder}
            disabled={isProcessing || !paymentMethod || !shippingType || !selectedZone}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Place Order"}
          </button>
        </div>
      </div>
    </MobileWrapper>
  );
}
