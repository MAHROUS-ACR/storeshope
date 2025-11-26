import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { ArrowLeft, Lock, CreditCard, Truck } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cartContext";
import { useUser } from "@/lib/userContext";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { toast } from "sonner";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAllDiscounts, getActiveDiscount, calculateDiscountedPrice, type Discount } from "@/lib/discountUtils";
import { getShippingZones, saveOrder, getOrders } from "@/lib/firebaseOps";
import { sendNotificationToAdmins } from "@/lib/notificationAPI";

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { items, total, clearCart } = useCart();
  const { user, isLoggedIn, isLoading: authLoading } = useUser();
  const { language } = useLanguage();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "delivery" | null>(null);
  const [shippingType, setShippingType] = useState<"saved" | "new" | null>(null);
  const [selectedZone, setSelectedZone] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [newAddress, setNewAddress] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [shippingZones, setShippingZones] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
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

  useEffect(() => {
    console.log("🛒 Checkout - Auth state:", { isLoggedIn, authLoading });
    if (!authLoading && !isLoggedIn) {
      setLocation("/login");
    }
  }, [isLoggedIn, authLoading, setLocation]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const discountData = await getAllDiscounts();
        setDiscounts(discountData || []);
        const zones = await getShippingZones();
        setShippingZones(zones || []);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  // Load user profile once when component mounts
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user?.id) {
        try {
          const db = getFirestore();
          const userRef = doc(db, "users", user.id);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserProfile(data);
            setFormData(prev => ({
              ...prev,
              email: data.email || "",
              address: data.address || "",
              zipCode: data.phone || "",
            }));
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
        }
      }
    };
    if (user?.id) {
      loadUserProfile();
    }
  }, [user?.id]); // Only depend on user.id, NOT paymentMethod

  const calculateTotalWithDiscounts = () => {
    return items.reduce((sum, item) => {
      const activeDiscount = getActiveDiscount(item.id, discounts);
      const discountedPrice = activeDiscount ? calculateDiscountedPrice(item.price, activeDiscount.discountPercentage) : item.price;
      return sum + discountedPrice * item.quantity;
    }, 0);
  };

  const handlePlaceOrder = async () => {
    console.log("🟢🟢🟢🟢🟢 PLACE ORDER BUTTON CLICKED! 🟢🟢🟢🟢🟢");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Items in cart:", items.length);
    console.log("isProcessing:", isProcessing);
    console.log("paymentMethod:", paymentMethod);
    console.log("shippingType:", shippingType);
    console.log("selectedZone:", selectedZone);
    
    if (isProcessing) {
      console.warn("⚠️ Already processing an order!");
      return;
    }
    
    if (!paymentMethod) {
      toast.error("Please select payment method");
      return;
    }

    if (!shippingType || !selectedZone) {
      toast.error(t("selectShippingAddressAndZone", language));
      return;
    }
    
    if (items.length === 0) {
      toast.error("Cart is empty!");
      return;
    }

    // Validate card payment fields if card selected
    if (paymentMethod === "card") {
      if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, "").length !== 16) {
        toast.error(t("invalidCardNumber", language));
        return;
      }
      if (!formData.expiryDate || formData.expiryDate.length !== 5) {
        toast.error(t("invalidExpiryDate", language));
        return;
      }
      if (!formData.cvv || formData.cvv.length !== 3) {
        toast.error(t("invalidCVV", language));
        return;
      }
      if (!formData.cardHolder.trim()) {
        toast.error(t("enterCardholderName", language));
        return;
      }
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

      // Get sequential order number from Firebase (with fallback)
      let orderNumber = 1;
      try {
        const existingOrders = await getOrders();
        const maxOrderNum = Math.max(...existingOrders.map((o: any) => o.orderNumber || 0), 0);
        orderNumber = maxOrderNum + 1;
      } catch (error) {
        console.warn("Could not fetch existing orders for numbering, using timestamp:", error);
        // Fallback: use timestamp-based number if Firebase fails
        orderNumber = Math.floor(Date.now() / 1000);
      }

      const now = new Date();
      // Create truly unique ID with timestamp + random
      const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const uniqueId = `${now.getTime()}-${randomPart}`;
      const orderId = `order-${uniqueId}`;
      
      const orderData = {
        id: orderId,
        orderNumber,
        items,
        subtotal: total,
        discountedTotal: totalWithDiscounts,
        shippingCost,
        total: finalTotal,
        status: "pending",
        paymentMethod,
        shippingType,
        shippingAddress,
        shippingPhone,
        shippingZone: selectedZone,
        customerName: formData.cardHolder || userProfile?.name || "Customer",
        customerEmail: formData.email || userProfile?.email || user?.email,
        customerPhone: shippingPhone || userProfile?.phone || "",
        createdAt: now.toISOString(),
        createdAtTimestamp: now.getTime(),
        userId: user?.id,
      };

      console.log("📤 SAVING ORDER:", { id: orderData.id, userId: orderData.userId, items: items.length });
      const savedOrderId = await saveOrder(orderData);
      console.log("🔵 saveOrder returned:", savedOrderId);

      if (savedOrderId) {
        console.log("✅✅✅ ORDER SAVED SUCCESSFULLY - ID:", savedOrderId);
        
        // Send notification in background
        sendNotificationToAdmins(
          "New Order",
          `Order #${orderNumber} placed for L.E ${finalTotal.toFixed(2)}`
        ).catch(e => console.warn("Notification failed:", e));

        // Reset everything immediately
        setIsProcessing(false);
        clearCart();
        // Only clear the cart from localStorage, not everything
        try {
          localStorage.removeItem("cart");
        } catch (e) {
          console.warn("Error clearing cart from localStorage:", e);
        }
        
        setPaymentMethod(null);
        setShippingType(null);
        setSelectedZone("");
        setShippingCost(0);
        setNewAddress("");
        setNewPhone("");
        setFormData({
          cardNumber: "",
          cardHolder: "",
          expiryDate: "",
          cvv: "",
          email: "",
          address: "",
          city: "",
          zipCode: "",
        });
        
        toast.success("✅ Order #" + orderNumber + " placed successfully!");
        
        // Wait a moment then redirect to orders page
        setTimeout(() => {
          console.log("🔵 Redirecting to orders");
          setLocation("/orders");
        }, 1500);
      } else {
        console.error("❌ Failed to save order");
        setIsProcessing(false);
        toast.error("Failed to save order - try again");
      }
    } catch (error) {
      console.error("❌ ERROR IN PLACE ORDER:", error);
      setIsProcessing(false);
      toast.error("Failed to place order");
    }
  };

  if (items.length === 0) {
    return (
      <MobileWrapper>
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <h2 className="text-lg font-bold mb-2">{t("noItemsCheckout", language)}</h2>
          <button
            onClick={() => setLocation("/cart")}
            className="px-5 py-2 bg-black text-white rounded-full text-sm font-semibold mt-4"
          >
            {t("backToCart", language)}
          </button>
        </div>
      </MobileWrapper>
    );
  }

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        <div className="px-5 pb-4 pt-2 flex items-center gap-4 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setLocation("/cart")}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{t("payment", language)}</h1>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-40 px-5 py-4">
          {/* Debug Info */}
          {items.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 mb-4 text-xs">
              <div className="font-bold mb-2">🔍 Debug Info:</div>
              <div>Items: {items.length}</div>
              <div>Payment: {paymentMethod || "❌ Not selected"}</div>
              <div>Shipping: {shippingType || "❌ Not selected"}</div>
              <div>Zone: {selectedZone || "❌ Not selected"}</div>
              <div>Button disabled: {isProcessing || !paymentMethod || !shippingType || !selectedZone ? "YES" : "NO"}</div>
            </div>
          )}
          
          {/* Order Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-sm mb-3">{t("orderSummary", language)}</h3>
            <div className="space-y-2 text-sm">
              {items.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex justify-between">
                  <span>{item.quantity}x {item.title}</span>
                  <span>L.E {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>{t("total", language)}</span>
                <span>L.E {(calculateTotalWithDiscounts() + shippingCost).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          {!paymentMethod ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm mb-4">{t("selectPaymentMethod", language)}</h3>
              <button
                onClick={() => setPaymentMethod("card")}
                className="w-full p-4 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 text-left"
                data-testid="button-payment-card"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6" />
                  <div>
                    <p className="font-semibold">{t("payWithCard", language)}</p>
                    <p className="text-xs text-gray-600">{t("instantPayment", language)}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod("delivery")}
                className="w-full p-4 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 text-left"
                data-testid="button-payment-delivery"
              >
                <div className="flex items-center gap-3">
                  <Truck className="w-6 h-6" />
                  <div>
                    <p className="font-semibold">{t("payOnDelivery", language)}</p>
                    <p className="text-xs text-gray-600">{t("payWhenArrives", language)}</p>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setPaymentMethod(null);
                  setShippingType(null);
                  setSelectedZone("");
                  setShippingCost(0);
                }}
                className="text-primary text-sm font-semibold"
                data-testid="button-change-method"
              >
                {t("changeMethod", language)}
              </button>

              {/* Shipping Section */}
              {!shippingType && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-4">
                  <h3 className="font-semibold text-sm mb-3">{t("shippingAddress", language)}</h3>
                  {userProfile?.address && (
                    <button
                      type="button"
                      onClick={() => {
                        console.log("📌 Saved address selected, zones:", shippingZones);
                        setShippingType("saved");
                        // Always use first zone as default if available
                        if (shippingZones.length > 0) {
                          const zoneName = shippingZones[0].name;
                          console.log("✅ Setting zone to:", zoneName);
                          setSelectedZone(zoneName);
                          setShippingCost(shippingZones[0].shippingCost);
                        } else {
                          console.warn("⚠️ No shipping zones available");
                          toast.error("No shipping zones available");
                        }
                      }}
                      className="w-full p-3 bg-white border border-cyan-300 rounded-xl text-left hover:bg-cyan-100 mb-2"
                      data-testid="button-saved-address"
                    >
                      <p className="text-sm font-semibold">{t("useSavedAddress", language)}</p>
                      <p className="text-xs text-gray-600">{userProfile.address}</p>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      console.log("📝 New address selected, zones:", shippingZones);
                      setShippingType("new");
                      // Auto-set first zone
                      if (shippingZones.length > 0) {
                        const zoneName = shippingZones[0].name;
                        console.log("✅ Setting zone to:", zoneName);
                        setSelectedZone(zoneName);
                        setShippingCost(shippingZones[0].shippingCost);
                      }
                    }}
                    className="w-full p-3 bg-white border border-cyan-300 rounded-xl text-left hover:bg-cyan-100"
                    data-testid="button-new-address"
                  >
                    <p className="text-sm font-semibold">{t("newAddress", language)}</p>
                  </button>
                </div>
              )}

              {/* Saved Address Details */}
              {shippingType === "saved" && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <h3 className="font-semibold text-sm mb-3">{t("deliveryAddress", language)}</h3>
                  <div className="bg-white p-3 rounded-lg text-sm space-y-2 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">{t("address", language)}</p>
                      <p className="font-medium">{userProfile?.address}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t("zone", language)}</p>
                      <p className="font-medium">{selectedZone}</p>
                    </div>
                  </div>
                  {!selectedZone && shippingZones.length > 0 && (
                    <select
                      value={selectedZone}
                      onChange={(e) => {
                        setSelectedZone(e.target.value);
                        const zone = shippingZones.find(z => z.name === e.target.value);
                        if (zone) setShippingCost(zone.shippingCost);
                      }}
                      className="w-full p-2 border border-green-300 rounded-lg text-sm"
                      data-testid="select-saved-zone"
                    >
                      <option value="">{t("selectZone", language)}</option>
                      {shippingZones.map(zone => (
                        <option key={zone.id} value={zone.name}>{zone.name} (L.E {zone.shippingCost})</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* New Address Form */}
              {shippingType === "new" && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
                  <input
                    type="text"
                    placeholder={t("streetAddress", language)}
                    value={newAddress}
                    onChange={(e) => {
                      setNewAddress(e.target.value);
                      console.log("📍 New address:", e.target.value);
                    }}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                    data-testid="input-new-address"
                  />
                  <input
                    type="tel"
                    placeholder={t("phoneNumber", language)}
                    value={newPhone}
                    onChange={(e) => {
                      setNewPhone(e.target.value);
                      console.log("📱 New phone:", e.target.value);
                    }}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                    data-testid="input-new-phone"
                  />
                  <select
                    value={selectedZone}
                    onChange={(e) => {
                      console.log("🎯 Zone selected:", e.target.value);
                      setSelectedZone(e.target.value);
                      const zone = shippingZones.find(z => z.name === e.target.value);
                      if (zone) {
                        console.log("💰 Shipping cost:", zone.shippingCost);
                        setShippingCost(zone.shippingCost);
                      }
                    }}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                    data-testid="select-new-zone"
                  >
                    <option value="">{t("selectZone", language)}</option>
                    {shippingZones.map(zone => (
                      <option key={zone.id} value={zone.name}>{zone.name} (L.E {zone.shippingCost})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Shipping Cost Display */}
              {shippingType && selectedZone && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                  <div className="flex justify-between font-semibold text-sm">
                    <span>{t("shippingCost", language)}</span>
                    <span>L.E {shippingCost.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Card Payment Form */}
              {paymentMethod === "card" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2">{t("cardNumber", language)}</label>
                    <input
                      type="text"
                      placeholder="4532 1234 5678 9010"
                      value={formData.cardNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\s/g, "").slice(0, 16);
                        const formatted = value.replace(/(\d{4})/g, "$1 ").trim();
                        setFormData(prev => ({ ...prev, cardNumber: formatted }));
                      }}
                      className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                      className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                          if (value.length >= 2) {
                            setFormData(prev => ({ ...prev, expiryDate: `${value.slice(0, 2)}/${value.slice(2)}` }));
                          } else {
                            setFormData(prev => ({ ...prev, expiryDate: value }));
                          }
                        }}
                        className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        data-testid="input-expiry"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">{t("cvv", language)}</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={formData.cvv}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 3);
                          setFormData(prev => ({ ...prev, cvv: value }));
                        }}
                        className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        data-testid="input-cvv"
                      />
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-start gap-2">
                    <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-green-800">{t("securePayment", language)}</p>
                  </div>
                </>
              )}

              {/* Final CTA */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const now = new Date().toISOString();
                  console.log(`[${now}] BUTTON CLICKED - Processing: ${isProcessing}`);
                  if (!isProcessing) {
                    handlePlaceOrder();
                  } else {
                    toast.error("Already processing...");
                  }
                }}
                disabled={isProcessing || !paymentMethod || !shippingType || !selectedZone}
                className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-pay"
                type="button"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t("processingPayment", language)}
                  </>
                ) : (
                  `${t("placeOrder", language)} L.E ${(calculateTotalWithDiscounts() + shippingCost).toFixed(2)}`
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </MobileWrapper>
  );
}
