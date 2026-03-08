import { Eye, EyeOff, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { GeoLayer } from "@/types/gis";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface LayerPanelProps {
  layers: GeoLayer[];
  categories: string[];
  onToggleVisibility: (id: string) => void;
  onSetOpacity: (id: string, opacity: number) => void;
  onRemoveLayer: (id: string) => void;
}

export default function LayerPanel({
  layers,
  categories,
  onToggleVisibility,
  onSetOpacity,
  onRemoveLayer,
}: LayerPanelProps) {
  const [openCategories, setOpenCategories] = useState<string[]>(categories);

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="space-y-2 p-1">
      {categories.map((cat) => {
        const catLayers = layers.filter((l) => l.category === cat);
        const isOpen = openCategories.includes(cat);

        return (
          <Collapsible key={cat} open={isOpen} onOpenChange={() => toggleCategory(cat)}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-foreground hover:bg-accent">
              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              <span>{cat}</span>
              <span className="mr-auto text-xs text-muted-foreground">({catLayers.length})</span>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-1 pr-2">
              {catLayers.map((layer) => (
                <div
                  key={layer.id}
                  className="rounded-md border border-border/50 bg-card/50 p-2 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: layer.color }}
                    />
                    <span className="text-xs font-medium flex-1 truncate">{layer.name}</span>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => onRemoveLayer(layer.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
        <p className="text-xs text-muted-foreground text-center py-8">
          אין שכבות. הוסף שכבת GeoJSON חדשה.
        </p>
      )}
    </div>
  );
}
