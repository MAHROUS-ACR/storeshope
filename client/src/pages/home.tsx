import { useState, useEffect, useCallback } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { Search, ShoppingCart, AlertCircle, Globe } from "lucide-react";
import { PromoBanner } from "@/components/store/promo-banner";
import { ActiveDealsCarousel } from "@/components/store/active-deals-carousel";
import { CategoryFilter } from "@/components/store/category-filter";
import { ProductCard } from "@/components/store/product-card";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cartContext";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { getAllDiscounts, type Discount } from "@/lib/discountUtils";
import { getProducts, getStoreSettings } from "@/lib/firebaseOps";
import imgHeadphones from "@assets/generated_images/wireless_headphones_product_shot.png";
import imgWatch from "@assets/generated_images/smart_watch_product_shot.png";
import imgShoes from "@assets/generated_images/designer_running_shoes_product_shot.png";
import imgSneaker from "@assets/generated_images/minimalist_sneaker_promo_banner.png";

const fallbackProducts = [
  {
    id: 1,
    title: "Sony WH-1000XM5",
    category: "Electronics",
    price: 349.99,
    image: imgHeadphones,
  },
  {
    id: 2,
    title: "Apple Watch Ultra",
    category: "Electronics",
    price: 799.00,
    image: imgWatch,
  },
  {
    id: 3,
    title: "Nike Zoom Fly 5",
    category: "Shoes",
    price: 160.00,
    image: imgShoes,
  },
  {
    id: 4,
    title: "Adidas Ultraboost",
    category: "Shoes",
    price: 180.00,
    image: imgSneaker,
  },
];

export default function Home() {
  const [location, setLocation] = useLocation();
  const { items } = useCart();
  const { language, setLanguage } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const [error, setError] = useState("");
  const [storeName, setStoreName] = useState<string | null>(null);
  const [storeLogo, setStoreLogo] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [discounts, setDiscounts] = useState<Discount[]>([]);

  const fetchStoreSettings = async (): Promise<void> => {
    try {
      const data = await getStoreSettings();
      if (data) {
        setStoreName(data.name || "Flux Wallet");
        setStoreLogo(data.logo || "");
      } else {
        setStoreName("Flux Wallet");
      }
    } catch (error) {

      setStoreName("Flux Wallet");
    }
  };

  const fetchProductsData = async (): Promise<void> => {
    setIsLoading(true);
    setProducts([]);
    try {
      setFirebaseConfigured(true);
      const firebaseProducts = await getProducts();
      if (firebaseProducts && firebaseProducts.length > 0) {
        setProducts(firebaseProducts);
        setError("");
      } else {
        setProducts(fallbackProducts);
        setError("");
      }
    } catch (err) {

      setProducts(fallbackProducts);
      setError("");
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  const fetchDiscounts = async () => {
    try {
      const data = await getAllDiscounts();
      setDiscounts(data || []);
    } catch (error) {

      setDiscounts([]);
    }
  };

  useEffect(() => {
    // Load data only on component mount, not on location changes
    Promise.all([fetchProductsData(), fetchStoreSettings()]);
  }, []);

  // Fetch discounts after Firebase is initialized (with a small delay to ensure Firebase is ready)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDiscounts();
    }, 500); // Small delay to ensure Firebase client is initialized
    return () => clearTimeout(timer);
  }, []);

  // Extract unique categories from products
  const categories = ["All", ...Array.from(new Set(products
    .map(p => p.category)
    .filter(Boolean)
    .sort()))];

  const filteredProducts = products.filter(p => {
    if (!p) return false;
    const category = p.category || "";
    // Handle both 'title' (fallback) and 'name' (Firebase) fields
    const title = p.title || p.name || "";
    const matchesCategory = activeCategory === "All" || category === activeCategory;
    const matchesSearch = String(title).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleProductClick = useCallback((id: any) => {
    setLocation(`/product/${id}`);
  }, [setLocation]);

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden bg-white">
        {/* Header */}
        <div className="px-3 md:px-6 lg:px-8 pt-2 pb-2 flex-shrink-0 border-b border-gray-100">
          <div className="flex items-center justify-between gap-2 mb-2">
            {storeName ? (
              <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
                {storeLogo ? (
                  <img src={storeLogo} alt={storeName} className="w-10 md:w-14 lg:w-16 h-10 md:h-14 lg:h-16 rounded-lg object-cover shadow-md border border-gray-100" />
                ) : (
                  <div className="w-10 md:w-14 lg:w-16 h-10 md:h-14 lg:h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg md:text-2xl lg:text-3xl shadow-lg leading-none">
                    {storeName.charAt(0)}
                  </div>
                )}
                <h1 
                  className="text-xl md:text-2xl lg:text-3xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-sm tracking-tight"
                  data-testid="text-store-name"
                >
                  {storeName}
                </h1>
              </div>
            ) : (
              <div className="w-32 h-7 bg-gray-200 rounded-lg animate-pulse" />
            )}
            <div className="flex items-center gap-1 md:gap-2">
              <button 
                onClick={() => setLanguage(language === "en" ? "ar" : "en")}
                className="w-7 md:w-8 lg:w-10 h-7 md:h-8 lg:h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50 flex-shrink-0"
                data-testid="button-toggle-language"
                title={language === "en" ? "عربي" : "English"}
              >
                <Globe className="w-3.5 md:w-4 lg:w-5 h-3.5 md:h-4 lg:h-5 text-gray-600" />
              </button>
              <button 
                onClick={() => setLocation("/cart")}
                className="w-7 md:w-8 lg:w-10 h-7 md:h-8 lg:h-10 bg-black text-white rounded flex items-center justify-center relative hover:bg-gray-900 transition-colors flex-shrink-0"
                data-testid="button-cart"
              >
                <ShoppingCart className="w-3.5 md:w-4 lg:w-5 h-3.5 md:h-4 lg:h-5" />
                {items.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 md:w-5 h-4 md:h-5 bg-red-500 rounded-full flex items-center justify-center text-[7px] md:text-[8px] font-bold text-white">
                    {items.length}
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 md:w-4 h-3.5 md:h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={t("searchPlaceholder", language)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 md:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Firebase Status Banner */}
        {!firebaseConfigured && isInitialized && (
          <div className="px-3 md:px-6 lg:px-8 py-1.5 md:py-2 flex-shrink-0 bg-yellow-50 border-b border-yellow-100">
            <div className="flex items-start gap-1.5 md:gap-2">
              <AlertCircle className="w-3.5 md:w-4 h-3.5 md:h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-semibold text-yellow-900">Demo Mode</p>
                <p className="text-[11px] md:text-xs text-yellow-800">Configure Firebase in Profile to use your products</p>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-40 w-full">
          <div className="w-full px-0 py-2">
            {/* Active Deals Carousel */}
            <ActiveDealsCarousel products={products} discounts={discounts} />
            
            {/* Categories */}
            {categories.length > 0 && (
              <div className="mt-2 md:mt-3 mb-3 md:mb-4">
                <CategoryFilter active={activeCategory} onChange={setActiveCategory} categories={categories} />
              </div>
            )}

            {/* Products */}
            <div className="px-3 md:px-6 lg:px-8">
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                      <div className="aspect-square bg-gray-200 animate-pulse" />
                      <div className="p-1.5 md:p-2">
                        <div className="h-2 bg-gray-200 rounded animate-pulse mb-1 w-3/4" />
                        <div className="h-2 bg-gray-200 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
                  {filteredProducts.map((product, index) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      index={index}
                      discounts={discounts}
                      onProductClick={handleProductClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 md:py-12">
                  <div className="text-4xl md:text-6xl mb-2">📦</div>
                  <p className="text-xs md:text-sm text-gray-600 font-semibold mb-0.5">No products found</p>
                  <p className="text-[11px] md:text-xs text-gray-500">Try a different search</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
