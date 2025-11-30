import { motion } from "framer-motion";
import { calculateDiscountedPrice, type Discount } from "@/lib/discountUtils";

interface FlipCardProps {
  product: {
    id: string | number;
    title?: string;
    name?: string;
    price: number;
    image: string;
  };
  discount?: Discount | null;
  isFlipped: boolean;
}

export function FlipCard({ product, discount, isFlipped }: FlipCardProps) {
  const activeDiscount = discount;
  const discountedPrice = activeDiscount ? calculateDiscountedPrice(product.price, activeDiscount.discountPercentage) : product.price;

  return (
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
        className="absolute w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg overflow-hidden shadow-sm p-4 md:p-6 flex flex-col justify-between"
      >
        <div>
          <h3 className="font-bold text-sm md:text-lg text-white line-clamp-2 mb-2">
            {product.title || product.name}
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-white/70 line-through text-xs md:text-sm">L.E {product.price.toFixed(2)}</div>
              <div className="font-bold text-yellow-300 text-lg md:text-2xl">
                L.E {discountedPrice.toFixed(2)}
              </div>
            </div>

            {activeDiscount && (
              <div className="bg-red-500 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full text-sm md:text-base font-bold border-2 border-yellow-300">
                -{activeDiscount.discountPercentage}%
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
