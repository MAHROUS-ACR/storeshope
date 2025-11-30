import { useMemo, useState } from "react";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { getActiveDiscount, type Discount } from "@/lib/discountUtils";
import { Zap, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [currentIndex, setCurrentIndex] = useState(0);

  const discountedProducts = useMemo(() => {
    return products.filter(product => {
      const activeDiscount = getActiveDiscount(String(product.id), discounts);
      return activeDiscount !== null;
    });
  }, [products, discounts]);

  if (discountedProducts.length === 0) {
    return null;
  }

  const currentProduct = discountedProducts[currentIndex];
  const activeDiscount = getActiveDiscount(String(currentProduct.id), discounts);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % discountedProducts.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + discountedProducts.length) % discountedProducts.length);
  };

  return (
    <div className="mb-4 md:mb-6 lg:mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 md:mb-4 px-3 md:px-6 lg:px-8">
        <Zap className="w-4 h-4 text-yellow-500" />
        <h3 className="text-xs font-semibold text-gray-900">{t("activeDeals", language)}</h3>
      </div>

      {/* Single Large Card with Navigation */}
      <div className="px-3 md:px-6 lg:px-8">
        <div className="max-w-2xl md:max-w-3xl mx-auto relative">
          {/* Card Container */}
          <div className="aspect-[4/3] md:aspect-video">
            <FlipCard product={currentProduct} discount={activeDiscount} />
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={handlePrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 md:-translate-x-16 bg-white hover:bg-gray-100 text-gray-800 rounded-full p-2 md:p-3 shadow-lg transition-all hover:shadow-xl"
            data-testid="button-deals-prev"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 md:translate-x-16 bg-white hover:bg-gray-100 text-gray-800 rounded-full p-2 md:p-3 shadow-lg transition-all hover:shadow-xl"
            data-testid="button-deals-next"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Pagination Dots */}
          <div className="flex justify-center gap-1.5 mt-4 md:mt-6">
            {discountedProducts.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                }}
                className={`transition-all rounded-full ${
                  index === currentIndex
                    ? "bg-blue-600 w-3 h-3"
                    : "bg-gray-300 hover:bg-gray-400 w-2 h-2"
                }`}
                data-testid={`button-dot-${index}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
