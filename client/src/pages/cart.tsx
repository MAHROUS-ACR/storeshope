import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Trash2, Minus, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cartContext";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { getAllDiscounts, getActiveDiscount, calculateDiscountedPrice, type Discount } from "@/lib/discountUtils";

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { items, removeItem, updateQuantity, total } = useCart();
  const { language } = useLanguage();
  const [discounts, setDiscounts] = useState<Discount[]>([]);

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const data = await getAllDiscounts();
        setDiscounts(data || []);
      } catch (error) {

      }
    };
    fetchDiscounts();
  }, []);

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error(t("cartIsEmpty", language));
      return;
    }
    setLocation("/checkout");
  };

  const calculateItemPrice = (item: any) => {
    const activeDiscount = getActiveDiscount(item.id, discounts);
    if (activeDiscount) {
      return calculateDiscountedPrice(item.price, activeDiscount.discountPercentage);
    }
    return item.price;
  };

  const calculateTotalWithDiscounts = () => {
    return items.reduce((sum, item) => sum + calculateItemPrice(item) * item.quantity, 0);
  };

  const totalWithDiscounts = calculateTotalWithDiscounts();

  if (items.length === 0) {
    return (
      <MobileWrapper>
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <span className="text-6xl mb-4">🛒</span>
          <h2 className="text-lg font-bold mb-2">{t("cartIsEmpty", language)}</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">Start shopping to add items</p>
          <button
            onClick={() => setLocation("/")}
            className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold"
            data-testid="button-continue-shopping"
          >
            {t("continueShoppingButton", language)}
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
        <div className="px-5 pb-4 pt-2 flex items-center gap-4 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setLocation("/")}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">{language === "ar" ? "السلة" : "Cart"} ({items.length})</h1>
        </div>

        {/* Items List - Scrollable */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-96 w-full">
          <div className="w-full px-5 py-4 space-y-3 pb-12">
            {items.map((item) => (
              <div
                key={item._uniqueId}
                className="flex gap-3 p-4 bg-white rounded-2xl border border-gray-100"
                data-testid={`cart-item-${item._uniqueId}`}
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
                  {(() => {
                    const activeDiscount = getActiveDiscount(item.id, discounts);
                    const discountedPrice = calculateItemPrice(item);
                    return (
                      <div className="mt-1">
                        {activeDiscount ? (
                          <div className="flex items-baseline gap-2">
                            <p className="text-lg font-bold text-green-600">L.E {discountedPrice.toFixed(2)}</p>
                            <p className="text-xs text-gray-400 line-through">L.E {item.price.toFixed(2)}</p>
                          </div>
                        ) : (
                          <p className="text-lg font-bold">L.E {item.price.toFixed(2)}</p>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item._uniqueId, item.quantity - 1)}
                      className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                      data-testid={`button-decrease-${item._uniqueId}`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item._uniqueId, item.quantity + 1)}
                      className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                      data-testid={`button-increase-${item._uniqueId}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeItem(item._uniqueId)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg ml-auto"
                      data-testid={`button-remove-${item._uniqueId}`}
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
        <div className="absolute bottom-32 left-0 right-0 px-5 py-4 border-t border-gray-100 bg-white space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("subtotal", language)}</span>
              <span className="font-semibold">L.E {total.toFixed(2)}</span>
            </div>
            {totalWithDiscounts < total && (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>{t("discountSavings", language)}</span>
                  <span className="font-semibold">-L.E {(total - totalWithDiscounts).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100 text-green-600">
                  <span>{t("total", language)}</span>
                  <span>L.E {totalWithDiscounts.toFixed(2)}</span>
                </div>
              </>
            )}
            {totalWithDiscounts === total && (
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
                <span>{t("total", language)}</span>
                <span>L.E {total.toFixed(2)}</span>
              </div>
            )}
          </div>
          <button
            onClick={handleCheckout}
            className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-neutral-800 active:bg-neutral-900 transition-colors"
            data-testid="button-checkout"
          >
            {t("proceedToPayment", language)}
          </button>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
