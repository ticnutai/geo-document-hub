import { useState } from "react";
import { ChevronDown, ChevronUp, Layers, Eye, EyeOff } from "lucide-react";
import type { GeoLayer } from "@/types/gis";

interface MapLegendProps {
  layers: GeoLayer[];
  legendSelection: Set<string>;
  onToggleLegendItem: (id: string) => void;
}

export default function MapLegend({ layers, legendSelection, onToggleLegendItem }: MapLegendProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const visibleLayers = layers.filter((l) => l.visible);
  const legendLayers = visibleLayers.filter((l) => legendSelection.has(l.id));

  return (
    <div
      className="absolute bottom-20 left-3 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-lg max-w-[220px]"
      dir="rtl"
    >
      <div className="flex items-center gap-1.5 w-full px-2.5 py-1.5">
        <button
          onClick={() => setCollapsed((p) => !p)}
          className="flex items-center gap-1.5 flex-1 text-xs font-semibold text-foreground hover:text-primary transition-colors"
        >
          <Layers className="h-3.5 w-3.5 text-primary" />
          <span>מקרא</span>
          <span className="text-[10px] text-muted-foreground">{legendLayers.length}</span>
          {collapsed ? <ChevronUp className="h-3 w-3 mr-auto" /> : <ChevronDown className="h-3 w-3 mr-auto" />}
        </button>
        {!collapsed && (
          <button
            onClick={() => setEditMode((p) => !p)}
            className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${
              editMode ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
            title="בחר שכבות למקרא"
          >
            {editMode ? "סיום" : "ערוך"}
          </button>
        )}
      </div>

      {!collapsed && editMode && (
        <div className="px-2.5 pb-2 space-y-0.5 max-h-[250px] overflow-y-auto border-t border-border/50 pt-1.5">
          <p className="text-[9px] text-muted-foreground mb-1">בחר שכבות להצגה במקרא:</p>
          {visibleLayers.map((layer) => {
            const selected = legendSelection.has(layer.id);
            return (
              <button
                key={layer.id}
                onClick={() => onToggleLegendItem(layer.id)}
                className={`flex items-center gap-2 w-full text-right px-1.5 py-1 rounded text-[10px] transition-colors ${
                  selected ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent/50"
                }`}
              >
                {selected ? (
                  <Eye className="h-3 w-3 text-primary shrink-0" />
                ) : (
                  <EyeOff className="h-3 w-3 shrink-0" />
                )}
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{
                    backgroundColor: layer.fillColor || layer.color,
                    border: `1.5px solid ${layer.strokeColor || layer.color}`,
                  }}
                />
                <span className="truncate">{layer.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {!collapsed && !editMode && legendLayers.length > 0 && (
        <div className="px-2.5 pb-2 space-y-1 max-h-[200px] overflow-y-auto">
          {legendLayers.map((layer) => (
            <div key={layer.id} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm shrink-0"
                style={{
                  backgroundColor: layer.fillColor || layer.color,
                  opacity: layer.fillOpacity ?? 0.3,
                  borderColor: layer.strokeColor || layer.color,
                  borderWidth: 2,
                  borderStyle: "solid",
                }}
              />
              <span className="text-[10px] text-foreground truncate">{layer.name}</span>
            </div>
          ))}
        </div>
      )}

      {!collapsed && !editMode && legendLayers.length === 0 && (
        <div className="px-2.5 pb-2 text-[10px] text-muted-foreground">
          לחץ "ערוך" כדי לבחור שכבות למקרא
        </div>
      )}
    </div>
  );
}
