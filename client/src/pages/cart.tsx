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
      <div className="w-full h-full flex flex-col bg-gradient-to-b from-gray-50 to-white">
        {/* Header - Fixed */}
        <div className="px-5 py-4 flex items-center gap-3 bg-white border-b border-gray-200 flex-shrink-0 shadow-sm">
          <button
            onClick={() => setLocation("/")}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">{t("cart", language)}</h1>
          <span className="ml-auto text-xs font-semibold bg-black text-white px-2.5 py-1 rounded-full">{items.length}</span>
        </div>

        {/* Items List - Scrollable */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          <div className="w-full px-4 py-3 space-y-2.5">
            {items.map((item) => (
              <div
                key={item._uniqueId}
                className="flex gap-3 p-3.5 bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-sm transition"
                data-testid={`cart-item-${item._uniqueId}`}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <p className="font-semibold text-sm text-gray-900 line-clamp-2">{item.title}</p>
                    {(item.selectedColor || item.selectedSize || item.selectedUnit) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selectedUnit && <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[8px] font-medium">{item.selectedUnit}</span>}
                        {item.selectedSize && <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[8px] font-medium">{item.selectedSize}</span>}
                        {item.selectedColor && (() => {
                          const [colorName, colorHex] = typeof item.selectedColor === 'string' ? item.selectedColor.split('|') : [item.selectedColor, '#000000'];
                          return (
                            <span className="inline-block px-2 py-0.5 rounded text-[8px] font-medium" style={{backgroundColor: colorHex || '#000000', color: ['#ffffff', '#f0f0f0', '#e0e0e0'].includes((colorHex || '#000000').toLowerCase()) ? '#000000' : '#ffffff'}}>
                              {colorName}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    {(() => {
                      const activeDiscount = getActiveDiscount(item.id, discounts);
                      const discountedPrice = calculateItemPrice(item);
                      return (
                        <div>
                          {activeDiscount ? (
                            <div className="flex items-baseline gap-1">
                              <p className="text-sm font-bold text-green-600">L.E {discountedPrice.toFixed(2)}</p>
                              <p className="text-xs text-gray-400 line-through">L.E {item.price.toFixed(2)}</p>
                            </div>
                          ) : (
                            <p className="text-sm font-bold text-gray-900">L.E {item.price.toFixed(2)}</p>
                          )}
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item._uniqueId, item.quantity - 1)}
                        className="p-1 rounded hover:bg-gray-200 transition"
                        data-testid={`button-decrease-${item._uniqueId}`}
                      >
                        <Minus className="w-3 h-3 text-gray-600" />
                      </button>
                      <span className="w-4 text-center text-xs font-bold text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item._uniqueId, item.quantity + 1)}
                        className="p-1 rounded hover:bg-gray-200 transition"
                        data-testid={`button-increase-${item._uniqueId}`}
                      >
                        <Plus className="w-3 h-3 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item._uniqueId)}
                  className="text-red-500 hover:bg-red-50 rounded-lg p-2 transition self-start flex-shrink-0"
                  data-testid={`button-remove-${item._uniqueId}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="h-4" />
          </div>
        </div>

        {/* Bottom Summary - Fixed */}
        <div className="flex-shrink-0 px-4 py-2.5 bg-white border-t border-gray-200 shadow-2xl relative z-50">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 space-y-1 border border-gray-200 mb-2">
            {totalWithDiscounts < total && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">{t("subtotal", language)}</span>
                  <span className="text-gray-600">L.E {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-green-600">
                  <span>{t("discountSavings", language)}</span>
                  <span className="font-semibold">-L.E {(total - totalWithDiscounts).toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
              <span>{t("total", language)}</span>
              <span className="text-green-600">L.E {(totalWithDiscounts || total).toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={handleCheckout}
            className="w-full bg-gradient-to-r from-black to-gray-800 text-white py-2.5 rounded-lg font-bold hover:shadow-lg active:scale-95 transition-all text-sm"
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
