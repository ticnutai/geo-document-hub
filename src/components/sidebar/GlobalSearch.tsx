import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Search, Building2, Grid3X3, Landmark, FileText, Layers, Loader2, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { loadPlans, extractPlans, loadMigrashim, extractMigrashim, loadPlansByBlock, loadDocsIndex } from "@/data/plans-data";
import { Skeleton } from "@/components/ui/skeleton";

interface GlobalSearchProps {
  onLocationSelect: (lat: number, lng: number, name: string) => void;
  onHighlightFeature?: (feature: GeoJSON.Feature | GeoJSON.Feature[], color?: string, label?: string) => void;
  onNavigateTo?: (tab: string, search?: string) => void;
}

interface SearchResult {
  type: "plan" | "migrash" | "block" | "document";
  title: string;
  subtitle: string;
  data?: any;
}

export default function GlobalSearch({ onLocationSelect, onHighlightFeature, onNavigateTo }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [allData, setAllData] = useState<{
    plans: any[];
    migrashim: any[];
    blocks: string[];
    docsCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoResults, setGeoResults] = useState<any[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadPlans(), loadMigrashim(), loadPlansByBlock(), loadDocsIndex()]).then(
      ([plansRaw, migRaw, blockRaw, docsIdx]) => {
        setAllData({
          plans: extractPlans(plansRaw),
          migrashim: extractMigrashim(migRaw),
          blocks: blockRaw?.block_plan_map ? Object.keys(blockRaw.block_plan_map) : [],
          docsCount: docsIdx?.total_documents_in_metadata || 0,
        });
        setLoading(false);
      }
    );
  }, []);

  const searchGeo = useCallback((q: string) => {
    if (!q.trim() || q.length < 3) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setGeoLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=il`
        );
        setGeoResults(await res.json());
      } catch {
        setGeoResults([]);
      }
      setGeoLoading(false);
    }, 400);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim() || !allData) return [];
    const q = query.toLowerCase();
    const res: SearchResult[] = [];

    for (const p of allData.plans) {
      if (p.planName.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)) {
        res.push({ type: "plan", title: p.planName, subtitle: p.title || p.status || "", data: p });
      }
      if (res.length > 50) break;
    }

    for (const m of allData.migrashim) {
      if (m.migrash.includes(q) || m.plan.toLowerCase().includes(q) || m.yeud.toLowerCase().includes(q)) {
        res.push({ type: "migrash", title: `מגרש ${m.migrash}`, subtitle: `${m.plan} · ${m.yeud}`, data: m });
      }
      if (res.length > 80) break;
    }

    for (const b of allData.blocks) {
      if (b.includes(q)) {
        res.push({ type: "block", title: `גוש ${b}`, subtitle: "", data: { block: b } });
      }
      if (res.length > 100) break;
    }

    return res.slice(0, 50);
  }, [query, allData]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of results) {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    }
    return groups;
  }, [results]);

  const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
    plan: { label: "תוכניות", icon: Building2, color: "text-blue-500" },
    migrash: { label: "מגרשים", icon: Grid3X3, color: "text-green-500" },
    block: { label: "גושים", icon: Landmark, color: "text-amber-500" },
    document: { label: "מסמכים", icon: FileText, color: "text-purple-500" },
  };

  const highlight = (text: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/20 text-foreground rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div className="space-y-2 p-1 animate-fade-in" dir="rtl">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
          <Search className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-xs font-semibold">חיפוש גלובלי</span>
      </div>

      <div className="relative">
        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="חיפוש תוכנית, מגרש, גוש, מיקום..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            searchGeo(e.target.value);
          }}
          className="w-full rounded-lg border border-border bg-background pr-8 pl-2 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
        />
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Quick stats */}
      {!query && allData && (
        <div className="grid grid-cols-3 gap-1 px-1">
          <div className="rounded-md border border-border/40 bg-muted/30 p-1.5 text-center">
            <p className="text-xs font-bold">{allData.plans.length}</p>
            <p className="text-[9px] text-muted-foreground">תוכניות</p>
          </div>
          <div className="rounded-md border border-border/40 bg-muted/30 p-1.5 text-center">
            <p className="text-xs font-bold">{allData.migrashim.length}</p>
            <p className="text-[9px] text-muted-foreground">מגרשים</p>
          </div>
          <div className="rounded-md border border-border/40 bg-muted/30 p-1.5 text-center">
            <p className="text-xs font-bold">{allData.blocks.length}</p>
            <p className="text-[9px] text-muted-foreground">גושים</p>
          </div>
        </div>
      )}

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-3 pr-1">
          {Object.entries(grouped).map(([type, items]) => {
            const config = typeConfig[type] || { label: type, icon: Layers, color: "text-foreground" };
            const Icon = config.icon;
            return (
              <div key={type} className="animate-fade-in">
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <Icon className={`h-3 w-3 ${config.color}`} />
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {config.label} ({items.length})
                  </span>
                </div>
                <div className="space-y-0.5">
                  {items.slice(0, 15).map((r, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (r.type === "plan" && onNavigateTo) {
                          onNavigateTo("plans", r.title);
                        } else if (r.type === "migrash" && onNavigateTo) {
                          onNavigateTo("migrashim", r.data?.migrash);
                        } else if (r.type === "block" && onNavigateTo) {
                          onNavigateTo("blocks", r.data?.block);
                        }
                      }}
                      className="flex flex-col w-full text-right rounded-lg px-2.5 py-1.5 text-[11px] hover:bg-accent/50 cursor-pointer transition-all duration-150 hover:translate-x-0.5"
                    >
                      <div className="font-medium truncate">{highlight(r.title)}</div>
                      {r.subtitle && (
                        <div className="text-[9px] text-muted-foreground truncate">{highlight(r.subtitle)}</div>
                      )}
                    </button>
                  ))}
                  {items.length > 15 && (
                    <p className="text-[9px] text-muted-foreground px-2">
                      +{items.length - 15} תוצאות נוספות
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Geo results */}
          {geoResults.length > 0 && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <MapPin className="h-3 w-3 text-red-500" />
                <span className="text-[10px] font-semibold text-muted-foreground">מיקומים</span>
              </div>
              {geoResults.map((r: any, i: number) => (
                <button
                  key={i}
                  onClick={() => onLocationSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name)}
                  className="flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-accent/50 transition-all duration-150 hover:translate-x-0.5"
                >
                  <MapPin className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-tight truncate">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}

          {geoLoading && (
            <div className="flex items-center gap-1.5 px-2 py-1">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-[10px] text-muted-foreground">מחפש מיקום...</span>
            </div>
          )}

          {query && results.length === 0 && geoResults.length === 0 && !loading && !geoLoading && (
            <div className="text-center py-8 space-y-2">
              <Search className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-xs text-muted-foreground">לא נמצאו תוצאות</p>
            </div>
          )}

          {!query && !allData && (
            <div className="text-center py-8 space-y-2">
              <Search className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-xs text-muted-foreground">הקלד לחיפוש בתוכניות, מגרשים, גושים ומיקומים</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
