import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { WalletCard } from "@/components/wallet-card";
import { ActionButtons } from "@/components/action-buttons";
import { TransactionList } from "@/components/transaction-list";
import { Bell } from "lucide-react";
import avatarImage from "@assets/generated_images/professional_user_avatar_portrait.png";

export default function Home() {
  return (
    <MobileWrapper>
      {/* Header */}
      <div className="px-6 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-border">
            <img src={avatarImage} alt="User" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Good morning,</p>
            <h1 className="text-lg font-bold leading-tight">Alex Morgan</h1>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-20 space-y-6">
        <WalletCard />
        <ActionButtons />
        <TransactionList />
      </div>

      {/* Navigation */}
      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
