import { motion } from "framer-motion";
import { Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cartContext";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { useState } from "react";
import { toast } from "sonner";
import { getActiveDiscount, calculateDiscountedPrice, type Discount } from "@/lib/discountUtils";

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

export function ProductCard({ product, index, discounts = [], onProductClick }: { product: ProductProps; index: number; discounts?: Discount[]; onProductClick?: (id: string | number) => void }) {
  const { addItem } = useCart();
  const { language } = useLanguage();
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
  
  // Get discount info
  const activeDiscount = getActiveDiscount(String(product.id), discounts);
  const discountedPrice = activeDiscount ? calculateDiscountedPrice(product.price, activeDiscount.discountPercentage) : product.price;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAvailable) {
      toast.error(t("productNotAvailable", language));
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
    console.log("Adding item to cart:", { productId: product.id, productTitle });
    try {
      const itemData = {
        id: String(product.id),
        title: productTitle,
        price: product.price,
        quantity: 1,
        image: productImage,
        selectedColor: selectedColor || undefined,
        selectedSize: selectedSize || undefined,
        selectedUnit: selectedUnit || undefined,
      };
      console.log("Item data:", itemData);
      addItem(itemData);
      console.log("Item added successfully");
      toast.success(t("addedToCart", language));
      setShowVariantModal(false);
      setSelectedColor("");
      setSelectedSize("");
      setSelectedUnit("");
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error(t("failedToAddCart", language));
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
      className="group relative bg-white rounded-3xl shadow-sm border border-gray-100 cursor-pointer transition-all hover:shadow-md hover:border-gray-200"
    >
      <div className="flex flex-col h-full">
        {/* Top: Category and Title */}
        <div className="px-3 pt-3 pb-2">
          <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5" data-testid={`text-category-${product.id}`}>{productCategory}</p>
          <h3 className="font-semibold text-xs leading-tight line-clamp-2" data-testid={`text-title-${product.id}`}>{productTitle}</h3>
        </div>

        {/* Middle: Full-width Image */}
        <div className="relative flex-1 px-3 py-2 min-h-0">
          <div className="relative w-full h-full rounded-xl overflow-hidden bg-gray-50">
            <img 
              src={productImage} 
              alt={productTitle}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {activeDiscount && (
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-3 left-3 bg-gradient-to-br from-red-500 to-red-600 text-white px-3 py-2 rounded-full text-base font-black shadow-lg shadow-red-500/50 border-2 border-yellow-300" 
                data-testid={`badge-discount-${product.id}`}
              >
                {activeDiscount.discountPercentage}%
              </motion.div>
            )}
          </div>
        </div>

        {/* Variants: Below Image in Horizontal Scroll */}
        {hasVariants && (
          <div className="px-3 py-2 flex gap-3 overflow-x-auto no-scrollbar flex-shrink-0">
            {product.units && product.units.length > 0 && (
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <p className="text-[7px] font-semibold text-gray-500 uppercase">Units</p>
                <div className="flex gap-0.5">
                  {product.units.map((u) => <span key={u} className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-[7px] font-medium whitespace-nowrap">{u}</span>)}
                </div>
              </div>
            )}
            {product.sizes && product.sizes.length > 0 && (
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <p className="text-[7px] font-semibold text-gray-500 uppercase">Sizes</p>
                <div className="flex gap-0.5">
                  {product.sizes.map((s) => <span key={s} className="px-1 py-0.5 bg-green-100 text-green-700 rounded text-[7px] font-medium whitespace-nowrap">{s}</span>)}
                </div>
              </div>
            )}
            {product.colors && product.colors.length > 0 && (
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <p className="text-[7px] font-semibold text-gray-500 uppercase">Colors</p>
                <div className="flex gap-1">
                  {product.colors.map((c) => {
                    const colorName = typeof c === 'string' ? c.split('|')[0] : (c || '');
                    const colorHex = typeof c === 'string' ? c.split('|')[1] || '#000000' : '#000000';
                    return (
                      <div key={colorName} className="flex items-center gap-0.5 flex-shrink-0" title={colorName}>
                        <span 
                          style={{width: '16px', height: '16px', backgroundColor: colorHex, borderRadius: '2px', border: '1px solid rgba(0,0,0,0.15)'}}
                          className="flex-shrink-0"
                        />
                        <span className="text-[7px] font-medium text-gray-700 whitespace-nowrap">{colorName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom: Price, Availability and Add Button */}
        <div className="px-3 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0">
            {activeDiscount ? (
              <>
                <p className="font-bold text-sm text-green-600" data-testid={`text-price-${product.id}`}>${discountedPrice.toFixed(2)}</p>
                <p className="text-xs text-gray-400 line-through">${product.price.toFixed(2)}</p>
              </>
            ) : (
              <p className="font-bold text-sm" data-testid={`text-price-${product.id}`}>${product.price.toFixed(2)}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isAvailable && (
              <p className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded whitespace-nowrap" data-testid={`text-unavailable-${product.id}`}>{t("unavailable", language)}</p>
            )}
            {isAvailable && (
              <p className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded whitespace-nowrap" data-testid={`text-available-${product.id}`}>{t("available", language)}</p>
            )}
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className="w-8 h-8 bg-black text-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-900 transition-colors disabled:opacity-50 flex-shrink-0"
              data-testid={`button-add-to-cart-${product.id}`}
            >
              {isAdding ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </button>
          </div>
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
                <p className="text-sm font-semibold mb-2">{t("selectUnit", language)}</p>
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
                className="flex-1 px-6 py-3 border border-gray-200 rounded-lg font-semibold text-sm"
                data-testid={`button-cancel-variant-${product.id}`}
              >
                {t("cancelButton", language)}
              </button>
              <button
                onClick={addItemToCart}
                disabled={isAdding}
                className="flex-1 px-6 py-3 bg-black text-white rounded-lg font-semibold text-sm disabled:opacity-50"
                data-testid={`button-add-variant-${product.id}`}
              >
                {isAdding ? t("addingToCart", language) : t("addToCart", language)}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
