import { useState } from "react";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import type { GeoLayer } from "@/types/gis";

interface MapLegendProps {
  layers: GeoLayer[];
}

export default function MapLegend({ layers }: MapLegendProps) {
  const [collapsed, setCollapsed] = useState(false);
  const visible = layers.filter((l) => l.visible);

  if (visible.length === 0) return null;

  return (
    <div
      className="absolute bottom-20 left-3 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-lg max-w-[200px]"
      dir="rtl"
    >
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent/50 rounded-t-lg transition-colors"
      >
        <Layers className="h-3.5 w-3.5 text-primary" />
        <span>מקרא</span>
        <span className="text-[10px] text-muted-foreground mr-auto">{visible.length}</span>
        {collapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {!collapsed && (
        <div className="px-2.5 pb-2 space-y-1 max-h-[200px] overflow-y-auto">
          {visible.map((layer) => (
            <div key={layer.id} className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 shrink-0">
                <span
                  className="inline-block h-3 w-3 rounded-sm border border-border/40"
                  style={{
                    backgroundColor: layer.fillColor || layer.color,
                    opacity: layer.fillOpacity ?? 0.3,
                    borderColor: layer.strokeColor || layer.color,
                    borderWidth: 2,
                  }}
                />
              </div>
              <span className="text-[10px] text-foreground truncate">{layer.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
