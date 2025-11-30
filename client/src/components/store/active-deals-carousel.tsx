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

  const discountedProducts = useMemo(() => {
    return products.filter(product => {
      const activeDiscount = getActiveDiscount(String(product.id), discounts);
      return activeDiscount !== null;
    }).slice(0, 6);
  }, [products, discounts]);

  const startAutoScroll = () => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
    }
    if (discountedProducts.length > 1) {
      autoScrollRef.current = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % discountedProducts.length);
      }, 5000);
    }
  };

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
    startAutoScroll();
  };

  const prevSlide = () => {
    setCarouselIndex((prev) => (prev - 1 + discountedProducts.length) % discountedProducts.length);
    startAutoScroll();
  };

  const goToSlide = (index: number) => {
    setCarouselIndex(index);
    startAutoScroll();
  };

  return (
    <div className="mb-2 md:mb-3 lg:mb-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5 md:mb-2 lg:mb-2 px-3 md:px-6 lg:px-8">
        <Zap className="w-4 h-4 text-yellow-500" />
        <h3 className="text-xs font-semibold text-gray-900">{t("activeDeals", language)}</h3>
      </div>

      {/* Mobile Carousel */}
      <div className="md:hidden px-3">
        <div className="relative">
          <motion.div
            key={carouselIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setLocation(`/product/${discountedProducts[carouselIndex].id}`)}
            className="relative w-full aspect-[16/10] rounded-lg overflow-hidden cursor-pointer shadow-sm"
          >
            <img
              src={discountedProducts[carouselIndex].image}
              alt={discountedProducts[carouselIndex].title || discountedProducts[carouselIndex].name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent p-2 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1">
                <h3 className="font-bold text-xs line-clamp-1 drop-shadow-lg text-white flex-1 pr-1">
                  {discountedProducts[carouselIndex].title || discountedProducts[carouselIndex].name}
                </h3>
                <div className="text-white text-right drop-shadow-lg whitespace-nowrap">
                  <div className="text-[9px] line-through opacity-70">
                    L.E {discountedProducts[carouselIndex].price.toFixed(2)}
                  </div>
                  <div className="text-[9px] font-bold text-yellow-300">
                    L.E {calculateDiscountedPrice(
                      discountedProducts[carouselIndex].price,
                      getActiveDiscount(String(discountedProducts[carouselIndex].id), discounts)
                        ?.discountPercentage || 0
                    ).toFixed(2)}
                  </div>
                </div>
              </div>
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
                      <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white px-2 py-1 rounded-full text-xs font-black shadow-md shadow-red-600/60 border border-yellow-300">
                        -{activeDiscount.discountPercentage}%
                      </div>
                    </motion.div>
                  ) : null;
                })()}
              </div>
            </div>
          </motion.div>

          {discountedProducts.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  prevSlide();
                }}
                className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 hover:bg-white rounded-full flex items-center justify-center z-10 transition-colors"
                data-testid="button-deals-prev"
              >
                <ChevronLeft className="w-3 h-3 text-black" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  nextSlide();
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 hover:bg-white rounded-full flex items-center justify-center z-10 transition-colors"
                data-testid="button-deals-next"
              >
                <ChevronRight className="w-3 h-3 text-black" />
              </button>
            </>
          )}

          {discountedProducts.length > 1 && (
            <div className="flex justify-center gap-0.5 mt-1">
              {discountedProducts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-0.5 rounded-full transition-all ${
                    index === carouselIndex
                      ? "bg-yellow-500 w-3"
                      : "bg-gray-300 w-0.5 hover:bg-gray-400"
                  }`}
                  data-testid={`button-deals-dot-${index}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Grid - Simple and Direct */}
      <div style={{ display: "none" }} className="md:block">
        <div style={{ display: "flex", justifyContent: "center", width: "100%", padding: "0 1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            {discountedProducts.map((product, index) => {
              const activeDiscount = getActiveDiscount(String(product.id), discounts);
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setLocation(`/product/${product.id}`)}
                  style={{
                    position: "relative",
                    aspectRatio: "4 / 3",
                    borderRadius: "0.5rem",
                    overflow: "hidden",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                  }}
                >
                  <img
                    src={product.image}
                    alt={product.title || product.name}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                  />
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
                    padding: "0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.25rem" }}>
                      <h3 style={{ fontWeight: "bold", fontSize: "0.75rem", lineHeight: 1.5, color: "white", flex: 1, marginRight: "0.25rem" }}>
                        {product.title || product.name}
                      </h3>
                      <div style={{ color: "white", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: "0.5625rem", textDecoration: "line-through", opacity: 0.7 }}>
                          L.E {product.price.toFixed(2)}
                        </div>
                        <div style={{ fontSize: "0.5625rem", fontWeight: "bold", color: "#FBBF24" }}>
                          L.E {calculateDiscountedPrice(product.price, activeDiscount?.discountPercentage || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    {activeDiscount && (
                      <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <div style={{
                          background: "linear-gradient(to bottom right, #EF4444, #DC2626)",
                          color: "white",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "9999px",
                          fontSize: "0.875rem",
                          fontWeight: "900",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                          border: "1px solid #FBBF24"
                        }}>
                          -{activeDiscount.discountPercentage}%
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop Grid - Tailwind */}
      <div className="hidden md:block px-3 md:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="grid grid-cols-3 gap-4">
            {discountedProducts.map((product, index) => {
              const activeDiscount = getActiveDiscount(String(product.id), discounts);
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setLocation(`/product/${product.id}`)}
                  className="relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                >
                  <img
                    src={product.image}
                    alt={product.title || product.name}
                    className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-transparent p-2 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="font-bold text-xs line-clamp-2 drop-shadow-lg text-white flex-1 pr-1">
                        {product.title || product.name}
                      </h3>
                      <div className="text-white drop-shadow-lg whitespace-nowrap text-right">
                        <div className="text-[9px] line-through opacity-70">
                          L.E {product.price.toFixed(2)}
                        </div>
                        <div className="text-[9px] font-bold text-yellow-300">
                          L.E {calculateDiscountedPrice(product.price, activeDiscount?.discountPercentage || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    {activeDiscount && (
                      <motion.div 
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-end">
                        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white px-2 py-1 rounded-full text-sm font-black shadow-md border border-yellow-300">
                          -{activeDiscount.discountPercentage}%
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
