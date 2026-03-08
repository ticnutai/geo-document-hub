import { Eye, EyeOff, Trash2, ChevronDown, ChevronRight, ZoomIn } from "lucide-react";
import { useState } from "react";
import type { GeoLayer } from "@/types/gis";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LayerPanelProps {
  layers: GeoLayer[];
  categories: string[];
  onToggleVisibility: (id: string) => void;
  onSetOpacity: (id: string, opacity: number) => void;
  onRemoveLayer: (id: string) => void;
  onZoomToLayer?: (layer: GeoLayer) => void;
}

export default function LayerPanel({
  layers,
  categories,
  onToggleVisibility,
  onSetOpacity,
  onRemoveLayer,
  onZoomToLayer,
}: LayerPanelProps) {
  const [openCategories, setOpenCategories] = useState<string[]>(categories);

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2 p-1">
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
                {catLayers.map((layer) => (
                  <div
                    key={layer.id}
                    className={`rounded-md border p-2 space-y-2 transition-all duration-200 ${
                      layer.visible
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/50 bg-card/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0 ring-2 ring-offset-1"
                        style={{
                          backgroundColor: layer.color,
                          boxShadow: layer.visible ? `0 0 0 2px ${layer.color}` : "none",
                        }}
                      />
                      <span className="text-xs font-medium flex-1 truncate">{layer.name}</span>

                      {onZoomToLayer && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => onZoomToLayer(layer)}
                            >
                              <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
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
                            className="h-6 w-6"
                            onClick={() => onToggleVisibility(layer.id)}
                          >
                            {layer.visible ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
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
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => onRemoveLayer(layer.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">הסר שכבה</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {layer.visible && (
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] text-muted-foreground">שקיפות</span>
                        <Slider
                          value={[layer.opacity * 100]}
                          onValueChange={([v]) => onSetOpacity(layer.id, v / 100)}
                          max={100}
                          step={5}
                          className="flex-1"
                        />
                        <span className="text-[10px] text-muted-foreground w-7 text-left">
                          {Math.round(layer.opacity * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
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
