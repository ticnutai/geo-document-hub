import { MapPin, Pentagon, Minus, Circle, Square, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type DrawMode = "marker" | "polygon" | "polyline" | "circle" | "rectangle" | null;

interface DrawToolsProps {
  onModeChange: (mode: DrawMode) => void;
}

const tools = [
  { mode: "marker" as const, icon: MapPin, label: "נקודה", desc: "סמן נקודה על המפה" },
  { mode: "polyline" as const, icon: Minus, label: "קו", desc: "צייר קו על המפה" },
  { mode: "polygon" as const, icon: Pentagon, label: "פוליגון", desc: "צייר פוליגון" },
  { mode: "circle" as const, icon: Circle, label: "עיגול", desc: "צייר עיגול" },
  { mode: "rectangle" as const, icon: Square, label: "מלבן", desc: "צייר מלבן" },
];

export default function DrawTools({ onModeChange }: DrawToolsProps) {
  const [activeMode, setActiveMode] = useState<DrawMode>(null);
  const [drawings, setDrawings] = useState<any[]>([]);

  const handleClick = (mode: DrawMode) => {
    const newMode = activeMode === mode ? null : mode;
    setActiveMode(newMode);
    onModeChange(newMode);
  };

  const exportGeoJSON = () => {
    const geojson = {
      type: "FeatureCollection",
      features: drawings,
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drawings.geojson";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 p-1" dir="rtl">
      <div className="rounded-lg bg-muted/50 border border-border p-2.5">
        <p className="text-[11px] text-muted-foreground mb-0.5">
          בחר כלי ציור ולחץ על המפה כדי להתחיל
        </p>
        {activeMode && (
          <p className="text-[10px] text-primary font-medium">
            מצב פעיל: {tools.find(t => t.mode === activeMode)?.label}
          </p>
        )}
      </div>

      <div className="space-y-1">
        {tools.map(({ mode, icon: Icon, label, desc }) => (
          <button
            key={mode}
            onClick={() => handleClick(mode)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all duration-150 ${
              activeMode === mode
                ? "bg-primary text-primary-foreground shadow-sm"
                : "hover:bg-accent/50 text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <div className="text-right flex-1">
              <div className="font-medium">{label}</div>
              <div className={`text-[9px] ${activeMode === mode ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {desc}
              </div>
            </div>
          </button>
        ))}
      </div>

      {activeMode && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs h-8"
          onClick={() => handleClick(null)}
        >
          ביטול ציור
        </Button>
      )}

      {/* Export / Clear */}
      <div className="border-t border-border pt-2 space-y-1">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs h-8"
          onClick={exportGeoJSON}
          disabled={drawings.length === 0}
        >
          <Download className="h-3 w-3" />
          ייצא כ-GeoJSON
        </Button>
        {drawings.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-xs h-8 text-destructive"
            onClick={() => setDrawings([])}
          >
            <Trash2 className="h-3 w-3" />
            נקה ציורים ({drawings.length})
          </Button>
        )}
      </div>
    </div>
  );
}
