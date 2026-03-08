import { Eye, EyeOff, Trash2, ChevronDown, ChevronRight, ZoomIn, Palette, Star, StarOff, ArrowUp, ArrowDown, Download } from "lucide-react";
import { useState } from "react";
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
  onZoomToLayer,
  onReorderLayers,
  favorites,
  onToggleFavorite,
}: LayerPanelProps) {
  const [openCategories, setOpenCategories] = useState<string[]>(categories);

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
                      <div className="flex items-center gap-1.5">
                        {/* Color indicator with picker */}
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

                        <span className="text-xs font-medium flex-1 truncate">{layer.name}</span>

                        {/* Favorite */}
                        {onToggleFavorite && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => onToggleFavorite(layer.id, layer.name)}
                              >
                                {isFav ? (
                                  <Star className="h-3 w-3 text-ring fill-ring" />
                                ) : (
                                  <StarOff className="h-3 w-3 text-muted-foreground" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">{isFav ? "הסר ממועדפים" : "הוסף למועדפים"}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Reorder */}
                        {onReorderLayers && (
                          <div className="flex flex-col">
                            <button
                              onClick={() => layerIdx > 0 && onReorderLayers(layerIdx, layerIdx - 1)}
                              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                              disabled={layerIdx === 0}
                            >
                              <ArrowUp className="h-2.5 w-2.5" />
                            </button>
                            <button
                              onClick={() => layerIdx < layers.length - 1 && onReorderLayers(layerIdx, layerIdx + 1)}
                              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                              disabled={layerIdx === layers.length - 1}
                            >
                              <ArrowDown className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )}

                        {onZoomToLayer && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => onZoomToLayer(layer)}
                              >
                                <ZoomIn className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">זום לשכבה</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => exportLayerGeoJSON(layer)}
                            >
                              <Download className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">ייצא GeoJSON</p>
                          </TooltipContent>
                        </Tooltip>

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

                      {layer.visible && (
                        <div className="space-y-1.5 px-1">
                          {/* Stroke controls */}
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
                          {/* Fill controls */}
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
