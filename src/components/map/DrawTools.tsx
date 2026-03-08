import { MapPin, Pentagon, Minus, Circle, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type DrawMode = "marker" | "polygon" | "polyline" | "circle" | "rectangle" | null;

interface DrawToolsProps {
  onModeChange: (mode: DrawMode) => void;
}

const tools = [
  { mode: "marker" as const, icon: MapPin, label: "נקודה" },
  { mode: "polyline" as const, icon: Minus, label: "קו" },
  { mode: "polygon" as const, icon: Pentagon, label: "פוליגון" },
  { mode: "circle" as const, icon: Circle, label: "עיגול" },
  { mode: "rectangle" as const, icon: Square, label: "מלבן" },
];

export default function DrawTools({ onModeChange }: DrawToolsProps) {
  const [activeMode, setActiveMode] = useState<DrawMode>(null);

  const handleClick = (mode: DrawMode) => {
    const newMode = activeMode === mode ? null : mode;
    setActiveMode(newMode);
    onModeChange(newMode);
  };

  return (
    <div className="space-y-2 p-1">
      <p className="text-xs text-muted-foreground px-1" dir="rtl">
        בחר כלי ציור ולחץ על המפה
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {tools.map(({ mode, icon: Icon, label }) => (
          <Button
            key={mode}
            variant={activeMode === mode ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => handleClick(mode)}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Button>
        ))}
      </div>

      {activeMode && (
        <div className="rounded-md bg-accent/50 p-2 text-center" dir="rtl">
          <p className="text-xs text-muted-foreground">
            מצב ציור פעיל: <span className="font-medium text-foreground">{tools.find(t => t.mode === activeMode)?.label}</span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-7 text-xs"
            onClick={() => handleClick(null)}
          >
            ביטול
          </Button>
        </div>
      )}
    </div>
  );
}
