import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { Search, ShoppingCart, AlertCircle } from "lucide-react";
import { PromoBanner } from "@/components/store/promo-banner";
import { CategoryFilter } from "@/components/store/category-filter";
import { ProductCard } from "@/components/store/product-card";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cartContext";
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
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const [error, setError] = useState("");

  const fetchProductsData = async () => {
    setIsLoading(true);
    try {
      // Check Firebase status
      const statusResponse = await fetch("/api/firebase/status");
      const status = await statusResponse.json();
      setFirebaseConfigured(status.configured);

      if (status.configured) {
        // Fetch products from Firebase
        try {
          const productsResponse = await fetch("/api/products");
          if (productsResponse.ok) {
            const firebaseProducts = await productsResponse.json();
            // Use Firebase products regardless of count (empty array means empty page)
            setProducts(firebaseProducts);
            setError("");
          } else {
            setError("Failed to load products from Firebase");
            setProducts([]);
          }
        } catch (err) {
          console.error("Error fetching from Firebase:", err);
          setError("Failed to load products from Firebase");
          setProducts([]);
        }
      } else {
        // Firebase not configured - use fallback data
        setProducts(fallbackProducts);
        setError("");
      }
    } catch (err) {
      console.error("Error checking Firebase:", err);
      setProducts(fallbackProducts);
      setError("");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsData();
  }, [location]);

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
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pb-4 pt-2 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              data-testid="input-search"
            />
          </div>
          <button 
            onClick={() => setLocation("/cart")}
            className="w-11 h-11 bg-black text-white rounded-2xl flex items-center justify-center relative hover:bg-neutral-800 transition-colors"
            data-testid="button-cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {items.length > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                {items.length}
              </div>
            )}
          </button>
        </div>

        {/* Firebase Status Banner */}
        {!firebaseConfigured && (
          <div className="px-6 pb-4 flex-shrink-0">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-900 mb-1">Using Demo Data</p>
                <p className="text-xs text-amber-800">
                  Configure Firebase in Profile → Firebase Settings to load your products
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 w-full">
          <div className="w-full px-6 py-4">
            <PromoBanner />
            
            <div className="mb-2 mt-4">
              <h2 className="text-lg font-bold">Categories</h2>
            </div>
            <CategoryFilter active={activeCategory} onChange={setActiveCategory} />

            {isLoading ? (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100">
                    <div className="aspect-square rounded-2xl bg-gray-200 animate-pulse mb-3" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {filteredProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
