import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Trash2, Minus, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cartContext";
import { toast } from "sonner";

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setLocation("/checkout");
  };

  return (
    <MobileWrapper>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pb-4 pt-2 flex items-center gap-4 border-b border-gray-100">
          <button
            onClick={() => setLocation("/")}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Shopping Cart ({items.length})</h1>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🛒</span>
            </div>
            <h2 className="text-lg font-bold mb-2">Your cart is empty</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Start shopping to add items to your cart
            </p>
            <button
              onClick={() => setLocation("/")}
              className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold"
              data-testid="button-continue-shopping"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4">
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100"
                    data-testid={`cart-item-${item.id}`}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm line-clamp-1">{item.title}</p>
                      <p className="text-lg font-bold mt-1">${item.price.toFixed(2)}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                          data-testid={`button-decrease-${item.id}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                          data-testid={`button-increase-${item.id}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Checkout Section - Fixed outside scrollable area */}
            <div className="px-6 py-4 border-t border-gray-100 space-y-3 bg-white">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-neutral-800"
                data-testid="button-checkout"
              >
                Proceed to Payment
              </button>
            </div>
          </>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
