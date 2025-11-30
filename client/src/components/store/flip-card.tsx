import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getActiveDiscount, calculateDiscountedPrice, type Discount } from "@/lib/discountUtils";
import { useLocation } from "wouter";

interface FlipCardProps {
  product: {
    id: string | number;
    title?: string;
    name?: string;
    price: number;
    image: string;
  };
  discount?: Discount | null;
}

export function FlipCard({ product, discount }: FlipCardProps) {
  const [, setLocation] = useLocation();
  const [isFlipped, setIsFlipped] = useState(false);

  const activeDiscount = discount;
  const discountedPrice = activeDiscount ? calculateDiscountedPrice(product.price, activeDiscount.discountPercentage) : product.price;

  return (
    <motion.div
      className="h-full relative"
      onClick={() => setLocation(`/product/${product.id}`)}
    >
      <motion.div
        initial={{ rotateY: 0 }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative w-full h-full"
      >
        {/* Front */}
        <div
          style={{ backfaceVisibility: "hidden" }}
          className="absolute w-full h-full bg-gray-100 rounded-lg overflow-hidden shadow-sm flex items-center justify-center"
        >
          <img
            src={product.image}
            alt={product.title || product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Back */}
        <div
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          className="absolute w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg overflow-hidden shadow-sm p-3 flex flex-col justify-between"
        >
          <div>
            <h3 className="font-bold text-[11px] md:text-xs text-white line-clamp-2">
              {product.title || product.name}
            </h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <div className="text-[8px] md:text-[9px]">
                <div className="text-white/70 line-through">L.E {product.price.toFixed(2)}</div>
                <div className="font-bold text-yellow-300 text-sm md:text-base">
                  L.E {discountedPrice.toFixed(2)}
                </div>
              </div>

              {activeDiscount && (
                <div className="bg-red-500 text-white px-2 py-1 rounded-full text-[8px] md:text-[9px] font-bold border border-yellow-300">
                  -{activeDiscount.discountPercentage}%
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Flip Buttons - Positioned on sides */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsFlipped(!isFlipped);
        }}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 md:-translate-x-4 bg-white/90 hover:bg-white text-gray-800 rounded-full p-1 md:p-1.5 shadow-lg transition-all hover:shadow-xl z-10"
        data-testid="button-flip-left"
      >
        <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsFlipped(!isFlipped);
        }}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 md:translate-x-4 bg-white/90 hover:bg-white text-gray-800 rounded-full p-1 md:p-1.5 shadow-lg transition-all hover:shadow-xl z-10"
        data-testid="button-flip-right"
      >
        <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
      </button>
    </motion.div>
  );
}
