import { Eye, EyeOff, Trash2, ChevronDown, ChevronRight, ZoomIn, Star, StarOff, ArrowUp, ArrowDown, Download, MoreHorizontal, Pencil } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { GeoLayer } from "@/types/gis";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const PRESET_COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
  "#1abc9c", "#e67e22", "#34495e", "#c0392b", "#2980b9",
  "#27ae60", "#f1c40f", "#8e44ad", "#16a085", "#d35400",
  "#2c3e50", "#e91e63", "#00bcd4", "#795548", "#607d8b",
];

interface LayerPanelProps {
  layers: GeoLayer[];
  categories: string[];
  onToggleVisibility: (id: string) => void;
  onSetOpacity: (id: string, opacity: number) => void;
  onSetColor?: (id: string, color: string) => void;
  onSetStrokeColor?: (id: string, color: string) => void;
  onSetStrokeOpacity?: (id: string, opacity: number) => void;
  onSetFillColor?: (id: string, color: string) => void;
  onSetFillOpacity?: (id: string, opacity: number) => void;
  onRemoveLayer: (id: string) => void;
  onRenameLayer?: (id: string, name: string) => void;
  onZoomToLayer?: (layer: GeoLayer) => void;
  onReorderLayers?: (fromIndex: number, toIndex: number) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (layerId: string, layerName: string) => void;
}

export default function LayerPanel({
  layers,
  categories,
  onToggleVisibility,
  onSetOpacity,
  onSetColor,
  onSetStrokeColor,
  onSetStrokeOpacity,
  onSetFillColor,
  onSetFillOpacity,
  onRemoveLayer,
  onRenameLayer,
  onZoomToLayer,
  onReorderLayers,
  favorites,
  onToggleFavorite,
}: LayerPanelProps) {
  const [openCategories, setOpenCategories] = useState<string[]>(categories);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const exportLayerGeoJSON = (layer: GeoLayer) => {
    const blob = new Blob([JSON.stringify(layer.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${layer.name}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLayerIndex = (layerId: string) => layers.findIndex((l) => l.id === layerId);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2 p-1" dir="rtl">
        {categories.map((cat) => {
          const catLayers = layers.filter((l) => l.category === cat);
          const isOpen = openCategories.includes(cat);
          const visibleCount = catLayers.filter((l) => l.visible).length;

          return (
            <Collapsible key={cat} open={isOpen} onOpenChange={() => toggleCategory(cat)}>
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors">
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <span>{cat}</span>
                <span className="mr-auto text-[10px] text-muted-foreground">
                  {visibleCount > 0 && (
                    <span className="text-primary font-medium">{visibleCount}/</span>
                  )}
                  {catLayers.length}
                </span>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-1 pr-2 animate-fade-in">
                {catLayers.map((layer) => {
                  const isFav = favorites?.has(layer.id);
                  const layerIdx = getLayerIndex(layer.id);

                  return (
                    <div
                      key={layer.id}
                      className={`rounded-md border p-2 space-y-2 transition-all duration-200 ${
                        layer.visible
                          ? "border-primary/30 bg-primary/5"
                          : "border-border/50 bg-card/50 opacity-60"
                      }`}
                    >
                      {/* Main row: color dot, name, eye, more, trash */}
                      <div className="flex items-center gap-1.5">
                        {/* Color indicator */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="h-3.5 w-3.5 rounded-full shrink-0 ring-2 ring-offset-1 cursor-pointer hover:scale-125 transition-transform"
                              style={{
                                backgroundColor: layer.color,
                                boxShadow: layer.visible ? `0 0 0 2px ${layer.color}` : "none",
                              }}
                              title="שנה צבע"
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" side="left" align="start">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">בחר צבע:</p>
                            <div className="grid grid-cols-5 gap-1">
                              {PRESET_COLORS.map((c) => (
                                <button
                                  key={c}
                                  onClick={() => onSetColor?.(layer.id, c)}
                                  className={`h-6 w-6 rounded-md transition-all hover:scale-110 ${
                                    layer.color === c ? "ring-2 ring-primary ring-offset-1" : ""
                                  }`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            <div className="mt-2 flex items-center gap-1">
                              <input
                                type="color"
                                value={layer.color}
                                onChange={(e) => onSetColor?.(layer.id, e.target.value)}
                                className="h-6 w-6 rounded cursor-pointer border-0"
                              />
                              <span className="text-[9px] text-muted-foreground">צבע מותאם</span>
                            </div>
                          </PopoverContent>
                        </Popover>

                        {/* Layer name - double click to edit */}
                        {editingLayerId === layer.id ? (
                          <input
                            autoFocus
                            className="text-xs font-medium flex-1 bg-background border border-primary rounded px-1 py-0.5 outline-none"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => {
                              if (editingName.trim() && editingName.trim() !== layer.name) {
                                onRenameLayer?.(layer.id, editingName.trim());
                              }
                              setEditingLayerId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (editingName.trim() && editingName.trim() !== layer.name) {
                                  onRenameLayer?.(layer.id, editingName.trim());
                                }
                                setEditingLayerId(null);
                              }
                              if (e.key === "Escape") setEditingLayerId(null);
                            }}
                          />
                        ) : (
                          <span
                            className="text-xs font-medium flex-1 truncate cursor-text select-none"
                            onDoubleClick={() => {
                              setEditingLayerId(layer.id);
                              setEditingName(layer.name);
                            }}
                            title="לחץ לחיצה כפולה לשינוי שם"
                          >
                            {layer.name}
                          </span>
                        )}

                        {/* Visibility toggle */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => onToggleVisibility(layer.id)}
                            >
                              {layer.visible ? (
                                <Eye className="h-3 w-3" />
                              ) : (
                                <EyeOff className="h-3 w-3 text-muted-foreground" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">{layer.visible ? "הסתר" : "הצג"}</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* More actions popover */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5">
                              <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2 space-y-1" side="left" align="start">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">פעולות נוספות</p>

                            {/* Favorite */}
                            {onToggleFavorite && (
                              <button
                                onClick={() => onToggleFavorite(layer.id, layer.name)}
                                className="flex items-center gap-2 w-full px-2 py-1 rounded text-xs hover:bg-accent transition-colors"
                              >
                                {isFav ? (
                                  <Star className="h-3 w-3 text-ring fill-ring" />
                                ) : (
                                  <StarOff className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span>{isFav ? "הסר ממועדפים" : "הוסף למועדפים"}</span>
                              </button>
                            )}

                            {/* Zoom to layer */}
                            {onZoomToLayer && (
                              <button
                                onClick={() => onZoomToLayer(layer)}
                                className="flex items-center gap-2 w-full px-2 py-1 rounded text-xs hover:bg-accent transition-colors"
                              >
                                <ZoomIn className="h-3 w-3 text-muted-foreground" />
                                <span>זום לשכבה</span>
                              </button>
                            )}

                            {/* Export */}
                            <button
                              onClick={() => exportLayerGeoJSON(layer)}
                              className="flex items-center gap-2 w-full px-2 py-1 rounded text-xs hover:bg-accent transition-colors"
                            >
                              <Download className="h-3 w-3 text-muted-foreground" />
                              <span>ייצא GeoJSON</span>
                            </button>

                            {/* Reorder */}
                            {onReorderLayers && (
                              <div className="flex items-center gap-1 px-2 py-1">
                                <span className="text-xs text-muted-foreground">סדר:</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-5 w-5"
                                  disabled={layerIdx === 0}
                                  onClick={() => layerIdx > 0 && onReorderLayers(layerIdx, layerIdx - 1)}
                                >
                                  <ArrowUp className="h-2.5 w-2.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-5 w-5"
                                  disabled={layerIdx === layers.length - 1}
                                  onClick={() => layerIdx < layers.length - 1 && onReorderLayers(layerIdx, layerIdx + 1)}
                                >
                                  <ArrowDown className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>

                        {/* Delete */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-destructive hover:text-destructive"
                              onClick={() => onRemoveLayer(layer.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">הסר שכבה</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Stroke / Fill controls */}
                      {layer.visible && (
                        <div className="space-y-1.5 px-1">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 min-w-[52px]">
                              <input
                                type="color"
                                value={layer.strokeColor || layer.color}
                                onChange={(e) => onSetStrokeColor?.(layer.id, e.target.value)}
                                className="h-4 w-4 rounded cursor-pointer border-0 p-0"
                                title="צבע קו"
                              />
                              <span className="text-[10px] text-muted-foreground">קו</span>
                            </div>
                            <Slider
                              value={[(layer.strokeOpacity ?? 1) * 100]}
                              onValueChange={([v]) => onSetStrokeOpacity?.(layer.id, v / 100)}
                              max={100}
                              step={5}
                              className="flex-1"
                            />
                            <span className="text-[10px] text-muted-foreground w-7 text-left">
                              {Math.round((layer.strokeOpacity ?? 1) * 100)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 min-w-[52px]">
                              <input
                                type="color"
                                value={layer.fillColor || layer.color}
                                onChange={(e) => onSetFillColor?.(layer.id, e.target.value)}
                                className="h-4 w-4 rounded cursor-pointer border-0 p-0"
                                title="צבע מילוי"
                              />
                              <span className="text-[10px] text-muted-foreground">מילוי</span>
                            </div>
                            <Slider
                              value={[(layer.fillOpacity ?? 0.3) * 100]}
                              onValueChange={([v]) => onSetFillOpacity?.(layer.id, v / 100)}
                              max={100}
                              step={5}
                              className="flex-1"
                            />
                            <span className="text-[10px] text-muted-foreground w-7 text-left">
                              {Math.round((layer.fillOpacity ?? 0.3) * 100)}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Feature count */}
                      {layer.data?.features && (
                        <div className="text-[9px] text-muted-foreground px-1">
                          {layer.data.features.length} ישויות
                        </div>
                      )}
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {layers.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Eye className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              אין שכבות. הוסף שכבות מהקטלוג או מ-GitHub.
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
