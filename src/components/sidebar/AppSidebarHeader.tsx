import { Map, Pin, PinOff } from "lucide-react";
import { SidebarHeader } from "@/components/ui/sidebar";

interface AppSidebarHeaderProps {
  collapsed: boolean;
  isPinned: boolean;
  onTogglePin?: () => void;
}

export function AppSidebarHeader({ collapsed, isPinned, onTogglePin }: AppSidebarHeaderProps) {
  return (
    <SidebarHeader className="border-b border-border p-3 bg-background">
      {!collapsed && (
        <div className="flex items-center gap-2.5" dir="rtl">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Map className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <span className="font-bold text-sm text-foreground">GIS Pro</span>
            <p className="text-[9px] text-muted-foreground">מערכת מידע גיאוגרפי</p>
          </div>
          {/* Pin button */}
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`h-6 w-6 flex items-center justify-center rounded-md transition-colors ${
                isPinned
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
              title={isPinned ? "בטל הצמדה (אוטו-הסתר)" : "הצמד סרגל צד"}
            >
              {isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      )}
      {collapsed && (
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto shadow-sm">
          <Map className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
      )}
    </SidebarHeader>
  );
}
