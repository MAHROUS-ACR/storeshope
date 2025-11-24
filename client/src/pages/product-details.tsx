import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, ShoppingCart, Check, X } from "lucide-react";
import { useCart } from "@/lib/cartContext";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { toast } from "sonner";
import { getAllDiscounts, getActiveDiscount, calculateDiscountedPrice, type Discount } from "@/lib/discountUtils";
import { getProducts, getProductById } from "@/lib/firebaseOps";

export default function ProductDetailsPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/product/:id");
  const { addItem } = useCart();
  const { language } = useLanguage();
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [discounts, setDiscounts] = useState<Discount[]>([]);

  useEffect(() => {
    const loadProductAndDiscounts = async () => {
      setIsLoading(true);
      try {
        // Load discounts
        const discountData = await getAllDiscounts();
        setDiscounts(discountData || []);

        // Load product from Firestore
        let product = await getProductById(params?.id);
        
        // If not found, try searching in all products
        if (!product) {
          const allProducts = await getProducts();
          product = allProducts.find((p: any) => String(p.id) === String(params?.id));
        }

        if (product) {
          setProduct(product);
        } else {
          toast.error("Product not found");
          setLocation("/");
        }
      } catch (error) {
        console.error("Error loading product:", error);
        toast.error("Failed to load product");
        setLocation("/");
      } finally {
        setIsLoading(false);
      }
    };

    if (params?.id) {
      loadProductAndDiscounts();
    }
  }, [params?.id, setLocation]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    if (!product.available) {
      toast.error(t("productNotAvailable", language));
      return;
    }

    setIsAdding(true);
    console.log("Adding to cart from product details:", { productId: product.id, quantity });
    try {
      for (let i = 0; i < quantity; i++) {
        const itemData = {
          id: String(product.id),
          title: product.title || product.name || "Product",
          price: product.price,
          quantity: 1,
          image: product.image,
          selectedColor: selectedColor || undefined,
          selectedSize: selectedSize || undefined,
          selectedUnit: selectedUnit || undefined,
        };
        console.log("Adding item:", itemData);
        addItem(itemData);
      }
      console.log("All items added successfully");
      toast.success(t("addedToCart", language));
      setTimeout(() => setLocation("/cart"), 1000);
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error(t("failedToAddCart", language));
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <MobileWrapper>
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600">{t("loading", language)}</p>
          </div>
        </div>
      </MobileWrapper>
    );
  }

  if (!product) {
    return (
      <MobileWrapper>
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <p className="text-lg font-bold mb-4">Product Not Found</p>
            <button
              onClick={() => setLocation("/")}
              className="px-5 py-2 bg-black text-white rounded-full text-sm font-semibold"
            >
              Back to Home
            </button>
          </div>
        </div>
      </MobileWrapper>
    );
  }

  const productTitle = product.title || product.name || "Product";
  const hasVariants = (product.colors && product.colors.length > 0) || 
                      (product.sizes && product.sizes.length > 0) || 
                      (product.units && product.units.length > 0);
  
  // Get discount info
  const activeDiscount = getActiveDiscount(String(product?.id), discounts);
  const discountedPrice = activeDiscount ? calculateDiscountedPrice(product.price, activeDiscount.discountPercentage) : product?.price;

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pb-4 pt-2 flex items-center gap-4 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setLocation("/")}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1 truncate" data-testid="text-product-title">{productTitle}</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-40 w-full">
          <div className="w-full px-5 py-4">
            {/* Product Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-4">
              <img 
                src={product.image || ""} 
                alt={productTitle}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Availability Status */}
            <div className="mb-4">
              {product.available ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg w-fit">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-semibold">{t("availableNow", language)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700 bg-red-50 px-3 py-2 rounded-lg w-fit">
                  <X className="w-4 h-4" />
                  <span className="text-sm font-semibold">{t("notAvailable", language)}</span>
                </div>
              )}
            </div>

            {/* Price and Discount */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">{t("price", language)}</p>
              {activeDiscount ? (
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-bold text-green-600" data-testid="text-price">${discountedPrice.toFixed(2)}</p>
                  <p className="text-lg text-gray-400 line-through">${product.price.toFixed(2)}</p>
                  <p className="px-5 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
                    {language === "ar" ? `وفر ${activeDiscount.discountPercentage}%` : `Save ${activeDiscount.discountPercentage}%`}
                  </p>
                </div>
              ) : (
                <p className="text-3xl font-bold" data-testid="text-price">${product.price.toFixed(2)}</p>
              )}
            </div>

            {/* Category */}
            {product.category && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Category</p>
                <p className="text-sm font-semibold" data-testid="text-category">{product.category}</p>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">{t("description", language)}</p>
                <p className="text-sm text-gray-700 leading-relaxed" data-testid="text-description">{product.description}</p>
              </div>
            )}

            {/* Variants */}
            {hasVariants && (
              <div className="mb-6">
                <h3 className="font-semibold text-sm mb-3">Options</h3>
                
                {product.units && product.units.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold mb-2">{t("selectUnit", language)}</p>
                    <select
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      data-testid="select-unit"
                    >
                      <option value="">Select Unit</option>
                      {product.units.map((unit: string) => (
                        <option key={unit} value={unit || ""}>{unit}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {product.sizes && product.sizes.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold mb-2">{t("selectSize", language)}</p>
                    <select
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      data-testid="select-size"
                    >
                      <option value="">Select Size</option>
                      {product.sizes.map((size: string) => (
                        <option key={size} value={size || ""}>{size}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {product.colors && product.colors.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold mb-2">{t("selectColor", language)}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {product.colors.map((color: string) => {
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
                            data-testid={`button-color-${colorName}`}
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
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <p className="text-sm font-semibold mb-2">{t("quantity", language)}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                  data-testid="button-decrease-quantity"
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 text-center border border-gray-200 rounded-lg py-2"
                  min="1"
                  data-testid="input-quantity"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                  data-testid="button-increase-quantity"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="absolute bottom-28 left-0 right-0 px-5 py-4 bg-white border-t border-gray-100 flex gap-3">
          <button
            onClick={() => setLocation("/")}
            className="flex-1 px-5 py-3 border border-gray-200 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors"
            data-testid="button-continue-shopping"
          >
            {t("continueShoppingButton", language)}
          </button>
          <button
            onClick={handleAddToCart}
            disabled={isAdding || !product.available}
            className="flex-1 px-5 py-3 bg-black text-white rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors"
            data-testid="button-add-to-cart"
          >
            <ShoppingCart className="w-4 h-4" />
            {isAdding ? t("addingToCart", language) : t("addToCart", language)}
          </button>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
