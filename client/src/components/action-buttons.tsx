import { ArrowUpRight, ArrowDownLeft, Plus, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";

const actions = [
  { icon: ArrowUpRight, label: "Send", color: "bg-black text-white" },
  { icon: ArrowDownLeft, label: "Request", color: "bg-white text-black border border-gray-100" },
  { icon: Plus, label: "Top Up", color: "bg-white text-black border border-gray-100" },
  { icon: MoreHorizontal, label: "More", color: "bg-white text-black border border-gray-100" },
];

export function ActionButtons() {
  return (
    <div className="flex items-center justify-between px-6 py-6">
      {actions.map((action, i) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex flex-col items-center gap-2 group"
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-active:scale-95 ${action.color}`}>
            <action.icon className="w-6 h-6" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
