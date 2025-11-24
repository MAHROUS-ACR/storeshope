import { Home, Search, ShoppingCart, User } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useCart } from "@/lib/cartContext";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";

export function BottomNav() {
  const [location, setLocation] = useLocation();
  const { items } = useCart();
  const { language } = useLanguage();

  const tabs = [
    { id: "/", icon: Home, label: t("home", language) },
    { id: "/search", icon: Search, label: t("search", language) },
    { id: "/cart", icon: ShoppingCart, label: t("cart", language) },
    { id: "/profile", icon: User, label: t("profile", language) },
  ];

  return (
    <div className="bg-background/80 backdrop-blur-xl border-t border-border/40 px-5 pb-8 pt-4">
      <div className="flex items-center justify-between">
        {tabs.map((tab) => {
          const isActive = location === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setLocation(tab.id)}
              className="relative flex flex-col items-center gap-1 p-2 group w-16"
              data-testid={`nav-${tab.id}`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-4 w-8 h-1 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <div className="relative">
                <tab.icon
                  className={cn(
                    "w-6 h-6 transition-colors duration-300",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {tab.id === "/cart" && items.length > 0 && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center text-[10px] font-bold border border-white">
                    {items.length}
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-300",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
