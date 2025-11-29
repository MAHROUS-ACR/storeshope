import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileWrapperProps {
  children: ReactNode;
  className?: string;
}

export function MobileWrapper({ children, className }: MobileWrapperProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background font-sans">
      <div className="relative w-full h-full bg-background overflow-hidden flex flex-col">
        {/* Content */}
        <div className={cn("flex-1 flex flex-col h-full overflow-hidden w-full", className)}>
          {children}
        </div>
      </div>
    </div>
  );
}
