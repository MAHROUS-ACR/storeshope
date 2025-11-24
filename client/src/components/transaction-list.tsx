import { motion } from "framer-motion";
import { Coffee, ShoppingBag, Smartphone, Zap } from "lucide-react";

const transactions = [
  {
    id: 1,
    title: "Starbucks Coffee",
    category: "Food & Drink",
    amount: -4.50,
    date: "Today, 9:41 AM",
    icon: Coffee,
    color: "bg-amber-100 text-amber-600",
  },
  {
    id: 2,
    title: "Apple Store",
    category: "Electronics",
    amount: -999.00,
    date: "Yesterday",
    icon: Smartphone,
    color: "bg-neutral-100 text-neutral-600",
  },
  {
    id: 3,
    title: "Freelance Payment",
    category: "Income",
    amount: 2500.00,
    date: "Oct 24",
    icon: Zap,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    id: 4,
    title: "Zara Shopping",
    category: "Clothing",
    amount: -129.99,
    date: "Oct 21",
    icon: ShoppingBag,
    color: "bg-rose-100 text-rose-600",
  },
];

export function TransactionList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <button className="text-sm text-primary font-medium hover:underline">See all</button>
      </div>

      <div className="space-y-3">
        {transactions.map((tx, i) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-50 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tx.color}`}>
                <tx.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-sm">{tx.title}</p>
                <p className="text-xs text-muted-foreground">{tx.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${tx.amount > 0 ? "text-emerald-600" : "text-foreground"}`}>
                {tx.amount > 0 ? "+" : ""}L.E {Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">{tx.category}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
