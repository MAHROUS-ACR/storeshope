import { Home, Wallet, PieChart, User } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function BottomNav() {
  const [location, setLocation] = useLocation();

  const tabs = [
    { id: "/", icon: Home, label: "Home" },
    { id: "/wallet", icon: Wallet, label: "Wallet" },
    { id: "/analytics", icon: PieChart, label: "Stats" },
    { id: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="bg-background/80 backdrop-blur-xl border-t border-border/40 px-6 pb-8 pt-4">
      <div className="flex items-center justify-between">
        {tabs.map((tab) => {
          const isActive = location === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setLocation(tab.id)}
              className="relative flex flex-col items-center gap-1 p-2 group w-16"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-4 w-8 h-1 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon
                className={cn(
                  "w-6 h-6 transition-colors duration-300",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
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
