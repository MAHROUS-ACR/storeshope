import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { ArrowLeft, MapPin, User, Phone, Mail, FileText, ShoppingBag } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cartContext";
import { useUser } from "@/lib/userContext";
import { useLanguage } from "@/lib/languageContext";
import { toast } from "sonner";
import { getShippingZones, saveOrder, getDiscounts } from "@/lib/firebaseOps";
import { getActiveDiscount, calculateDiscountedPrice, getDiscountAmount } from "@/lib/discountUtils";
import { MapSelector } from "@/components/map-selector";

interface Discount {
  id: string;
  productId: string;
  discountPercentage: number | string;
  startDate: string | Date;
  endDate: string | Date;
}

interface Zone {
  id: string;
  name: string;
  shippingCost: number;
}

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { items, clearCart } = useCart();
  const { user, isLoggedIn, isLoading: authLoading, updateUserProfile } = useUser();
  const { language } = useLanguage();

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
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

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

  // Load shipping zones and discounts
  useEffect(() => {
    const loadZonesAndDiscounts = async () => {
      setIsLoadingZones(true);
      try {
        const zones = await getShippingZones();
        const mappedZones = (zones || []).map((z: any) => ({
          id: z.id,
          name: z.name,
          shippingCost: Number(z.shippingCost) || 0,
        }));
        setZonesList(mappedZones);
        
        const discountsList = await getDiscounts();
        setDiscounts(discountsList);
      } catch (err) {

      } finally {
        setIsLoadingZones(false);
      }
    };
    loadZonesAndDiscounts();
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

  // Calculate subtotal with discounts
  let subtotal = 0;
  let totalDiscount = 0;
  items.forEach(item => {
    const itemSubtotal = item.price * item.quantity;
    const discount = getActiveDiscount(item.id, discounts);
    if (discount) {
      const discountAmount = getDiscountAmount(itemSubtotal, discount.discountPercentage);
      totalDiscount += discountAmount;
      subtotal += itemSubtotal - discountAmount;
    } else {
      subtotal += itemSubtotal;
    }
  });
  
  const shipping = zoneSelected?.shippingCost || 0;
  const grandTotal = subtotal + shipping;
  const originalSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
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
        locationLat: locationCoords?.lat,
        locationLng: locationCoords?.lng,
        notes: notes.trim(),
        
        items: items.map(item => ({
          id: item.id || "",
          title: item.title || "",
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          selectedColor: item.selectedColor || "",
          selectedSize: item.selectedSize || "",
          selectedUnit: item.selectedUnit || "",
          image: item.image || "",
        })),
        
        subtotal: Number(originalSubtotal) || 0,
        discountedTotal: Number(subtotal) || 0,
        discountAmount: Number(totalDiscount) || 0,
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
            <h1 className="text-2xl font-bold text-gray-900">🛒 {language === "ar" ? "الدفع" : "Checkout"}</h1>
            <p className="text-sm text-gray-600">{language === "ar" ? "أتمم عملية الشراء" : "Complete your purchase"}</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-5" style={{ paddingBottom: "180px" }}>
          
          {/* Order Summary */}
          <section className="bg-white rounded-xl p-5 mb-5 border border-gray-200 shadow-sm">
            <h2 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" /> {language === "ar" ? "ملخص الطلب" : "Order Summary"}
            </h2>
            <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
              {items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.quantity}x {item.title}</p>
                    </div>
                    <span className="text-green-600 font-bold text-lg ml-2">L.E {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  {(item.selectedColor || item.selectedSize || item.selectedUnit) && (
                    <div className="mt-2 p-2 bg-white rounded border border-gray-200 text-[10px] space-y-1">
                      {item.selectedUnit && <div className="font-semibold text-gray-600 flex items-center gap-1">{language === "ar" ? "الوحدة:" : "Unit:"} <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium text-[11px]">{item.selectedUnit}</span></div>}
                      {item.selectedSize && <div className="font-semibold text-gray-600 flex items-center gap-1">{language === "ar" ? "المقاس:" : "Size:"} <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium text-[11px]">{item.selectedSize}</span></div>}
                      {item.selectedColor && (() => {
                        const [colorName, colorHex] = typeof item.selectedColor === 'string' 
                          ? item.selectedColor.split('|') 
                          : [item.selectedColor, '#000000'];
                        return (
                          <div className="font-semibold text-gray-600 flex items-center gap-1">{language === "ar" ? "اللون:" : "Color:"} <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-300 bg-white text-[11px] font-medium"><span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block" style={{backgroundColor: colorHex || '#000000'}}></span>{colorName}</span></div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>{language === "ar" ? "الأصلي:" : "Original:"}</span>
                <span>L.E {originalSubtotal.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>{language === "ar" ? "الخصم:" : "Discount:"}</span>
                  <span>-L.E {totalDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>{language === "ar" ? "المجموع:" : "Subtotal:"}</span>
                <span>L.E {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>{language === "ar" ? "التوصيل:" : "Shipping:"}</span>
                <span className="text-orange-600 font-semibold">+ L.E {shipping.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="font-bold text-lg text-gray-900">{language === "ar" ? "الإجمالي:" : "Total:"}</span>
                <span className="text-2xl font-bold text-green-600">L.E {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </section>

          {/* Shipping Type */}
          <section className="bg-white rounded-xl p-5 mb-5 border border-gray-200 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" /> {language === "ar" ? "طريقة التوصيل" : "Delivery Method"}
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setShippingSelected("saved")}
                className={`w-full p-4 rounded-lg border-2 font-semibold transition flex items-center gap-3 ${
                  shippingSelected === "saved" ? "border-black bg-black text-white shadow-lg" : "border-gray-200 bg-white text-gray-900"
                }`}
              >
                <span className="text-lg">📍</span>
                <div className={language === "ar" ? "text-left" : "text-right"}>
                  <p>{language === "ar" ? "بيانات محفوظة" : "Saved Address"}</p>
                  <p className="text-sm opacity-75">{language === "ar" ? "استخدم البيانات المحفوظة" : "Use saved address"}</p>
                </div>
              </button>
              <button
                onClick={() => setShippingSelected("new")}
                className={`w-full p-4 rounded-lg border-2 font-semibold transition flex items-center gap-3 ${
                  shippingSelected === "new" ? "border-black bg-black text-white shadow-lg" : "border-gray-200 bg-white text-gray-900"
                }`}
              >
                <span className="text-lg">✏️</span>
                <div className={language === "ar" ? "text-left" : "text-right"}>
                  <p>{language === "ar" ? "عنوان جديد" : "New Address"}</p>
                  <p className="text-sm opacity-75">{language === "ar" ? "أدخل بيانات مختلفة" : "Enter different details"}</p>
                </div>
              </button>
            </div>
          </section>

          {/* Customer & Delivery Info Combined */}
          {shippingSelected && (
            <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-5 border-2 border-blue-300 shadow-md">
              <h3 className="font-bold text-lg text-gray-900 mb-5 flex items-center gap-2">
                <User className="w-5 h-5" />
                {language === "ar" ? (shippingSelected === "saved" ? "بيانات الطلب" : "بيانات التوصيل") : (shippingSelected === "saved" ? "Order Information" : "Delivery Information")}
              </h3>
              
              {/* Customer Info Fields */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">👤 {language === "ar" ? "الاسم" : "Name"}</label>
                  <input
                    type="text"
                    placeholder={language === "ar" ? (shippingSelected === "saved" ? "اسمك الكامل" : "اسم المستقبل") : (shippingSelected === "saved" ? "Your full name" : "Recipient's name")}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📱 {language === "ar" ? "رقم الهاتف" : "Phone"}</label>
                  <input
                    type="tel"
                    placeholder={language === "ar" ? "+201012345678" : "+20 1012345678"}
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
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() => setShowMapSelector(!showMapSelector)}
                        className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
                      >
                        {showMapSelector ? (language === "ar" ? "❌ إغلاق الخريطة" : "❌ Close Map") : (language === "ar" ? "🗺️ اختر من الخريطة" : "🗺️ Choose from Map")}
                      </button>
                    </div>
                    
                    {showMapSelector && (
                      <div className="mb-4 border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50">
                        <MapSelector
                          onLocationSelect={(address, lat, lng) => {
                            setDeliveryAddress(address);
                            setLocationCoords({ lat, lng });
                            setShowMapSelector(false);
                            toast.success(language === "ar" ? "✅ تم تحديد الموقع" : "✅ Location set");
                          }}
                          initialAddress={deliveryAddress}
                          initialLat={locationCoords?.lat}
                          initialLng={locationCoords?.lng}
                        />
                      </div>
                    )}
                    
                    <label className="block text-sm font-semibold text-gray-700 mb-2">📍 {language === "ar" ? "العنوان الكامل" : "Full Address"}</label>
                    <textarea
                      placeholder={language === "ar" ? "الشارع، الحي، المدينة أو اختر من الخريطة" : "Street, District, City or choose from map"}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
                      rows={3}
                    />
                  </div>
                )}
                {shippingSelected === "saved" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">📍 {language === "ar" ? "العنوان المحفوظ" : "Saved Address"}</label>
                    <textarea
                      placeholder={language === "ar" ? "عنوانك المحفوظ" : "Your saved address"}
                      value={deliveryAddress}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed resize-none"
                      rows={2}
                    />
                  </div>
                )}
                {shippingSelected === "saved" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">✉️ {language === "ar" ? "البريد الإلكتروني" : "Email"}</label>
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
                  <span className="text-lg">🚚</span> {language === "ar" ? "منطقة التوصيل" : "Delivery Zone"}
                </label>
                {isLoadingZones ? (
                  <p className="text-center py-4 text-gray-600">{language === "ar" ? "⏳ جاري تحميل المناطق..." : "⏳ Loading zones..."}</p>
                ) : zonesList.length === 0 ? (
                  <p className="text-center py-4 text-gray-600">{language === "ar" ? "لا توجد مناطق متاحة" : "No zones available"}</p>
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
                    <option value="">{language === "ar" ? "-- اختر منطقة التوصيل --" : "-- Select delivery zone --"}</option>
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
            <h3 className="font-bold text-lg text-gray-900 mb-4">💳 {language === "ar" ? "طريقة الدفع" : "Payment Method"}</h3>
            <div className="space-y-2">
              <button
                onClick={() => setPaymentSelected("delivery")}
                className={`w-full p-4 rounded-lg border-2 font-semibold transition flex items-center gap-3 ${
                  paymentSelected === "delivery" ? "border-black bg-black text-white shadow-lg" : "border-gray-200 bg-white text-gray-900"
                }`}
              >
                <span className="text-xl">💵</span>
                {language === "ar" ? "الدفع عند الاستلام" : "Pay on Delivery"}
              </button>
              <button
                onClick={() => setPaymentSelected("card")}
                className={`w-full p-4 rounded-lg border-2 font-semibold transition flex items-center gap-3 ${
                  paymentSelected === "card" ? "border-black bg-black text-white shadow-lg" : "border-gray-200 bg-white text-gray-900"
                }`}
              >
                <span className="text-xl">💳</span>
                {language === "ar" ? "بطاقة ائتمان" : "Credit Card"}
              </button>
            </div>
          </section>

          {/* Card Payment Details */}
          {paymentSelected === "card" && (
            <section className="bg-purple-50 rounded-xl p-5 mb-5 border-2 border-purple-200">
              <h3 className="font-bold text-lg text-gray-900 mb-4">💳 {language === "ar" ? "بيانات البطاقة" : "Card Details"}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{language === "ar" ? "اسم حامل البطاقة" : "Cardholder Name"}</label>
                  <input
                    type="text"
                    placeholder={language === "ar" ? "اسمك كما يظهر على البطاقة" : "Your name as shown on card"}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{language === "ar" ? "رقم البطاقة" : "Card Number"}</label>
                  <input
                    type="text"
                    placeholder={language === "ar" ? "1234 5678 9012 3456" : "1234 5678 9012 3456"}
                    maxLength={19}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{language === "ar" ? "انتهاء الصلاحية" : "Expiry"}</label>
                    <input
                      type="text"
                      placeholder={language === "ar" ? "MM/YY" : "MM/YY"}
                      maxLength={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{language === "ar" ? "CVV" : "CVV"}</label>
                    <input
                      type="text"
                      placeholder={language === "ar" ? "123" : "123"}
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
              <FileText className="w-5 h-5" /> {language === "ar" ? "ملاحظات إضافية (اختياري)" : "Additional Notes (Optional)"}
            </h3>
            <textarea
              placeholder={language === "ar" ? "أي ملاحظات خاصة بالطلب؟" : "Any special notes for the order?"}
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
