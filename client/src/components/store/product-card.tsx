import { motion } from "framer-motion";
import { Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cartContext";
import { useState } from "react";
import { toast } from "sonner";

interface ProductProps {
  id: string | number;
  title?: string;
  name?: string;
  category?: string;
  price: number;
  image?: string;
  units?: (string | null)[] | null;
  sizes?: (string | null)[] | null;
  colors?: (string | null)[] | null;
  available?: boolean;
}

export function ProductCard({ product, index, onProductClick }: { product: ProductProps; index: number; onProductClick?: (id: string | number) => void }) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");

  // Handle both 'title' (fallback) and 'name' (Firebase) fields
  const productTitle = product.title || product.name || "Product";
  const productCategory = product.category || "Uncategorized";
  const productImage = product.image || "";
  const hasVariants = (product.colors && product.colors.length > 0) || 
                      (product.sizes && product.sizes.length > 0) || 
                      (product.units && product.units.length > 0);
  const isAvailable = product.available !== false;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAvailable) {
      toast.error("This product is not available");
      return;
    }

    // If product has variants, show selection modal
    if (hasVariants) {
      setShowVariantModal(true);
      return;
    }

    addItemToCart();
  };

  const addItemToCart = () => {
    setIsAdding(true);
    try {
      addItem({
        id: String(product.id),
        title: productTitle,
        price: product.price,
        quantity: 1,
        image: productImage,
        selectedColor: selectedColor || undefined,
        selectedSize: selectedSize || undefined,
        selectedUnit: selectedUnit || undefined,
      });
      toast.success(`${productTitle} added to cart`);
      setShowVariantModal(false);
      setSelectedColor("");
      setSelectedSize("");
      setSelectedUnit("");
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
      onClick={() => onProductClick?.(product.id)}
      className="group relative bg-white rounded-3xl p-3 shadow-sm border border-gray-100 cursor-pointer transition-all hover:shadow-md hover:border-gray-200"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-3">
        <img 
          src={productImage} 
          alt={productTitle}
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
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1" data-testid={`text-category-${product.id}`}>{productCategory}</p>
        <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-1" data-testid={`text-title-${product.id}`}>{productTitle}</h3>
        
        {/* Variants display */}
        {hasVariants && (
          <div className="space-y-1 mb-2">
            {product.units && product.units.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.units.map((u) => <span key={u} className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-medium">{u}</span>)}
              </div>
            )}
            {product.sizes && product.sizes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.sizes.map((s) => <span key={s} className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-medium">{s}</span>)}
              </div>
            )}
            {product.colors && product.colors.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.colors.map((c) => {
                  const colorName = typeof c === 'string' ? c.split('|')[0] : c;
                  const colorHex = typeof c === 'string' ? c.split('|')[1] || '#000000' : '#000000';
                  return (
                    <span key={colorName} className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium" style={{backgroundColor: colorHex || '#000000', color: ['#ffffff', '#f0f0f0', '#e0e0e0'].includes((colorHex || '#000000').toLowerCase()) ? '#000000' : '#ffffff'}}>
                      {colorName}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {/* Price and Availability */}
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-lg" data-testid={`text-price-${product.id}`}>${product.price.toFixed(2)}</p>
          {!isAvailable && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded whitespace-nowrap" data-testid={`text-unavailable-${product.id}`}>غير متاح</p>
          )}
          {isAvailable && (
            <p className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded whitespace-nowrap" data-testid={`text-available-${product.id}`}>متاح</p>
          )}
        </div>
      </div>

      {/* Variant Selection Modal */}
      {showVariantModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowVariantModal(false)}>
          <motion.div
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            exit={{ y: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
          >
            <h2 className="text-lg font-bold mb-4">Select Options for {productTitle}</h2>
            
            {product.units && product.units.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">وحدة (Unit)</p>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  data-testid={`select-variant-unit-${product.id}`}
                >
                  <option value="">اختر وحدة</option>
                  {product.units.map((unit) => (
                    <option key={unit} value={unit || ""}>{unit}</option>
                  ))}
                </select>
              </div>
            )}
            
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">مقاس (Size)</p>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  data-testid={`select-variant-size-${product.id}`}
                >
                  <option value="">اختر مقاس</option>
                  {product.sizes.map((size) => (
                    <option key={size} value={size || ""}>{size}</option>
                  ))}
                </select>
              </div>
            )}
            
            {product.colors && product.colors.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">لون (Color)</p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => {
                    const colorName = typeof color === 'string' ? color.split('|')[0] : (color || '');
                    const colorHex = typeof color === 'string' ? color.split('|')[1] || '#000000' : '#000000';
                    return (
                      <button
                        key={colorName}
                        onClick={() => setSelectedColor(color || '')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                          selectedColor === color
                            ? 'border-gray-800 bg-gray-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        data-testid={`button-color-${product.id}-${colorName}`}
                      >
                        <span 
                          style={{width: '20px', height: '20px', backgroundColor: colorHex, borderRadius: '4px', border: '1px solid rgba(0,0,0,0.1)'}}
                        ></span>
                        <span className="text-sm font-medium">{colorName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowVariantModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg font-semibold text-sm"
                data-testid={`button-cancel-variant-${product.id}`}
              >
                Cancel
              </button>
              <button
                onClick={addItemToCart}
                disabled={isAdding}
                className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-semibold text-sm disabled:opacity-50"
                data-testid={`button-add-variant-${product.id}`}
              >
                {isAdding ? "Adding..." : "Add to Cart"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
