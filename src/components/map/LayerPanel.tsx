import {
  Eye, EyeOff, Trash2, ChevronDown, ChevronRight, ZoomIn,
  Star, StarOff, ArrowUp, ArrowDown, Download, MoreHorizontal,
  Palette, Layers, Settings2
} from "lucide-react";
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
  onRenameLayer?: (id: string, name: string) => void;
  onZoomToLayer?: (layer: GeoLayer) => void;
  onReorderLayers?: (fromIndex: number, toIndex: number) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (layerId: string, layerName: string) => void;
}

/* ── Compact layer card ────────────────────────────────────── */
function LayerCard({
  layer, layerIdx, totalLayers, isFav,
  onToggleVisibility, onSetColor, onSetStrokeColor, onSetStrokeOpacity,
  onSetFillColor, onSetFillOpacity, onRemoveLayer, onRenameLayer,
  onZoomToLayer, onReorderLayers, onToggleFavorite, exportGeoJSON,
}: {
  layer: GeoLayer; layerIdx: number; totalLayers: number; isFav: boolean;
  onToggleVisibility: (id: string) => void;
  onSetColor?: (id: string, c: string) => void;
  onSetStrokeColor?: (id: string, c: string) => void;
  onSetStrokeOpacity?: (id: string, v: number) => void;
  onSetFillColor?: (id: string, c: string) => void;
  onSetFillOpacity?: (id: string, v: number) => void;
  onRemoveLayer: (id: string) => void;
  onRenameLayer?: (id: string, name: string) => void;
  onZoomToLayer?: (layer: GeoLayer) => void;
  onReorderLayers?: (from: number, to: number) => void;
  onToggleFavorite?: (id: string, name: string) => void;
  exportGeoJSON: (layer: GeoLayer) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [showStyle, setShowStyle] = useState(false);

  const featureCount = layer.data?.features?.length ?? 0;

  const commitRename = () => {
    if (editName.trim() && editName.trim() !== layer.name) {
      onRenameLayer?.(layer.id, editName.trim());
    }
    setEditing(false);
  };

  return (
    <div
      className={`group rounded-lg border transition-all duration-200 ${
        layer.visible
          ? "border-primary/20 bg-card shadow-sm"
          : "border-border/40 bg-muted/30 opacity-50"
      }`}
    >
      {/* ─ Primary row ─ */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        {/* Color dot */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="h-3 w-3 rounded-full shrink-0 cursor-pointer hover:scale-150 transition-transform ring-1 ring-border"
              style={{ backgroundColor: layer.fillColor || layer.color }}
              title="שנה צבע"
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" side="left" align="start">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2">בחר צבע</p>
            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onSetColor?.(layer.id, c);
                    onSetFillColor?.(layer.id, c);
                    onSetStrokeColor?.(layer.id, c);
                  }}
                  className={`h-6 w-6 rounded-md transition-all hover:scale-110 ${
                    (layer.fillColor || layer.color) === c ? "ring-2 ring-primary ring-offset-1" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <input
                type="color" value={layer.fillColor || layer.color}
                onChange={(e) => {
                  onSetColor?.(layer.id, e.target.value);
                  onSetFillColor?.(layer.id, e.target.value);
                  onSetStrokeColor?.(layer.id, e.target.value);
                }}
                className="h-6 w-6 rounded cursor-pointer border-0"
              />
              <span className="text-[9px] text-muted-foreground">צבע מותאם</span>
            </div>
          </PopoverContent>
        </Popover>

        {/* Name */}
        {editing ? (
          <input
            autoFocus
            className="text-xs font-medium flex-1 min-w-0 bg-background border border-primary/50 rounded px-1.5 py-0.5 outline-none focus:border-primary"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <span
            className="text-xs font-medium flex-1 min-w-0 truncate cursor-default select-none"
            onDoubleClick={() => { setEditing(true); setEditName(layer.name); }}
            title={`${layer.name}${featureCount ? ` (${featureCount})` : ""} — לחיצה כפולה לעריכה`}
          >
            {layer.name}
          </span>
        )}

        {/* Feature count badge */}
        {featureCount > 0 && (
          <span className="text-[9px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 tabular-nums shrink-0">
            {featureCount}
          </span>
        )}

        {/* Visibility */}
        <button
          onClick={() => onToggleVisibility(layer.id)}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent transition-colors shrink-0"
          title={layer.visible ? "הסתר" : "הצג"}
        >
          {layer.visible
            ? <Eye className="h-3.5 w-3.5 text-foreground" />
            : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          }
        </button>

        {/* Style toggle */}
        <button
          onClick={() => setShowStyle(!showStyle)}
          className={`h-6 w-6 flex items-center justify-center rounded transition-colors shrink-0 ${
            showStyle ? "bg-primary/10 text-primary" : "hover:bg-accent text-muted-foreground"
          }`}
          title="הגדרות סגנון"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>

        {/* More menu */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent transition-colors shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1.5" side="left" align="start">
            {onToggleFavorite && (
              <MenuItem
                icon={isFav ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : <StarOff className="h-3.5 w-3.5" />}
                label={isFav ? "הסר ממועדפים" : "הוסף למועדפים"}
                onClick={() => onToggleFavorite(layer.id, layer.name)}
              />
            )}
            {onZoomToLayer && (
              <MenuItem icon={<ZoomIn className="h-3.5 w-3.5" />} label="זום לשכבה" onClick={() => onZoomToLayer(layer)} />
            )}
            <MenuItem icon={<Download className="h-3.5 w-3.5" />} label="ייצא GeoJSON" onClick={() => exportGeoJSON(layer)} />
            {onReorderLayers && (
              <div className="flex items-center justify-between px-2 py-1 border-t border-border/50 mt-1 pt-1">
                <span className="text-[10px] text-muted-foreground">סדר שכבה</span>
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="icon" className="h-5 w-5" disabled={layerIdx === 0}
                    onClick={() => onReorderLayers(layerIdx, layerIdx - 1)}>
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5" disabled={layerIdx === totalLayers - 1}
                    onClick={() => onReorderLayers(layerIdx, layerIdx + 1)}>
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            <div className="border-t border-border/50 mt-1 pt-1">
              <MenuItem
                icon={<Trash2 className="h-3.5 w-3.5 text-destructive" />}
                label="הסר שכבה"
                onClick={() => onRemoveLayer(layer.id)}
                className="text-destructive hover:bg-destructive/10"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* ─ Style controls (expandable) ─ */}
      {showStyle && layer.visible && (
        <div className="px-3 pb-2.5 pt-0.5 space-y-2 border-t border-border/30 animate-fade-in">
          <StyleRow
            label="קו"
            color={layer.strokeColor || layer.color}
            opacity={(layer.strokeOpacity ?? 1) * 100}
            onColorChange={(c) => onSetStrokeColor?.(layer.id, c)}
            onOpacityChange={(v) => onSetStrokeOpacity?.(layer.id, v / 100)}
          />
          <StyleRow
            label="מילוי"
            color={layer.fillColor || layer.color}
            opacity={(layer.fillOpacity ?? 0.3) * 100}
            onColorChange={(c) => onSetFillColor?.(layer.id, c)}
            onOpacityChange={(v) => onSetFillOpacity?.(layer.id, v / 100)}
          />
        </div>
      )}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────── */
function MenuItem({ icon, label, onClick, className = "" }: {
  icon: React.ReactNode; label: string; onClick: () => void; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors ${className}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StyleRow({ label, color, opacity, onColorChange, onOpacityChange }: {
  label: string; color: string; opacity: number;
  onColorChange: (c: string) => void; onOpacityChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2" dir="rtl">
      <input
        type="color" value={color}
        onChange={(e) => onColorChange(e.target.value)}
        className="h-5 w-5 rounded cursor-pointer border border-border/50 p-0 shrink-0"
      />
      <span className="text-[10px] text-muted-foreground w-8 shrink-0 text-right">{label}</span>
      <Slider
        value={[opacity]}
        onValueChange={([v]) => onOpacityChange(v)}
        max={100} step={5}
        className="flex-1"
      />
      <span className="text-[10px] text-muted-foreground w-8 tabular-nums shrink-0">
        {Math.round(opacity)}%
      </span>
    </div>
  );
}

/* ── Main panel ────────────────────────────────────────────── */
export default function LayerPanel({
  layers, categories, onToggleVisibility, onSetOpacity,
  onSetColor, onSetStrokeColor, onSetStrokeOpacity,
  onSetFillColor, onSetFillOpacity, onRemoveLayer, onRenameLayer,
  onZoomToLayer, onReorderLayers, favorites, onToggleFavorite,
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
    a.href = url; a.download = `${layer.name}.geojson`; a.click();
    URL.revokeObjectURL(url);
  };

  const getLayerIndex = (id: string) => layers.findIndex((l) => l.id === id);

  if (layers.length === 0) {
    return (
      <div className="text-center py-10 space-y-3" dir="rtl">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
          <Layers className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">אין שכבות</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">הוסף שכבות מהקטלוג או מ-GitHub</p>
        </div>
      </div>
    );
  }

  const allVisible = layers.every((l) => l.visible);
  const noneVisible = layers.every((l) => !l.visible);

  const toggleAll = (on: boolean) => {
    layers.forEach((l) => {
      if (on ? !l.visible : l.visible) onToggleVisibility(l.id);
    });
  };

  // Sort: visible layers first within each category
  const sortedInCategory = (catLayers: GeoLayer[]) =>
    [...catLayers].sort((a, b) => (a.visible === b.visible ? 0 : a.visible ? -1 : 1));

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3 px-1 pb-2" dir="rtl">
        {/* Summary bar with toggle all */}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50 text-[10px] text-muted-foreground">
          <Layers className="h-3 w-3" />
          <span>{layers.length} שכבות</span>
          <span className="text-primary font-medium">
            {layers.filter((l) => l.visible).length} מוצגות
          </span>
          <div className="mr-auto flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => toggleAll(true)}
                  disabled={allVisible}
                  className={`h-5 w-5 flex items-center justify-center rounded transition-colors ${
                    allVisible ? "text-muted-foreground/30" : "text-primary hover:bg-primary/10"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top"><p className="text-xs">הדלק הכול</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => toggleAll(false)}
                  disabled={noneVisible}
                  className={`h-5 w-5 flex items-center justify-center rounded transition-colors ${
                    noneVisible ? "text-muted-foreground/30" : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  }`}
                >
                  <EyeOff className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top"><p className="text-xs">כבה הכול</p></TooltipContent>
            </Tooltip>
          </div>
        </div>

        {categories.map((cat) => {
          const catLayers = sortedInCategory(layers.filter((l) => l.category === cat));
          const isOpen = openCategories.includes(cat);
          const visibleCount = catLayers.filter((l) => l.visible).length;

          return (
            <Collapsible key={cat} open={isOpen} onOpenChange={() => toggleCategory(cat)}>
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-foreground hover:bg-accent/60 transition-colors">
                {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="flex-1 text-right">{cat}</span>
                <span className="text-[10px] font-normal text-muted-foreground tabular-nums">
                  {visibleCount > 0 && <span className="text-primary">{visibleCount}/</span>}
                  {catLayers.length}
                </span>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-1.5 pr-1 mt-1 animate-fade-in">
                {catLayers.map((layer) => (
                  <LayerCard
                    key={layer.id}
                    layer={layer}
                    layerIdx={getLayerIndex(layer.id)}
                    totalLayers={layers.length}
                    isFav={!!favorites?.has(layer.id)}
                    onToggleVisibility={onToggleVisibility}
                    onSetColor={onSetColor}
                    onSetStrokeColor={onSetStrokeColor}
                    onSetStrokeOpacity={onSetStrokeOpacity}
                    onSetFillColor={onSetFillColor}
                    onSetFillOpacity={onSetFillOpacity}
                    onRemoveLayer={onRemoveLayer}
                    onRenameLayer={onRenameLayer}
                    onZoomToLayer={onZoomToLayer}
                    onReorderLayers={onReorderLayers}
                    onToggleFavorite={onToggleFavorite}
                    exportGeoJSON={exportLayerGeoJSON}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
