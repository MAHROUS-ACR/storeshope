import { motion } from "framer-motion";
import { useLanguage } from "@/lib/languageContext";
import { translations } from "@/lib/translations";

export function CategoryFilter({ active, onChange, categories = ["All"] }: { active: string; onChange: (c: string) => void; categories?: string[] }) {
  const { language } = useLanguage();

  const getCategoryDisplay = (category: string) => {
    if (category === "All") {
      return language === "ar" ? translations.ar.all : translations.en.all;
    }
    return category;
  };

  return (
    <div className="flex overflow-x-auto no-scrollbar gap-2 px-5 pb-4">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onChange(category)}
          className={`relative px-5 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            active === category 
              ? "bg-black text-white" 
              : "text-muted-foreground hover:text-foreground bg-white border border-gray-100"
          }`}
          data-testid={`button-category-${category}`}
        >
          {active === category && (
            <motion.div
              layoutId="category-pill"
              className="absolute inset-0 bg-black rounded-full z-0"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className={`relative z-10 block ${active === category ? "text-white" : ""}`}>{getCategoryDisplay(category)}</span>
        </button>
      ))}
    </div>
  );
}
