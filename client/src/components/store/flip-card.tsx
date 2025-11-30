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
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-lg group">
      {/* Background Image */}
      <img
        src={product.image}
        alt={product.title || product.name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

      {/* Product Info - Top Left */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-0 left-0 right-0 p-4 md:p-6"
      >
        <h3 className="font-bold text-sm md:text-lg text-white line-clamp-2 drop-shadow-lg">
          {product.title || product.name}
        </h3>
      </motion.div>

      {/* Price & Discount - Bottom Right */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-0 right-0 left-0 p-4 md:p-6 space-y-3"
      >
        {/* Price Container */}
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            {activeDiscount && (
              <div className="text-white/80 line-through text-xs md:text-sm font-medium">
                L.E {product.price.toFixed(2)}
              </div>
            )}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="font-black text-2xl md:text-4xl bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent drop-shadow-lg"
            >
              L.E {discountedPrice.toFixed(2)}
            </motion.div>
          </div>

          {/* Discount Badge */}
          {activeDiscount && (
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="bg-gradient-to-br from-red-500 to-red-600 text-white px-3 md:px-5 py-2 md:py-3 rounded-full text-base md:text-2xl font-black border-2 border-yellow-300 shadow-2xl drop-shadow-lg"
            >
              -{activeDiscount.discountPercentage}%
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
