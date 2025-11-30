import { useMemo } from "react";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { getActiveDiscount, calculateDiscountedPrice, type Discount } from "@/lib/discountUtils";
import { Zap } from "lucide-react";
import { useLocation } from "wouter";

interface Product {
  id: string | number;
  title?: string;
  name?: string;
  price: number;
  image: string;
  category?: string;
}

interface ActiveDealsCarouselProps {
  products: Product[];
  discounts: Discount[];
}

export function ActiveDealsCarousel({ products, discounts }: ActiveDealsCarouselProps) {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();

  const discountedProducts = useMemo(() => {
    return products.filter(product => {
      const activeDiscount = getActiveDiscount(String(product.id), discounts);
      return activeDiscount !== null;
    }).slice(0, 6);
  }, [products, discounts]);

  if (discountedProducts.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 md:mb-4 lg:mb-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 md:mb-3 lg:mb-3 px-3 md:px-6 lg:px-8">
        <Zap className="w-4 h-4 text-yellow-500" />
        <h3 className="text-xs font-semibold text-gray-900">{t("activeDeals", language)}</h3>
      </div>

      {/* Grid - Same for Mobile and Desktop */}
      <div className="flex justify-center px-3 md:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4 max-w-2xl md:max-w-none w-full">
          {discountedProducts.map((product) => {
            const activeDiscount = getActiveDiscount(String(product.id), discounts);
            return (
              <div
                key={product.id}
                onClick={() => setLocation(`/product/${product.id}`)}
                className="relative aspect-[16/9] rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow bg-gray-100"
              >
                {/* Image */}
                <img
                  src={product.image}
                  alt={product.title || product.name}
                  className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/40 flex flex-col justify-between p-1.5 md:p-2">
                  {/* Title and Price */}
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="font-bold text-[10px] md:text-xs line-clamp-2 text-white flex-1">
                      {product.title || product.name}
                    </h3>
                  </div>

                  {/* Bottom: Price and Discount */}
                  <div className="flex items-end justify-between gap-1">
                    <div className="text-[8px] md:text-[9px]">
                      <div className="text-white/70 line-through">L.E {product.price.toFixed(2)}</div>
                      <div className="font-bold text-yellow-300">
                        L.E {calculateDiscountedPrice(product.price, activeDiscount?.discountPercentage || 0).toFixed(2)}
                      </div>
                    </div>

                    {/* Discount Badge */}
                    {activeDiscount && (
                      <div className="bg-gradient-to-br from-red-500 to-red-600 text-white px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[8px] md:text-[9px] font-bold border border-yellow-300 flex-shrink-0">
                        -{activeDiscount.discountPercentage}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
