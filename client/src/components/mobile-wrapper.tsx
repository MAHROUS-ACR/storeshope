import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileWrapperProps {
  children: ReactNode;
  className?: string;
}

export function MobileWrapper({ children, className }: MobileWrapperProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-neutral-100 p-4 font-sans">
      <div className="relative w-full max-w-[390px] h-[844px] bg-background rounded-[3rem] shadow-2xl border-8 border-neutral-900 overflow-hidden flex flex-col">
        {/* Notch / Status Bar Area */}
        <div className="absolute top-0 left-0 right-0 h-12 z-50 pointer-events-none flex justify-between items-center px-6 pt-2">
          <span className="text-xs font-medium">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full border border-foreground/20" />
            <div className="w-4 h-4 rounded-full border border-foreground/20" />
            <div className="w-6 h-3 rounded-sm border border-foreground/20 flex items-center justify-start px-[1px]">
              <div className="w-4 h-2 bg-foreground rounded-[1px]" />
            </div>
          </div>
        </div>
        
        {/* Dynamic Island (Visual Only) */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-full z-50 pointer-events-none" />

        {/* Content - with padding for nav */}
        <div className={cn("flex-1 flex flex-col h-full overflow-hidden pt-12 pb-20", className)}>
          {children}
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-foreground/20 rounded-full z-50 pointer-events-none" />
      </div>
    </div>
  );
}
