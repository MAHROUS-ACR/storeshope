import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Trash2, Minus, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cartContext";
import { toast } from "sonner";

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { items, removeItem, updateQuantity, total } = useCart();

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setLocation("/checkout");
  };

  if (items.length === 0) {
    return (
      <MobileWrapper>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <span className="text-6xl mb-4">🛒</span>
          <h2 className="text-lg font-bold mb-2">Your cart is empty</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">Start shopping to add items</p>
          <button
            onClick={() => setLocation("/")}
            className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold"
            data-testid="button-continue-shopping"
          >
            Continue Shopping
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
            onClick={() => setLocation("/")}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Cart ({items.length})</h1>
        </div>

        {/* Items List - Scrollable */}
        <div className="flex-1 overflow-y-auto no-scrollbar w-full">
          <div className="w-full px-6 py-4 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 p-4 bg-white rounded-2xl border border-gray-100"
                data-testid={`cart-item-${item.id}`}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm line-clamp-1">{item.title}</p>
                  {(item.selectedColor || item.selectedSize || item.selectedUnit) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.selectedUnit && <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px]">{item.selectedUnit}</span>}
                      {item.selectedSize && <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[9px]">{item.selectedSize}</span>}
                      {item.selectedColor && (() => {
                        const [colorName, colorHex] = typeof item.selectedColor === 'string' ? item.selectedColor.split('|') : [item.selectedColor, '#000000'];
                        return (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium" style={{backgroundColor: colorHex || '#000000', color: ['#ffffff', '#f0f0f0', '#e0e0e0'].includes((colorHex || '#000000').toLowerCase()) ? '#000000' : '#ffffff'}}>
                            {colorName}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                  <p className="text-lg font-bold mt-1">${item.price.toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                      data-testid={`button-decrease-${item.id}`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                      data-testid={`button-increase-${item.id}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg ml-auto"
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary & Checkout Button - Fixed at bottom */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex-shrink-0 space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={handleCheckout}
            className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-neutral-800 active:bg-neutral-900 transition-colors"
            data-testid="button-checkout"
          >
            Proceed to Payment
          </button>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
