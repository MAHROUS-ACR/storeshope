import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { ArrowLeft, MapPin, User, Phone, Mail, FileText, ShoppingBag } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cartContext";
import { useUser } from "@/lib/userContext";
import { toast } from "sonner";
import { getShippingZones, saveOrder } from "@/lib/firebaseOps";

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
      setCustomerName(user.username || user.email?.split("@")[0] || "");
      setCustomerPhone(user.phone || "");
      setDeliveryAddress(user.address || "");
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

      } finally {
        setIsLoadingZones(false);
      }
    };
    loadZones();
  }, []);
  
  // Auto-select zone when shipping type changes
  useEffect(() => {
    if (shippingSelected === "saved" && zonesList.length > 0) {
      const savedZone = user?.zoneId ? zonesList.find(z => z.id === user.zoneId) : null;
      setZoneSelected(savedZone || zonesList[0]);
    } else if (shippingSelected === "new") {
      setZoneSelected(null);
      // Clear delivery address when switching to new address
      setDeliveryAddress("");
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
      if (shippingSelected === "saved") {
        await updateUserProfile({
          phone: customerPhone,
          address: deliveryAddress,
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
        
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: shippingSelected === "saved" 
          ? `${user.address || zoneSelected?.name}` 
          : deliveryAddress.trim(),
        notes: notes.trim(),
        
        items: items.map(item => ({
          id: item.id || "",
          title: item.title || "",
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
        })),
        
        subtotal: Number(subtotal) || 0,
        shippingCost: Number(shipping) || 0,
        total: Number(grandTotal) || 0,
        
        status: "pending",
        paymentMethod: paymentSelected,
        shippingType: shippingSelected,
        shippingZone: zoneSelected?.name || "",
        shippingZoneId: zoneSelected?.id || "",
      };


      const savedId = await saveOrder(orderObj);
      
      if (!savedId) throw new Error("Failed to save order");

      toast.success("✅ تم تأكيد الطلب!");
      clearCart();
      Object.keys(localStorage)
        .filter(k => k.startsWith("cart"))
        .forEach(k => localStorage.removeItem(k));

      setIsSubmitting(false);
      setTimeout(() => setLocation("/"), 2000);
    } catch (error: any) {

      toast.error("خطأ: " + (error?.message || "Unknown"));
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <MobileWrapper>
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center px-6">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">السلة فارغة</h2>
            <p className="text-gray-600 mb-6">لا توجد منتجات في السلة</p>
            <button
              onClick={() => setLocation("/")}
              className="bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-900 transition"
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
      <div className="w-full flex flex-col h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-5 py-4 flex-shrink-0 sticky top-0 shadow-sm">
          <button
            onClick={() => setLocation("/cart")}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3 hover:bg-gray-200 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🛒 الدفع</h1>
            <p className="text-sm text-gray-600">أتمم عملية الشراء</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-5" style={{ paddingBottom: "180px" }}>
          
          {/* Order Summary */}
          <section className="bg-white rounded-xl p-5 mb-5 border border-gray-200 shadow-sm">
            <h2 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" /> ملخص الطلب
            </h2>
            <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-600">الكمية: {item.quantity}</p>
                  </div>
                  <span className="text-green-600 font-bold text-lg">L.E {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>المجموع:</span>
                <span>L.E {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>التوصيل:</span>
                <span className="text-orange-600 font-semibold">+ L.E {shipping.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="font-bold text-lg text-gray-900">الإجمالي:</span>
                <span className="text-2xl font-bold text-green-600">L.E {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </section>

          {/* Shipping Type */}
          <section className="bg-white rounded-xl p-5 mb-5 border border-gray-200 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" /> طريقة التوصيل
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setShippingSelected("saved")}
                className={`w-full p-4 rounded-lg border-2 font-semibold transition flex items-center gap-3 ${
                  shippingSelected === "saved" ? "border-black bg-black text-white shadow-lg" : "border-gray-200 bg-white text-gray-900"
                }`}
              >
                <span className="text-lg">📍</span>
                <div className="text-left">
                  <p>بيانات محفوظة</p>
                  <p className="text-sm opacity-75">استخدم البيانات المحفوظة</p>
                </div>
              </button>
              <button
                onClick={() => setShippingSelected("new")}
                className={`w-full p-4 rounded-lg border-2 font-semibold transition flex items-center gap-3 ${
                  shippingSelected === "new" ? "border-black bg-black text-white shadow-lg" : "border-gray-200 bg-white text-gray-900"
                }`}
              >
                <span className="text-lg">✏️</span>
                <div className="text-left">
                  <p>عنوان جديد</p>
                  <p className="text-sm opacity-75">أدخل بيانات مختلفة</p>
                </div>
              </button>
            </div>
          </section>

          {/* Customer & Delivery Info Combined */}
          {shippingSelected && (
            <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-5 border-2 border-blue-300 shadow-md">
              <h3 className="font-bold text-lg text-gray-900 mb-5 flex items-center gap-2">
                <User className="w-5 h-5" />
                {shippingSelected === "saved" ? "بيانات الطلب" : "بيانات التوصيل"}
              </h3>
              
              {/* Customer Info Fields */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">👤 الاسم</label>
                  <input
                    type="text"
                    placeholder={shippingSelected === "saved" ? "اسمك الكامل" : "اسم المستقبل"}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={shippingSelected === "saved"}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      shippingSelected === "saved" 
                        ? "bg-gray-100 border-gray-300 text-gray-600 cursor-not-allowed" 
                        : "bg-white border-gray-300"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📱 رقم الهاتف</label>
                  <input
                    type="tel"
                    placeholder="+201012345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    disabled={shippingSelected === "saved"}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      shippingSelected === "saved" 
                        ? "bg-gray-100 border-gray-300 text-gray-600 cursor-not-allowed" 
                        : "bg-white border-gray-300"
                    }`}
                  />
                </div>
                {shippingSelected === "new" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">📍 العنوان الكامل</label>
                    <textarea
                      placeholder="الشارع، الحي، المدينة"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
                      rows={3}
                    />
                  </div>
                )}
                {shippingSelected === "saved" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">📍 العنوان المحفوظ</label>
                    <textarea
                      placeholder="عنوانك المحفوظ"
                      value={deliveryAddress}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed resize-none"
                      rows={2}
                    />
                  </div>
                )}
                {shippingSelected === "saved" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">✉️ البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              {/* Zone Selection Inside */}
              <div className="border-t-2 border-blue-200 pt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-lg">🚚</span> منطقة التوصيل
                </label>
                {isLoadingZones ? (
                  <p className="text-center py-4 text-gray-600">⏳ جاري تحميل المناطق...</p>
                ) : zonesList.length === 0 ? (
                  <p className="text-center py-4 text-gray-600">لا توجد مناطق متاحة</p>
                ) : (
                  <select
                    value={zoneSelected?.id || ""}
                    onChange={(e) => {
                      const zone = zonesList.find(z => z.id === e.target.value);
                      if (zone) setZoneSelected(zone);
                    }}
                    disabled={shippingSelected === "saved"}
                    className={`w-full px-4 py-3 border-2 rounded-lg font-semibold transition ${
                      shippingSelected === "saved"
                        ? "bg-gray-100 border-gray-300 text-gray-600 cursor-not-allowed"
                        : "bg-white border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    }`}
                  >
                    <option value="">-- اختر منطقة التوصيل --</option>
                    {zonesList.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} - L.E {z.shippingCost}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </section>
          )}

          {/* Payment Method */}
          <section className="bg-white rounded-xl p-5 mb-5 border border-gray-200 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 mb-4">💳 طريقة الدفع</h3>
            <div className="space-y-2">
              <button
                onClick={() => setPaymentSelected("delivery")}
                className={`w-full p-4 rounded-lg border-2 font-semibold transition flex items-center gap-3 ${
                  paymentSelected === "delivery" ? "border-black bg-black text-white shadow-lg" : "border-gray-200 bg-white text-gray-900"
                }`}
              >
                <span className="text-xl">💵</span>
                الدفع عند الاستلام
              </button>
              <button
                onClick={() => setPaymentSelected("card")}
                className={`w-full p-4 rounded-lg border-2 font-semibold transition flex items-center gap-3 ${
                  paymentSelected === "card" ? "border-black bg-black text-white shadow-lg" : "border-gray-200 bg-white text-gray-900"
                }`}
              >
                <span className="text-xl">💳</span>
                بطاقة ائتمان
              </button>
            </div>
          </section>

          {/* Card Payment Details */}
          {paymentSelected === "card" && (
            <section className="bg-purple-50 rounded-xl p-5 mb-5 border-2 border-purple-200">
              <h3 className="font-bold text-lg text-gray-900 mb-4">💳 بيانات البطاقة</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">اسم حامل البطاقة</label>
                  <input
                    type="text"
                    placeholder="اسمك كما يظهر على البطاقة"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">رقم البطاقة</label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">انتهاء الصلاحية</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Notes */}
          <section className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" /> ملاحظات إضافية (اختياري)
            </h3>
            <textarea
              placeholder="أي ملاحظات خاصة بالطلب؟"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
              rows={2}
            />
          </section>

        </div>

        {/* Bottom button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 max-w-[390px] mx-auto shadow-2xl">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className={`w-full py-4 rounded-xl font-bold text-lg transition transform ${
              isSubmitting || !isFormValid
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-black to-gray-800 text-white hover:shadow-lg active:scale-95"
            }`}
          >
            {isSubmitting ? "⏳ جاري المعالجة..." : `✅ اطلب الآن - L.E ${grandTotal.toFixed(2)}`}
          </button>
        </div>
      </div>
    </MobileWrapper>
  );
}
