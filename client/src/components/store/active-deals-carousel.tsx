import { useMemo, useState, useEffect } from "react";
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
  const [shouldAutoPlay, setShouldAutoPlay] = useState(true);

  const discountedProducts = useMemo(() => {
    return products.filter(product => {
      const activeDiscount = getActiveDiscount(String(product.id), discounts);
      return activeDiscount !== null;
    });
  }, [products, discounts]);

  // Auto-play carousel
  useEffect(() => {
    if (!shouldAutoPlay || discountedProducts.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % discountedProducts.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [shouldAutoPlay, discountedProducts.length]);

  // Resume auto-play after 5 seconds of user interaction
  useEffect(() => {
    if (shouldAutoPlay) return;

    const timer = setTimeout(() => {
      setShouldAutoPlay(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [shouldAutoPlay]);

  if (discountedProducts.length === 0) {
    return null;
  }

  const currentProduct = discountedProducts[currentIndex];
  const activeDiscount = getActiveDiscount(String(currentProduct.id), discounts);

  const handleNext = () => {
    setShouldAutoPlay(false);
    setCurrentIndex((prev) => (prev + 1) % discountedProducts.length);
  };

  const handlePrev = () => {
    setShouldAutoPlay(false);
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
      <div className="overflow-hidden px-2 md:px-4 lg:px-6">
        {/* Card with Navigation Buttons */}
        <div className="relative flex justify-center mb-4 md:mb-6">
          {/* Navigation Buttons */}
          <button
            onClick={handlePrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 text-gray-800 rounded-full p-1.5 md:p-3 shadow-lg transition-all hover:shadow-xl flex-shrink-0"
            data-testid="button-deals-prev"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Card Container */}
          <div className="aspect-[24/7] w-full">
            <FlipCard product={currentProduct} discount={activeDiscount} />
          </div>

          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 text-gray-800 rounded-full p-1.5 md:p-3 shadow-lg transition-all hover:shadow-xl flex-shrink-0"
            data-testid="button-deals-next"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-1.5">
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
  );
}
