import { useState, useEffect, useMemo, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Building, Search, MapPin, GraduationCap, Bus, Landmark, ShoppingBag, Heart, Stethoscope, BookOpen, Layers } from "lucide-react";
import { loadGisnetLayer, GISNET_LAYERS } from "@/data/gisnet-layers-data";
import type { GeoLayer } from "@/types/gis";

interface InfrastructurePanelProps {
  onHighlightFeature?: (feature: GeoJSON.Feature | GeoJSON.Feature[], color?: string, label?: string) => void;
  onLayerAdd?: (layer: GeoLayer) => void;
}

interface InfraItem {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  categoryIcon: any;
  categoryColor: string;
  feature: GeoJSON.Feature;
}

const CATEGORIES = [
  { key: "kindergartens", label: "גני ילדים", icon: GraduationCap, color: "#f59e0b", file: GISNET_LAYERS.kindergartens, nameField: "USG_SP_NAM" },
  { key: "schools", label: "בתי ספר", icon: BookOpen, color: "#3b82f6", file: GISNET_LAYERS.schools, nameField: "USG_SP_NAM" },
  { key: "synagogues", label: "בתי כנסת", icon: Landmark, color: "#8b5cf6", file: GISNET_LAYERS.synagogues, nameField: "USG_SP_NAM" },
  { key: "commerce", label: "מסחר", icon: ShoppingBag, color: "#10b981", file: GISNET_LAYERS.commerce, nameField: "USG_SP_NAM" },
  { key: "medical", label: "רפואה", icon: Stethoscope, color: "#ef4444", file: GISNET_LAYERS.medical, nameField: "USG_SP_NAM" },
  { key: "culture", label: "תרבות ורווחה", icon: Heart, color: "#ec4899", file: GISNET_LAYERS.culture, nameField: "USG_SP_NAM" },
  { key: "busStops", label: "תחנות אוטובוס", icon: Bus, color: "#6366f1", file: GISNET_LAYERS.busStops, nameField: "USG_SP_NAM" },
  { key: "publicInst", label: "מוסדות ציבור", icon: Building, color: "#14b8a6", file: GISNET_LAYERS.publicInst, nameField: "USG_SP_NAM" },
  { key: "daycares", label: "מעונות", icon: GraduationCap, color: "#f97316", file: GISNET_LAYERS.daycares, nameField: "USG_SP_NAM" },
  { key: "sports", label: "ספורט ונופש", icon: Heart, color: "#06b6d4", file: GISNET_LAYERS.sports, nameField: "USG_SP_NAM" },
];

export default function InfrastructurePanel({ onHighlightFeature }: InfrastructurePanelProps) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InfraItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");

  useEffect(() => {
    const loadAll = async () => {
      const allItems: InfraItem[] = [];
      await Promise.all(
        CATEGORIES.map(async (cat) => {
          try {
            const fc = await loadGisnetLayer(cat.file);
            fc.features.forEach((f, i) => {
              const p = f.properties || {};
              allItems.push({
                id: `${cat.key}-${i}`,
                name: p[cat.nameField] || p.USG_SP_NAM || cat.label,
                nameEn: p.USG_SP_NM_ || "",
                category: cat.label,
                categoryIcon: cat.icon,
                categoryColor: cat.color,
                feature: f,
              });
            });
          } catch {}
        })
      );
      setItems(allItems);
      setLoading(false);
    };
    loadAll();
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (activeCategory && item.category !== activeCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.nameEn.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, search, activeCategory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs mr-2">טוען תשתיות ומוסדות...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2" dir="rtl">
      <div className="flex items-center gap-2">
        <Building className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold">תשתיות ומוסדות</span>
        <span className="text-[9px] text-muted-foreground mr-auto">{items.length} פריטים</span>
      </div>

      <div className="relative">
        <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חפש מוסד או שירות..."
          className="w-full rounded-md border border-input bg-background pr-7 pl-2 py-1.5 text-[10px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setActiveCategory("")}
          className={`px-2 py-0.5 rounded-full text-[9px] border transition-colors ${
            !activeCategory ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-accent"
          }`}
        >
          הכל ({items.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = categoryCounts[cat.label] || 0;
          if (count === 0) return null;
          const CatIcon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(activeCategory === cat.label ? "" : cat.label)}
              className={`px-2 py-0.5 rounded-full text-[9px] border transition-colors flex items-center gap-0.5 ${
                activeCategory === cat.label
                  ? "text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
              style={activeCategory === cat.label ? { backgroundColor: cat.color, borderColor: cat.color } : undefined}
            >
              <CatIcon className="h-2.5 w-2.5" />
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-1">
          {filtered.slice(0, 80).map((item) => {
            const CatIcon = item.categoryIcon;
            return (
              <div
                key={item.id}
                className="rounded-lg border border-border/60 bg-card p-2 hover:bg-accent/30 transition-colors cursor-pointer flex items-center gap-2"
                onClick={() => onHighlightFeature?.(item.feature, item.categoryColor, item.name)}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: item.categoryColor + "20" }}
                >
                  <CatIcon className="h-3.5 w-3.5" style={{ color: item.categoryColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-medium truncate">{item.name}</div>
                  <div className="text-[9px] text-muted-foreground">{item.category}</div>
                </div>
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              </div>
            );
          })}
          {filtered.length > 80 && (
            <div className="text-center text-[9px] text-muted-foreground py-2">
              מציג 80 מתוך {filtered.length}. צמצם את החיפוש.
            </div>
          )}
          {filtered.length === 0 && (
            <div className="text-center text-[10px] text-muted-foreground py-4">לא נמצאו תוצאות</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
