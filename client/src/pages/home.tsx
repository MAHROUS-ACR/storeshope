import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { Search, ShoppingCart, AlertCircle, Globe } from "lucide-react";
import { PromoBanner } from "@/components/store/promo-banner";
import { ActiveDealsCarousel } from "@/components/store/active-deals-carousel";
import { CategoryFilter } from "@/components/store/category-filter";
import { ProductCard } from "@/components/store/product-card";
import { NotificationCenter } from "@/components/notifications/notification-center";
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
      console.error("Failed to load store settings:", error);
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
      console.error("Error fetching from Firebase:", err);
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
      console.error("Error loading discounts:", error);
      setDiscounts([]);
    }
  };

  useEffect(() => {
    // Run in parallel for faster loading
    Promise.all([fetchProductsData(), fetchStoreSettings()]);
  }, [location]);

  // Fetch discounts after Firebase is initialized (with a small delay to ensure Firebase is ready)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDiscounts();
    }, 500); // Small delay to ensure Firebase client is initialized
    return () => clearTimeout(timer);
  }, [location]);

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

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="px-6 pt-8 pb-10 flex-shrink-0 border-b border-gray-100">
          <div className="flex items-center justify-between gap-6 mb-10">
            {storeName ? (
              <div className="flex items-center gap-3">
                {storeLogo ? (
                  <img src={storeLogo} alt={storeName} className="w-11 h-11 rounded-lg object-cover" />
                ) : (
                  <div className="w-11 h-11 bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg">
                    {storeName.charAt(0)}
                  </div>
                )}
                <h1 className="text-lg font-bold text-gray-900">{storeName}</h1>
              </div>
            ) : (
              <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
            )}
            <div className="flex items-center gap-3">
              <NotificationCenter />
              <button 
                onClick={() => setLanguage(language === "en" ? "ar" : "en")}
                className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50"
                data-testid="button-toggle-language"
                title={language === "en" ? "عربي" : "English"}
              >
                <Globe className="w-5 h-5 text-gray-600" />
              </button>
              <button 
                onClick={() => setLocation("/cart")}
                className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center relative hover:bg-gray-900 transition-colors flex-shrink-0"
                data-testid="button-cart"
              >
                <ShoppingCart className="w-4 h-4" />
                {items.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                    {items.length}
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-8 mb-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder={t("searchPlaceholder", language)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-black/10"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Firebase Status Banner */}
        {!firebaseConfigured && isInitialized && (
          <div className="px-5 py-3 flex-shrink-0 bg-yellow-50 border-b border-yellow-100">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-yellow-900 mb-0.5">Demo Mode</p>
                <p className="text-xs text-yellow-800">Configure Firebase in Profile to use your products</p>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-40 w-full">
          <div className="w-full px-6 py-10">
            {/* Active Deals Carousel */}
            <div className="mb-12">
              <h3 className="text-lg font-bold text-gray-900 mb-6">{t("activeDeals", language) || "Active Deals"}</h3>
              <ActiveDealsCarousel products={products} discounts={discounts} />
            </div>
            
            {/* Categories */}
            {categories.length > 0 && (
              <div className="mt-12 mb-12">
                <h3 className="text-lg font-bold text-gray-900 mb-6">{t("categories", language)}</h3>
                <CategoryFilter active={activeCategory} onChange={setActiveCategory} categories={categories} />
              </div>
            )}

            {/* Products */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                    <div className="aspect-square bg-gray-200 animate-pulse" />
                    <div className="p-2">
                      <div className="h-3 bg-gray-200 rounded animate-pulse mb-2 w-3/4" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map((product, index) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    index={index}
                    discounts={discounts}
                    onProductClick={(id) => setLocation(`/product/${id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-base text-gray-600 font-semibold mb-2">No products found</p>
                <p className="text-sm text-gray-500">Try a different search</p>
              </div>
            )}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </div>
  );
}
