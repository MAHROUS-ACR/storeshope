import { motion } from "framer-motion";
import promoImage from "@assets/generated_images/minimalist_sneaker_promo_banner.png";

export function PromoBanner() {
  return (
    <div className="px-6 mb-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full aspect-[2/1] rounded-3xl overflow-hidden shadow-lg"
      >
        <img 
          src={promoImage} 
          alt="Summer Sale" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center p-6 text-white">
          <span className="text-xs font-bold tracking-wider uppercase mb-2 bg-white/20 backdrop-blur-md w-fit px-6 py-1 rounded-lg">New Drop</span>
          <h2 className="text-2xl font-bold mb-1">Nike Air Max</h2>
          <p className="text-sm opacity-90 mb-4">Future of comfort</p>
          <button className="w-fit bg-white text-black px-6 py-2 rounded-full text-xs font-bold hover:bg-gray-100 transition-colors">
            Shop Now
          </button>
        </div>
      </motion.div>
    </div>
  );
}
