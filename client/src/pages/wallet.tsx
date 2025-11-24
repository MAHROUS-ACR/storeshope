import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { WalletCard } from "@/components/wallet-card";
import { Plus } from "lucide-react";

export default function WalletPage() {
  return (
    <MobileWrapper>
      <div className="px-5 pb-6">
        <h1 className="text-2xl font-bold mb-6">My Cards</h1>
        
        <div className="space-y-4">
            <div className="transform hover:scale-105 transition-transform duration-300">
                <WalletCard />
            </div>
            
            {/* Placeholder for a second card */}
            <div className="w-full aspect-[1.58/1] rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                </div>
                <span className="font-medium">Add new card</span>
            </div>
        </div>
      </div>

       <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
