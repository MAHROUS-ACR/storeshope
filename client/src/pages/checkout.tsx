import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { ArrowLeft, MapPin, User, Phone, Mail, FileText } from "lucide-react";
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
  const { user, isLoggedIn, isLoading: authLoading, updateUserProfile } = useUser();

  // Form states
  const [paymentSelected, setPaymentSelected] = useState("");
  const [shippingSelected, setShippingSelected] = useState("");
  const [zoneSelected, setZoneSelected] = useState<Zone | null>(null);
  const [zonesList, setZonesList] = useState<Zone[]>([]);
  
  // Customer data
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (!authLoading && user) {
      setCustomerName(user.phone || "");
      setCustomerPhone(user.phone || "");
      if (user.zoneId) {
        const zone = zonesList.find(z => z.id === user.zoneId);
        if (zone) setZoneSelected(zone);
      }
    }
  }, [user, authLoading, zonesList]);

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
        const mappedZones = (zones || []).map((z: any) => ({
          id: z.id,
          name: z.name,
          shippingCost: Number(z.shippingCost) || 0,
        }));
        setZonesList(mappedZones);
      } catch (err) {
        console.error("Failed to load zones:", err);
      } finally {
        setIsLoadingZones(false);
      }
    };
    loadZones();
  }, []);
  
  // Auto-select zone when shipping type changes
  useEffect(() => {
    if (shippingSelected === "saved" && zonesList.length > 0) {
      // Use saved zone if exists, otherwise first zone
      const savedZone = user?.zoneId ? zonesList.find(z => z.id === user.zoneId) : null;
      setZoneSelected(savedZone || zonesList[0]);
    } else if (shippingSelected === "new") {
      setZoneSelected(null);
    }
  }, [shippingSelected, zonesList, user?.zoneId]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = zoneSelected?.shippingCost || 0;
  const grandTotal = subtotal + shipping;
  
  const isFormValid = 
    paymentSelected && 
    shippingSelected && 
    zoneSelected &&
    customerName.trim() &&
    customerPhone.trim() &&
    (shippingSelected === "saved" || deliveryAddress.trim());

  const handleSubmit = async () => {
    console.log("🔵 handleSubmit START");
    
    // Validate
    if (!customerName.trim()) {
      toast.error("اكتب الاسم - Enter name");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("اكتب الهاتف - Enter phone");
      return;
    }
    if (shippingSelected === "new" && !deliveryAddress.trim()) {
      toast.error("اكتب العنوان - Enter address");
      return;
    }
    if (!paymentSelected || !shippingSelected || !zoneSelected) {
      toast.error("اختر جميع الخيارات");
      return;
    }
    if (!items?.length || !user?.id) {
      toast.error("خطأ في البيانات");
      return;
    }

    setIsSubmitting(true);

    try {
      // Save user profile if using saved address
      if (shippingSelected === "saved") {
        await updateUserProfile({
          phone: customerName,
          address: user.address || "",
          zoneId: zoneSelected?.id,
          zoneName: zoneSelected?.name,
        });
      }

      const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      
      const orderObj = {
        id: orderId,
        orderNumber: Math.floor(Date.now() / 1000),
        userId: user.id,
        userEmail: user.email,
        
        // Customer info
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: shippingSelected === "saved" 
          ? `${user.address || zoneSelected?.name}` 
          : deliveryAddress.trim(),
        notes: notes.trim(),
        
        // Order items
        items: items.map(item => ({
          id: item.id || "",
          title: item.title || "",
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
        })),
        
        // Pricing
        subtotal: Number(subtotal) || 0,
        shippingCost: Number(shipping) || 0,
        total: Number(grandTotal) || 0,
        
        // Payment & Shipping
        status: "pending",
        paymentMethod: paymentSelected,
        shippingType: shippingSelected,
        shippingZone: zoneSelected?.name || "",
        shippingZoneId: zoneSelected?.id || "",
      };

      console.log("📝 Order:", JSON.stringify(orderObj, null, 2));
      const savedId = await saveOrder(orderObj);
      
      if (!savedId) throw new Error("Failed to save order");

      toast.success("✅ تم تأكيد الطلب!");
      clearCart();
      Object.keys(localStorage)
        .filter(k => k.startsWith("cart"))
        .forEach(k => localStorage.removeItem(k));

      sendNotificationToAdmins(
        `New Order #${orderObj.orderNumber}`, 
        `${customerName} - L.E ${grandTotal.toFixed(2)}`
      ).catch(() => {});

      setIsSubmitting(false);
      setTimeout(() => setLocation("/"), 2000);
    } catch (error: any) {
      console.error("❌ Error:", error?.message);
      toast.error("خطأ: " + (error?.message || "Unknown"));
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <MobileWrapper>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">السلة فارغة</h2>
            <button
              onClick={() => setLocation("/")}
              className="bg-black text-white px-6 py-3 rounded-lg"
            >
              العودة للتسوق
            </button>
          </div>
        </div>
      </MobileWrapper>
    );
  }

  return (
    <MobileWrapper>
      <div className="w-full flex flex-col h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b px-5 py-4 flex-shrink-0 sticky top-0">
          <button
            onClick={() => setLocation("/cart")}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">🛒 الدفع</h1>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ paddingBottom: "180px" }}>
          
          {/* Order Summary */}
          <section className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <h2 className="font-bold text-lg mb-3">📋 ملخص الطلب</h2>
            <div className="space-y-2 mb-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                  <span>{item.quantity}x {item.title}</span>
                  <span className="text-green-600 font-semibold">L.E {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>L.E {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping:</span>
                <span>L.E {shipping.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-green-600">L.E {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </section>

          {/* Shipping Type */}
          <section className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <h3 className="font-bold text-lg mb-3">📦 طريقة التوصيل</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShippingSelected("saved")}
                className={`w-full p-3 rounded-lg border-2 font-semibold transition ${
                  shippingSelected === "saved" ? "border-black bg-black text-white" : "border-gray-200 bg-white"
                }`}
              >
                📍 استخدام بيانات محفوظة
              </button>
              <button
                onClick={() => setShippingSelected("new")}
                className={`w-full p-3 rounded-lg border-2 font-semibold transition ${
                  shippingSelected === "new" ? "border-black bg-black text-white" : "border-gray-200 bg-white"
                }`}
              >
                ✏️ عنوان جديد
              </button>
            </div>
          </section>

          {/* Customer Info - Saved Address */}
          {shippingSelected === "saved" && (
            <section className="bg-blue-50 rounded-lg p-4 mb-4 border-2 border-blue-300">
              <h3 className="font-bold text-lg mb-3">👤 بيانات الطلب</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="اسمك"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
                <input
                  type="tel"
                  placeholder="رقم الهاتف"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
            </section>
          )}

          {/* Customer Info - New Address */}
          {shippingSelected === "new" && (
            <section className="bg-blue-50 rounded-lg p-4 mb-4 border-2 border-blue-300">
              <h3 className="font-bold text-lg mb-3">📝 بيانات مختلفة</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="اسم المستقبل"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
                <input
                  type="tel"
                  placeholder="رقم هاتف آخر"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
                <textarea
                  placeholder="العنوان الكامل"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none"
                  rows={3}
                />
              </div>
            </section>
          )}

          {/* Zone Selection */}
          {shippingSelected && (
            <section className="bg-yellow-50 rounded-lg p-4 mb-4 border-2 border-yellow-300">
              <h3 className="font-bold text-lg mb-3">📍 اختر المنطقة</h3>
              {isLoadingZones ? (
                <p className="text-center py-4">⏳ جاري التحميل...</p>
              ) : (
                <div className="space-y-2">
                  {zonesList.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => setZoneSelected(z)}
                      className={`w-full p-3 rounded-lg border-2 font-semibold transition ${
                        zoneSelected?.id === z.id ? "border-black bg-black text-white" : "border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex justify-between">
                        <span>{z.name}</span>
                        <span>+ L.E {z.shippingCost}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Payment Method */}
          <section className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <h3 className="font-bold text-lg mb-3">💳 طريقة الدفع</h3>
            <div className="space-y-2">
              <button
                onClick={() => setPaymentSelected("delivery")}
                className={`w-full p-3 rounded-lg border-2 font-semibold ${
                  paymentSelected === "delivery" ? "border-black bg-black text-white" : "border-gray-200 bg-white"
                }`}
              >
                💵 الدفع عند الاستلام
              </button>
              <button
                onClick={() => setPaymentSelected("card")}
                className={`w-full p-3 rounded-lg border-2 font-semibold ${
                  paymentSelected === "card" ? "border-black bg-black text-white" : "border-gray-200 bg-white"
                }`}
              >
                💳 بطاقة ائتمان
              </button>
            </div>
          </section>

          {/* Notes */}
          <section className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <h3 className="font-bold text-lg mb-3">📌 ملاحظات إضافية</h3>
            <textarea
              placeholder="أي ملاحظات؟"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none"
              rows={2}
            />
          </section>

        </div>

        {/* Bottom button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 max-w-[390px] mx-auto">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className={`w-full py-4 rounded-lg font-bold text-lg transition ${
              isSubmitting || !isFormValid
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-black text-white"
            }`}
          >
            {isSubmitting ? "⏳ جاري..." : `✅ اطلب - L.E ${grandTotal.toFixed(2)}`}
          </button>
        </div>
      </div>
    </MobileWrapper>
  );
}
