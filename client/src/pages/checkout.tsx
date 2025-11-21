import { useState } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Lock, CreditCard, Truck } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cartContext";
import { toast } from "sonner";

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { items, total, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "delivery" | null>(null);

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
    if (!formData.email.trim()) {
      toast.error("Please enter email");
      return false;
    }
    if (!formData.address.trim()) {
      toast.error("Please enter address");
      return false;
    }
    if (!formData.city.trim()) {
      toast.error("Please enter city");
      return false;
    }
    if (!formData.zipCode.trim()) {
      toast.error("Please enter zip code");
      return false;
    }
    return true;
  };

  const validateCardForm = () => {
    if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, "").length !== 16) {
      toast.error("Invalid card number");
      return false;
    }
    if (!formData.expiryDate || formData.expiryDate.length !== 5) {
      toast.error("Invalid expiry date");
      return false;
    }
    if (!formData.cvv || formData.cvv.length !== 3) {
      toast.error("Invalid CVV");
      return false;
    }
    if (!formData.cardHolder.trim()) {
      toast.error("Please enter cardholder name");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("Please enter email");
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

  const handleCardPayment = async () => {
    setIsProcessing(true);
    try {
      const paymentResponse = await fetch("/api/payment/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "card",
          amount: Math.round(total * 100),
          currency: "usd",
          cardNumber: formData.cardNumber.replace(/\s/g, ""),
          expiryDate: formData.expiryDate,
          cvv: formData.cvv,
          cardHolder: formData.cardHolder,
          email: formData.email,
        }),
      });

      if (!paymentResponse.ok) {
        const error = await paymentResponse.json();
        toast.error(error.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      const paymentData = await paymentResponse.json();
      const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const orderData = {
        id: orderId,
        items,
        total,
        status: "confirmed",
        paymentMethod: "card",
        paymentId: paymentData.id,
        createdAt: new Date().toISOString(),
      };

      try {
        const existingOrders = localStorage.getItem("orders");
        const orders = existingOrders ? JSON.parse(existingOrders) : [];
        orders.unshift(orderData);
        localStorage.setItem("orders", JSON.stringify(orders));
      } catch (e) {
        console.warn("Failed to save to localStorage:", e);
      }

      try {
        await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });
      } catch (error) {
        console.warn("Failed to save to server:", error);
      }

      toast.success("Payment successful! Order confirmed.");
      clearCart();
      setLocation("/orders");
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeliveryPayment = async () => {
    setIsProcessing(true);
    try {
      const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const orderData = {
        id: orderId,
        items,
        total,
        status: "pending",
        paymentMethod: "delivery",
        deliveryAddress: {
          email: formData.email,
          address: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
        },
        createdAt: new Date().toISOString(),
      };

      try {
        const existingOrders = localStorage.getItem("orders");
        const orders = existingOrders ? JSON.parse(existingOrders) : [];
        orders.unshift(orderData);
        localStorage.setItem("orders", JSON.stringify(orders));
      } catch (e) {
        console.warn("Failed to save to localStorage:", e);
      }

      try {
        await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });
      } catch (error) {
        console.warn("Failed to save to server:", error);
      }

      toast.success("Order placed! Pay on delivery.");
      clearCart();
      setLocation("/orders");
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
          <h2 className="text-lg font-bold mb-2">No items to checkout</h2>
          <button
            onClick={() => setLocation("/cart")}
            className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold mt-4"
          >
            Back to Cart
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pb-4 pt-2 flex items-center gap-4 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setLocation("/cart")}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Payment</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 w-full">
          <div className="w-full px-6 py-4">
          {/* Order Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-sm mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              {items.map(item => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.quantity}x {item.title}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-blue-200 pt-2 font-bold flex justify-between">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          {!paymentMethod ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm mb-4">Select Payment Method</h3>
              
              <button
                onClick={() => setPaymentMethod("card")}
                className="w-full p-4 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-colors text-left"
                data-testid="button-payment-card"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-primary" />
                  <div>
                    <p className="font-semibold">Pay with Card</p>
                    <p className="text-xs text-muted-foreground">Instant payment with debit/credit card</p>
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
                    <p className="font-semibold">Pay on Delivery</p>
                    <p className="text-xs text-muted-foreground">Pay when your order arrives</p>
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
                  ← Change Method
                </button>
              </div>

              {paymentMethod === "card" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Card Number</label>
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
                    <label className="block text-sm font-semibold mb-2">Cardholder Name</label>
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
                      <label className="block text-sm font-semibold mb-2">Expiry</label>
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
                      <label className="block text-sm font-semibold mb-2">CVV</label>
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

              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  data-testid="input-email"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Address</label>
                <input
                  type="text"
                  placeholder="123 Main Street"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  data-testid="input-address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  data-testid="input-city"
                />
                <input
                  type="text"
                  placeholder="Zip Code"
                  value={formData.zipCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                  className="px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  data-testid="input-zip"
                />
              </div>

              {paymentMethod === "card" && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-start gap-2">
                  <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-800">Your payment is secure and encrypted</p>
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
                    Processing...
                  </>
                ) : (
                  `${paymentMethod === "card" ? "Pay" : "Place Order"} $${total.toFixed(2)}`
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
