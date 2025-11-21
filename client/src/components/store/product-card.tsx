import { motion } from "framer-motion";
import { Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cartContext";
import { useState } from "react";
import { toast } from "sonner";

interface ProductProps {
  id: string | number;
  title: string;
  category: string;
  price: number;
  image: string;
}

export function ProductCard({ product, index }: { product: ProductProps; index: number }) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(true);
    try {
      addItem({
        id: String(product.id),
        title: product.title,
        price: product.price,
        quantity: 1,
        image: product.image,
      });
      toast.success(`${product.title} added to cart`);
    } catch (error) {
      toast.error("Failed to add to cart");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative bg-white rounded-3xl p-3 shadow-sm border border-gray-100"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-3">
        <img 
          src={product.image} 
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <button
          onClick={handleAddToCart}
          disabled={isAdding}
          className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
          data-testid={`button-add-to-cart-${product.id}`}
        >
          {isAdding ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <ShoppingCart className="w-5 h-5" />
          )}
        </button>
      </div>
      
      <div className="px-1">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{product.category}</p>
        <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-1">{product.title}</h3>
        <p className="font-bold text-lg">${product.price.toFixed(2)}</p>
      </div>
    </motion.div>
  );
}
