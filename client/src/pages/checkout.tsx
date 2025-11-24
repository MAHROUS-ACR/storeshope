import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Lock, CreditCard, Truck } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cartContext";
import { useUser } from "@/lib/userContext";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { toast } from "sonner";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAllDiscounts, getActiveDiscount, calculateDiscountedPrice, type Discount } from "@/lib/discountUtils";
import { getShippingZones, saveOrder } from "@/lib/firebaseOps";

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { items, total, clearCart } = useCart();
  const { user, isLoggedIn, isLoading: authLoading } = useUser();
  const { language } = useLanguage();

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      setLocation("/login");
    }
  }, [isLoggedIn, authLoading, setLocation]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "delivery" | null>(null);

  // Shipping data
  const [shippingZones, setShippingZones] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [shippingType, setShippingType] = useState<"saved" | "new" | null>(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [newAddress, setNewAddress] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [selectedZone, setSelectedZone] = useState("");

  const [formData, setFormData] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
    email: "",
    address: "",
    city: "",
    zipCode: "",
  });

  // Load discounts and shipping zones on component mount
  useEffect(() => {
    const loadDiscountsAndZones = async () => {
      try {
        // Load discounts
        const discountData = await getAllDiscounts();
        setDiscounts(discountData || []);

        // Load shipping zones
        const zones = await getShippingZones();
        setShippingZones(zones || []);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadDiscountsAndZones();
  }, []);

  // Load user profile when payment method is selected
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user?.id) {
        try {
          const db = getFirestore();
          const userRef = doc(db, "users", user.id);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUserProfile(userSnap.data());
            setFormData(prev => ({
              ...prev,
              email: userSnap.data().email || "",
              address: userSnap.data().address || "",
              city: userSnap.data().zone || "",
              zipCode: userSnap.data().phone || "",
            }));
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
        }
      }
    };

    if (paymentMethod) {
      loadUserProfile();
    }
  }, [paymentMethod, user?.id]);

  const handleCardNumberChange = (e: string) => {
    const value = e.replace(/\s/g, "").slice(0, 16);
    const formatted = value.replace(/(\d{4})/g, "$1 ").trim();
    setFormData(prev => ({ ...prev, cardNumber: formatted }));
  };

  const handleExpiryChange = (e: string) => {
    const value = e.replace(/\D/g, "").slice(0, 4);
    if (value.length >= 2) {
      setFormData(prev => ({ ...prev, expiryDate: `${value.slice(0, 2)}/${value.slice(2)}` }));
    } else {
      setFormData(prev => ({ ...prev, expiryDate: value }));
    }
  };

  const handleCVVChange = (e: string) => {
    const value = e.replace(/\D/g, "").slice(0, 3);
    setFormData(prev => ({ ...prev, cvv: value }));
  };

  const validateDeliveryForm = () => {
    if (!shippingType || !selectedZone) {
      toast.error(t("selectShippingAddressAndZone", language));
      return false;
    }
    return true;
  };

  const validateCardForm = () => {
    if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, "").length !== 16) {
      toast.error(t("invalidCardNumber", language));
      return false;
    }
    if (!formData.expiryDate || formData.expiryDate.length !== 5) {
      toast.error(t("invalidExpiryDate", language));
      return false;
    }
    if (!formData.cvv || formData.cvv.length !== 3) {
      toast.error(t("invalidCVV", language));
      return false;
    }
    if (!formData.cardHolder.trim()) {
      toast.error(t("enterCardholderName", language));
      return false;
    }
    return true;
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentMethod === "card") {
      if (!validateCardForm()) return;
      await handleCardPayment();
    } else if (paymentMethod === "delivery") {
      if (!validateDeliveryForm()) return;
      await handleDeliveryPayment();
    }
  };

  const calculateTotalWithDiscounts = () => {
    return items.reduce((sum, item) => {
      const activeDiscount = getActiveDiscount(item.id, discounts);
      const discountedPrice = activeDiscount ? calculateDiscountedPrice(item.price, activeDiscount.discountPercentage) : item.price;
      return sum + discountedPrice * item.quantity;
    }, 0);
  };

  const handleCardPayment = async () => {
    if (!shippingType || !selectedZone) {
      toast.error(t("selectShippingAddressAndZone", language));
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    try {
      const totalWithDiscounts = calculateTotalWithDiscounts();
      const finalTotal = totalWithDiscounts + shippingCost;

      // Simulate payment success - in production, use Stripe
      const paymentId = `card_${Date.now()}`;
      
      let shippingAddress = formData.address;
      let shippingPhone = formData.zipCode;
      if (shippingType === "new") {
        shippingAddress = newAddress;
        shippingPhone = newPhone;
      }

      const existingOrders = localStorage.getItem("orders");
      const savedOrders = existingOrders ? JSON.parse(existingOrders) : [];
      const nextOrderNumber = Math.max(0, ...savedOrders.map((o: any) => o.orderNumber || 0)) + 1;

      const orderData = {
        id: `order-${Date.now()}`,
        orderNumber: nextOrderNumber,
        items,
        subtotal: total,
        discountedTotal: totalWithDiscounts,
        shippingCost,
        total: finalTotal,
        status: "confirmed",
        paymentMethod: "card",
        paymentId: paymentId,
        shippingType,
        shippingAddress,
        shippingPhone,
        shippingZone: selectedZone,
        createdAt: new Date().toISOString(),
        userId: user?.id,
      };

      // Save to localStorage
      try {
        const existingOrders = localStorage.getItem("orders");
        const savedOrders = existingOrders ? JSON.parse(existingOrders) : [];
        savedOrders.unshift(orderData);
        localStorage.setItem("orders", JSON.stringify(savedOrders));
      } catch (e) {
        console.warn("Failed to save to localStorage:", e);
      }

      // Save to Firebase
      try {
        await saveOrder(orderData);
      } catch (error) {
        console.warn("Failed to save to Firebase:", error);
      }

      toast.success("✅ Order placed! Redirecting...");
      clearCart();
      setTimeout(() => setLocation("/orders"), 1500);
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(t("failedToCheckout", language));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeliveryPayment = async () => {
    if (!shippingType || !selectedZone) {
      toast.error(t("selectShippingAddressAndZone", language));
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    try {
      const totalWithDiscounts = calculateTotalWithDiscounts();
      const finalTotal = totalWithDiscounts + shippingCost;

      let shippingAddress = formData.address;
      let shippingPhone = formData.zipCode;
      if (shippingType === "new") {
        shippingAddress = newAddress;
        shippingPhone = newPhone;
      }

      const existingOrders = localStorage.getItem("orders");
      const savedOrders = existingOrders ? JSON.parse(existingOrders) : [];
      const nextOrderNumber = Math.max(0, ...savedOrders.map((o: any) => o.orderNumber || 0)) + 1;

      const orderData = {
        id: `order-${Date.now()}`,
        orderNumber: nextOrderNumber,
        items,
        subtotal: total,
        discountedTotal: totalWithDiscounts,
        shippingCost,
        total: finalTotal,
        status: "pending",
        paymentMethod: "delivery",
        shippingType,
        shippingAddress,
        shippingPhone,
        shippingZone: selectedZone,
        createdAt: new Date().toISOString(),
        userId: user?.id,
      };

      // Save to localStorage
      try {
        const allOrders = localStorage.getItem("orders");
        const allSavedOrders = allOrders ? JSON.parse(allOrders) : [];
        allSavedOrders.unshift(orderData);
        localStorage.setItem("orders", JSON.stringify(allSavedOrders));
      } catch (e) {
        console.warn("Failed to save to localStorage:", e);
      }

      // Save to Firebase
      try {
        await saveOrder(orderData);
      } catch (error) {
        console.warn("Failed to save to Firebase:", error);
      }

      toast.success("✅ Order placed! Redirecting...");
      clearCart();
      setTimeout(() => setLocation("/orders"), 1500);
    } catch (error) {
      console.error("Order error:", error);
      toast.error("Failed to place order");
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <MobileWrapper>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <h2 className="text-lg font-bold mb-2">{t("noItemsCheckout", language)}</h2>
          <button
            onClick={() => setLocation("/cart")}
            className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold mt-4"
          >
            {t("backToCart", language)}
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <BottomNav />
        </div>
      </MobileWrapper>
    );
  }

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pb-4 pt-2 flex items-center gap-4 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setLocation("/cart")}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{t("payment", language)}</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-40 w-full">
          <div className="w-full px-6 py-4">
          {/* Order Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-sm mb-3">{t("orderSummary", language)}</h3>
            <div className="space-y-2 text-sm">
              {items.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>{item.quantity}x {item.title}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  {(item.selectedColor || item.selectedSize || item.selectedUnit) && (
                    <div className="flex flex-wrap gap-1 ml-2">
                      {item.selectedUnit && <span className="inline-block px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded text-[9px]">{item.selectedUnit}</span>}
                      {item.selectedSize && <span className="inline-block px-1.5 py-0.5 bg-green-200 text-green-800 rounded text-[9px]">{item.selectedSize}</span>}
                      {item.selectedColor && (
                        <span 
                          className="inline-block px-1.5 py-0.5 rounded text-[9px] text-white"
                          style={{
                            backgroundColor: item.selectedColor.includes('|') 
                              ? item.selectedColor.split('|')[1] 
                              : '#999'
                          }}
                          title={item.selectedColor.includes('|') ? item.selectedColor.split('|')[0] : item.selectedColor}
                        >
                          {item.selectedColor.includes('|') ? item.selectedColor.split('|')[0] : item.selectedColor}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div className="border-t border-blue-200 pt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("subtotal", language)}</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                {calculateTotalWithDiscounts() < total && (
                  <div className="flex justify-between text-sm text-green-600 font-semibold">
                    <span>{t("discount", language)}</span>
                    <span>-${(total - calculateTotalWithDiscounts()).toFixed(2)}</span>
                  </div>
                )}
                {calculateTotalWithDiscounts() < total && (
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{t("afterDiscount", language)}</span>
                    <span className="text-green-600">${calculateTotalWithDiscounts().toFixed(2)}</span>
                  </div>
                )}
                {shippingCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{t("shipping", language)}</span>
                    <span>${shippingCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base">
                  <span>{t("total", language)}</span>
                  <span>${(calculateTotalWithDiscounts() + shippingCost).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          {!paymentMethod ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm mb-4">{t("selectPaymentMethod", language)}</h3>
              
              <button
                onClick={() => setPaymentMethod("card")}
                className="w-full p-4 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-colors text-left"
                data-testid="button-payment-card"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-primary" />
                  <div>
                    <p className="font-semibold">{t("payWithCard", language)}</p>
                    <p className="text-xs text-muted-foreground">{t("instantPayment", language)}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod("delivery")}
                className="w-full p-4 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-colors text-left"
                data-testid="button-payment-delivery"
              >
                <div className="flex items-center gap-3">
                  <Truck className="w-6 h-6 text-primary" />
                  <div>
                    <p className="font-semibold">{t("payOnDelivery", language)}</p>
                    <p className="text-xs text-muted-foreground">{t("payWhenArrives", language)}</p>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethod(null)}
                  className="text-primary text-sm font-semibold"
                >
                  {t("changeMethod", language)}
                </button>
              </div>

              {/* Shipping Options */}
              {!shippingType && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-4 mb-4">
                  <h3 className="font-semibold text-sm mb-3">{t("shippingAddress", language)}</h3>
                  <div className="space-y-2">
                    {userProfile?.address && (
                      <button
                        type="button"
                        onClick={() => {
                          setShippingType("saved");
                          setFormData(prev => ({ ...prev, address: userProfile.address, city: userProfile.zone, zipCode: userProfile.phone }));
                          setSelectedZone(userProfile.zone);
                          const zone = shippingZones.find(z => z.name === userProfile.zone);
                          if (zone) setShippingCost(zone.shippingCost);
                        }}
                        className="w-full p-3 bg-white border border-cyan-300 rounded-xl text-left hover:bg-cyan-100 transition-colors"
                        data-testid="button-saved-address"
                      >
                        <p className="text-sm font-semibold">{t("useSavedAddress", language)}</p>
                        <p className="text-xs text-gray-600">{userProfile.address} • {userProfile.zone}</p>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShippingType("new")}
                      className="w-full p-3 bg-white border border-cyan-300 rounded-xl text-left hover:bg-cyan-100 transition-colors"
                      data-testid="button-new-address"
                    >
                      <p className="text-sm font-semibold">{t("newAddress", language)}</p>
                    </button>
                  </div>
                </div>
              )}

              {/* New Address Form */}
              {shippingType === "new" && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">{t("newAddress", language)}</h3>
                    <button
                      type="button"
                      onClick={() => setShippingType(null)}
                      className="text-xs text-primary"
                      data-testid="button-back-address"
                    >
                      {t("change", language)}
                    </button>
                  </div>
                  
                  <input
                    type="text"
                    placeholder={t("streetAddress", language)}
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    data-testid="input-new-address"
                  />

                  <input
                    type="tel"
                    placeholder={t("phoneNumber", language)}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    data-testid="input-new-phone"
                  />

                  <select
                    value={selectedZone}
                    onChange={(e) => {
                      setSelectedZone(e.target.value);
                      const zone = shippingZones.find(z => z.name === e.target.value);
                      if (zone) setShippingCost(zone.shippingCost);
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    data-testid="select-new-zone"
                  >
                    <option value="">{t("selectZone", language)}</option>
                    {shippingZones.map((zone) => (
                      <option key={zone.id} value={zone.name}>{zone.name} (${zone.shippingCost})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Saved Address Details */}
              {shippingType === "saved" && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{t("deliveryAddress", language)}</h3>
                    <button
                      type="button"
                      onClick={() => setShippingType(null)}
                      className="text-xs text-primary"
                      data-testid="button-back-zone"
                    >
                      {t("changeAddress", language)}
                    </button>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">{t("address", language)}</p>
                      <p className="font-medium">{userProfile?.address}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t("phone", language)}</p>
                      <p className="font-medium">{userProfile?.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t("zone", language)}</p>
                      <p className="font-medium">{selectedZone}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Cost Display */}
              {shippingType && selectedZone && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4 text-sm">
                  <div className="flex justify-between font-semibold">
                    <span>{t("shippingCost", language)}:</span>
                    <span>${shippingCost}</span>
                  </div>
                </div>
              )}

              {paymentMethod === "card" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2">{t("cardNumber", language)}</label>
                    <input
                      type="text"
                      placeholder="4532 1234 5678 9010"
                      value={formData.cardNumber}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      data-testid="input-card-number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">{t("cardholderName", language)}</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={formData.cardHolder}
                      onChange={(e) => setFormData(prev => ({ ...prev, cardHolder: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      data-testid="input-cardholder"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">{t("expiry", language)}</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={formData.expiryDate}
                        onChange={(e) => handleExpiryChange(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        data-testid="input-expiry"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">{t("cvv", language)}</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={formData.cvv}
                        onChange={(e) => handleCVVChange(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        data-testid="input-cvv"
                      />
                    </div>
                  </div>
                </>
              )}

              {paymentMethod === "card" && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-start gap-2">
                  <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-800">{t("securePayment", language)}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-pay"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t("processingPayment", language)}
                  </>
                ) : (
                  `${paymentMethod === "card" ? t("pay", language) : t("placeOrder", language)} $${(calculateTotalWithDiscounts() + shippingCost).toFixed(2)}`
                )}
              </button>
            </form>
          )}
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
