import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { Settings, Database, Package, Bell, HelpCircle, LogOut, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import avatarImage from "@assets/generated_images/professional_user_avatar_portrait.png";

const menuItems = [
  { icon: Database, label: "Firebase Settings", path: "/settings", color: "text-blue-600 bg-blue-50" },
  { icon: Package, label: "My Orders", path: "/orders", color: "text-purple-600 bg-purple-50" },
  { icon: Bell, label: "Notifications", path: "/notifications", color: "text-orange-600 bg-orange-50" },
  { icon: HelpCircle, label: "Help & Support", path: "/help", color: "text-green-600 bg-green-50" },
];

export default function ProfilePage() {
  const [, setLocation] = useLocation();

  return (
    <MobileWrapper>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pb-4 pt-2 flex items-center justify-between gap-4 border-b border-gray-100 flex-shrink-0">
          <h1 className="text-xl font-bold">Profile</h1>
          <button className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* User Info Card */}
        <div className="px-6 py-4 flex-shrink-0">
          <div className="bg-gradient-to-br from-primary to-purple-600 rounded-3xl p-4 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-3 border-white/20">
                <img src={avatarImage} alt="User" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Alex Morgan</h2>
                <p className="text-xs opacity-90">alex.morgan@email.com</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/20 text-center">
              <div>
                <p className="text-lg font-bold">12</p>
                <p className="text-xs opacity-80">Orders</p>
              </div>
              <div>
                <p className="text-lg font-bold">$2.4k</p>
                <p className="text-xs opacity-80">Spent</p>
              </div>
              <div>
                <p className="text-lg font-bold">5</p>
                <p className="text-xs opacity-80">Reviews</p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 w-full">
          <div className="w-full px-6 py-4 space-y-3">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => setLocation(item.path)}
                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors group"
                data-testid={`button-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-sm">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>
            ))}

            <button
              className="w-full flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100 hover:border-red-200 transition-colors group mt-6"
              data-testid="button-logout"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-100 text-red-600">
                  <LogOut className="w-6 h-6" />
                </div>
                <span className="font-semibold text-sm text-red-600">Log Out</span>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400 group-hover:text-red-600 transition-colors" />
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
