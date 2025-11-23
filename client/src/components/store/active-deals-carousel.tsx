import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { getActiveDiscount, calculateDiscountedPrice, type Discount } from "@/lib/discountUtils";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
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
  const [carouselIndex, setCarouselIndex] = useState(0);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  // Get products with active discounts (memoized to prevent re-filtering on every render)
  const discountedProducts = useMemo(() => {
    return products.filter(product => {
      const activeDiscount = getActiveDiscount(String(product.id), discounts);
      return activeDiscount !== null;
    }).slice(0, 6); // Limit to 6 products
  }, [products, discounts]);

  const startAutoScroll = () => {
    // Clear existing timer
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
    }
    // Set new timer - auto scroll every 5 seconds
    if (discountedProducts.length > 1) {
      autoScrollRef.current = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % discountedProducts.length);
      }, 5000);
    }
  };

  // Start auto scroll on mount and when discountedProducts changes
  useEffect(() => {
    startAutoScroll();
    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    };
  }, [discountedProducts]);

  if (discountedProducts.length === 0) {
    return null;
  }

  const nextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % discountedProducts.length);
    startAutoScroll(); // Restart timer
  };

  const prevSlide = () => {
    setCarouselIndex((prev) => (prev - 1 + discountedProducts.length) % discountedProducts.length);
    startAutoScroll(); // Restart timer
  };

  const goToSlide = (index: number) => {
    setCarouselIndex(index);
    startAutoScroll(); // Restart timer
  };

  return (
    <div className="mb-6 px-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-yellow-500" />
        <h3 className="text-sm font-semibold text-gray-900">{t("activeDeals", language)}</h3>
      </div>

      <div className="relative">
        <motion.div
          key={carouselIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => setLocation(`/product/${discountedProducts[carouselIndex].id}`)}
          className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden cursor-pointer shadow-md"
        >
          <img
            src={discountedProducts[carouselIndex].image}
            alt={discountedProducts[carouselIndex].title || discountedProducts[carouselIndex].name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent p-4 flex flex-col justify-between">
            {/* Top Section: Title + Price */}
            <div className="flex items-start justify-between">
              {/* Left: Title */}
              <h3 className="font-bold text-lg line-clamp-1 drop-shadow-lg text-white flex-1 pr-2">
                {discountedProducts[carouselIndex].title ||
                  discountedProducts[carouselIndex].name}
              </h3>
              
              {/* Right: Price */}
              <div className="text-white text-right drop-shadow-lg whitespace-nowrap">
                <div className="text-sm line-through opacity-70">
                  ${discountedProducts[carouselIndex].price.toFixed(2)}
                </div>
                <div className="text-lg font-bold text-yellow-300">
                  $
                  {calculateDiscountedPrice(
                    discountedProducts[carouselIndex].price,
                    getActiveDiscount(String(discountedProducts[carouselIndex].id), discounts)
                      ?.discountPercentage || 0
                  ).toFixed(2)}
                </div>
              </div>
            </div>
            
            {/* Bottom Section: Discount Badge */}
            <div className="flex items-end">
              {(() => {
                const activeDiscount = getActiveDiscount(
                  String(discountedProducts[carouselIndex].id),
                  discounts
                );
                return activeDiscount ? (
                  <motion.div 
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-red-600 to-orange-600 rounded-full blur-lg opacity-60"></div>
                    <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white px-5 py-3 rounded-full text-2xl font-black shadow-2xl shadow-red-600/60 border-2 border-yellow-300 flex items-center gap-1">
                      <span>-{activeDiscount.discountPercentage}%</span>
                    </div>
                  </motion.div>
                ) : null;
              })()}
            </div>
          </div>
        </motion.div>

        {/* Navigation Buttons */}
        {discountedProducts.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.preventDefault();
                prevSlide();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center z-10 transition-colors"
              data-testid="button-deals-prev"
            >
              <ChevronLeft className="w-4 h-4 text-black" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                nextSlide();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center z-10 transition-colors"
              data-testid="button-deals-next"
            >
              <ChevronRight className="w-4 h-4 text-black" />
            </button>
          </>
        )}

        {/* Dot Indicators */}
        {discountedProducts.length > 1 && (
          <div className="flex justify-center gap-1 mt-3">
            {discountedProducts.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === carouselIndex
                    ? "bg-yellow-500 w-6"
                    : "bg-gray-300 w-1.5 hover:bg-gray-400"
                }`}
                data-testid={`button-deals-dot-${index}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
