import { calculateDiscountedPrice, type Discount } from "@/lib/discountUtils";
import { motion } from "framer-motion";

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
  const activeDiscount = discount;
  const discountedPrice = activeDiscount ? calculateDiscountedPrice(product.price, activeDiscount.discountPercentage) : product.price;

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl group">
      {/* Background Image */}
      <img
        src={product.image}
        alt={product.title || product.name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

      {/* Product Title - Top */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute top-0 left-0 right-0 p-4 md:p-6"
      >
        <h3 className="font-black text-base md:text-2xl text-white line-clamp-2 drop-shadow-xl text-center md:text-left">
          {product.title || product.name}
        </h3>
      </motion.div>

      {/* Price Section - Bottom */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute bottom-0 left-0 right-0 p-4 md:p-8 space-y-4"
      >
        {/* Main Container for Price and Badge */}
        <div className="flex items-center justify-between gap-2 md:gap-4">
          {/* Price Section */}
          <div className="flex flex-col gap-0.5 flex-1">
            {/* Original Price (if discounted) */}
            {activeDiscount && (
              <div className="text-white/70 line-through text-xs md:text-base font-semibold drop-shadow-lg">
                L.E {product.price.toFixed(2)}
              </div>
            )}
            {/* Discounted Price */}
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="font-black text-3xl md:text-5xl bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-100 bg-clip-text text-transparent drop-shadow-2xl leading-none"
            >
              L.E {discountedPrice.toFixed(2)}
            </motion.div>
          </div>

          {/* Discount Badge */}
          {activeDiscount && (
            <motion.div
              animate={{ scale: [1, 1.12, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="bg-gradient-to-br from-red-500 to-red-700 text-white px-4 md:px-6 py-3 md:py-5 rounded-full text-2xl md:text-4xl font-black border-3 border-yellow-300 shadow-2xl drop-shadow-2xl flex-shrink-0"
            >
              -{activeDiscount.discountPercentage}%
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
