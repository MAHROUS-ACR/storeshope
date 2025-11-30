import { useMemo } from "react";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { getActiveDiscount, type Discount } from "@/lib/discountUtils";
import { Zap } from "lucide-react";
import { useLocation } from "wouter";
import { FlipCard } from "./flip-card";

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

      {/* Grid - Flip Cards */}
      <div className="px-3 md:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4 max-w-2xl md:max-w-full mx-auto">
          {discountedProducts.map((product) => {
            const activeDiscount = getActiveDiscount(String(product.id), discounts);
            return (
              <div key={product.id} className="aspect-[16/9]">
                <FlipCard product={product} discount={activeDiscount} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
