import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, ShoppingCart, Check, X, ChevronLeft, ChevronRight, Share2, Facebook, MessageCircle, Link as LinkIcon, Copy } from "lucide-react";
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    const loadProductAndDiscounts = async () => {
      setIsLoading(true);
      try {
        // Load discounts
        const discountData = await getAllDiscounts();
        setDiscounts(discountData || []);

        // Load product from Firestore
        let product = params?.id ? await getProductById(params.id) : null;
        
        // If not found, try searching in all products
        if (!product && params?.id) {
          const allProducts = await getProducts();
          product = allProducts.find((p: any) => String(p.id) === String(params.id)) || null;
        }

        if (product) {
          setProduct(product);
        } else {
          toast.error("Product not found");
          setLocation("/");
        }
      } catch (error) {

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

    try {
      for (let i = 0; i < quantity; i++) {
        const itemData = {
          id: String(product.id),
          _uniqueId: `${product.id}-${selectedColor || ''}-${selectedSize || ''}-${selectedUnit || ''}`,
          title: product.title || product.name || "Product",
          price: product.price,
          quantity: 1,
          image: product.image,
          selectedColor: selectedColor || undefined,
          selectedSize: selectedSize || undefined,
          selectedUnit: selectedUnit || undefined,
        };

        addItem(itemData);
      }

      toast.success(t("addedToCart", language));
      setTimeout(() => setLocation("/cart"), 1000);
    } catch (error) {

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
  
  // Build gallery: primary image first, then additional images
  const allImages = [];
  if (product.image) allImages.push(product.image);
  if (product.images && Array.isArray(product.images)) {
    allImages.push(...product.images);
  }
  const images = allImages.length > 0 ? allImages : [];
  const currentImage = images[currentImageIndex] || "";
  const hasMultipleImages = images.length > 1;
  
  // Get discount info
  const activeDiscount = getActiveDiscount(String(product?.id), discounts);
  const discountedPrice = activeDiscount ? calculateDiscountedPrice(product.price, activeDiscount.discountPercentage) : product?.price;

  // Handle swipe/drag navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe(touchStart, e.changedTouches[0].clientX);
  };

  const handleSwipe = (start: number, end: number) => {
    if (!hasMultipleImages) return;
    const distance = start - end;
    const threshold = 50; // minimum distance to trigger swipe

    if (Math.abs(distance) < threshold) return;

    if (distance > 0) {
      // Swiped left -> next image
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    } else {
      // Swiped right -> previous image
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const shareProduct = (platform: string) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}`;
    const shareText = `Check out ${productTitle} - L.E ${discountedPrice.toFixed(2)}`;
    
    const urls: { [key: string]: string } = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    };
    
    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

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
        <div className="flex-1 overflow-y-auto no-scrollbar w-full pb-5">
          <div className="w-full px-5 py-4 max-w-7xl mx-auto">
            {/* Desktop: 2 Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left: Image Gallery (1 column on mobile, 1.5 on desktop) */}
              <div className="md:col-span-1">
                {/* Product Image Gallery */}
                <div 
                  className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-4 group cursor-grab active:cursor-grabbing select-none"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  data-testid="gallery-container"
                >
              <img 
                src={currentImage} 
                alt={`${productTitle} - ${currentImageIndex + 1}`}
                className="w-full h-full object-cover transition-opacity duration-200"
                data-testid="img-product-main"
              />
              
              {/* Previous Image Button */}
              {hasMultipleImages && (
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid="button-prev-image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              
              {/* Next Image Button */}
              {hasMultipleImages && (
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid="button-next-image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
              
              {/* Image Counter */}
              {hasMultipleImages && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
              
              {/* Image Dots */}
              {hasMultipleImages && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImageIndex ? "bg-white w-6" : "bg-white/50 hover:bg-white/75"
                      }`}
                      data-testid={`button-image-dot-${idx}`}
                    />
                  ))}
                </div>
              )}
            </div>

                {/* Share Button and Bottom Actions - All in one row */}
                <div className="mb-4">
                  <div className="flex gap-2 items-center">
                    {/* Share Button */}
                    <div className="relative">
                      <button
                        onClick={() => setShowShareMenu(!showShareMenu)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        data-testid="button-share"
                      >
                        <Share2 className="w-6 h-6 text-gray-700" />
                      </button>
                      
                      {/* Share Menu */}
                      {showShareMenu && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                          <button
                            onClick={() => {
                              shareProduct("facebook");
                              setShowShareMenu(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 text-blue-600 font-medium border-b border-gray-100 flex items-center gap-2"
                            data-testid="button-share-facebook"
                          >
                            <Facebook className="w-4 h-4" />
                            Facebook
                          </button>
                          <button
                            onClick={() => {
                              shareProduct("whatsapp");
                              setShowShareMenu(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 text-green-600 font-medium border-b border-gray-100 flex items-center gap-2"
                            data-testid="button-share-whatsapp"
                          >
                            <MessageCircle className="w-4 h-4" />
                            WhatsApp
                          </button>
                          <button
                            onClick={() => {
                              shareProduct("twitter");
                              setShowShareMenu(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sky-600 font-medium border-b border-gray-100 flex items-center gap-2"
                            data-testid="button-share-twitter"
                          >
                            <span className="text-lg">𝕏</span>
                            Twitter
                          </button>
                          <button
                            onClick={() => {
                              const shareUrl = `${window.location.origin}${window.location.pathname}`;
                              navigator.clipboard.writeText(shareUrl);
                              toast.success(language === "ar" ? "تم نسخ الرابط" : "Link copied!");
                              setShowShareMenu(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 text-gray-600 font-medium flex items-center gap-2"
                            data-testid="button-copy-link"
                          >
                            <Copy className="w-4 h-4" />
                            {language === "ar" ? "نسخ الرابط" : "Copy Link"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions - Next to share button */}
                    <div className="flex gap-2 flex-1">
                      <button
                        onClick={() => setLocation("/")}
                        className="flex-1 px-2 py-2 md:px-4 md:py-2 border border-gray-200 rounded-lg font-semibold text-xs md:text-sm hover:bg-gray-50 transition-colors"
                        data-testid="button-continue-shopping"
                      >
                        <span className="hidden md:inline">{t("continueShoppingButton", language)}</span>
                        <span className="md:hidden">{language === "ar" ? "تابع" : "Continue"}</span>
                      </button>
                      <button
                        onClick={handleAddToCart}
                        disabled={isAdding || !product.available}
                        className="flex-1 px-2 py-2 md:px-4 md:py-2 bg-black text-white rounded-lg font-semibold text-xs md:text-sm disabled:opacity-50 flex items-center justify-center gap-1 md:gap-2 hover:bg-gray-900 transition-colors"
                        data-testid="button-add-to-cart"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="hidden md:inline">{isAdding ? t("addingToCart", language) : t("addToCart", language)}</span>
                        <span className="md:hidden">{isAdding ? (language === "ar" ? "جاري..." : "Adding...") : (language === "ar" ? "اشتري" : "Buy")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quantity - Below Buttons */}
                  <div className="flex gap-2 items-center mt-4">
                    <p className="text-sm font-semibold">{t("quantity", language)}:</p>
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-semibold"
                      data-testid="button-decrease-quantity"
                    >
                      −
                    </button>
                    <span className="text-base font-bold w-8 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-semibold"
                      data-testid="button-increase-quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Product Info (1 column on mobile, 1.5 on desktop) */}
              <div className="md:col-span-2">
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
                  <p className="text-3xl font-bold text-green-600" data-testid="text-price">L.E {discountedPrice.toFixed(2)}</p>
                  <p className="text-lg text-gray-400 line-through">L.E {product.price.toFixed(2)}</p>
                  <p className="px-5 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
                    {language === "ar" ? `وفر ${activeDiscount.discountPercentage}%` : `${t("save", language)} ${activeDiscount.discountPercentage}%`}
                  </p>
                </div>
              ) : (
                <p className="text-3xl font-bold" data-testid="text-price">L.E {product.price.toFixed(2)}</p>
              )}
            </div>

            {/* Category */}
            {product.category && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">{t("category", language)}</p>
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
                <h3 className="font-semibold text-sm mb-3">{t("options", language)}</h3>
                
                {product.units && product.units.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold mb-2">{t("selectUnit", language)}</p>
                    <select
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      data-testid="select-unit"
                    >
                      <option value="">{t("selectUnit", language)}</option>
                      {product.units.map((unit: string) => (
                        <option key={unit} value={unit || ""}>{unit}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Color and Size side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {product.colors && product.colors.length > 0 && (
                    <div>
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
                  
                  {product.sizes && product.sizes.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">{t("selectSize", language)}</p>
                      <select
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        data-testid="select-size"
                      >
                        <option value="">{t("selectSize", language)}</option>
                        {product.sizes.map((size: string) => (
                          <option key={size} value={size || ""}>{size}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
