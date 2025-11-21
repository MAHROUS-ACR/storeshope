import { motion } from "framer-motion";
import cardTexture from "@assets/generated_images/abstract_gradient_texture_for_credit_card.png";

export function WalletCard() {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full aspect-[1.58/1] rounded-3xl overflow-hidden shadow-xl shadow-primary/20"
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${cardTexture})` }}
      />
      
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/10 z-0" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium opacity-80 mb-1">Current Balance</p>
            <h2 className="text-3xl font-bold tracking-tight">$24,562.00</h2>
          </div>
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-red-500/80" />
              <div className="w-6 h-6 rounded-full bg-yellow-500/80" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="flex gap-3">
            <span className="font-mono text-lg tracking-widest opacity-90">****</span>
            <span className="font-mono text-lg tracking-widest opacity-90">****</span>
            <span className="font-mono text-lg tracking-widest opacity-90">****</span>
            <span className="font-mono text-lg tracking-widest">4291</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider opacity-70">Expires</p>
            <p className="text-sm font-medium">12/28</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
