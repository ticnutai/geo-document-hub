import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Building2, Grid3X3, Landmark, FileText, Layers, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { loadPlans, extractPlans, loadMigrashim, extractMigrashim, loadPlansByBlock, loadDocsIndex } from "@/data/plans-data";

interface GlobalSearchProps {
  onLocationSelect: (lat: number, lng: number, name: string) => void;
}

interface SearchResult {
  type: "plan" | "migrash" | "block" | "document";
  title: string;
  subtitle: string;
  data?: any;
}

export default function GlobalSearch({ onLocationSelect }: GlobalSearchProps) {
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

  const searchGeo = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setGeoLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=3`
      );
      setGeoResults(await res.json());
    } catch {
      setGeoResults([]);
    }
    setGeoLoading(false);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim() || !allData) return [];
    const q = query.toLowerCase();
    const res: SearchResult[] = [];

    // Plans
    for (const p of allData.plans) {
      if (p.planName.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)) {
        res.push({ type: "plan", title: p.planName, subtitle: p.title || p.status || "", data: p });
      }
      if (res.length > 50) break;
    }

    // Migrashim
    for (const m of allData.migrashim) {
      if (m.migrash.includes(q) || m.plan.toLowerCase().includes(q) || m.yeud.toLowerCase().includes(q)) {
        res.push({ type: "migrash", title: `מגרש ${m.migrash}`, subtitle: `${m.plan} · ${m.yeud}` });
      }
      if (res.length > 80) break;
    }

    // Blocks
    for (const b of allData.blocks) {
      if (b.includes(q)) {
        res.push({ type: "block", title: `גוש ${b}`, subtitle: "" });
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

  const typeLabel: Record<string, { label: string; icon: any }> = {
    plan: { label: "תוכניות", icon: Building2 },
    migrash: { label: "מגרשים", icon: Grid3X3 },
    block: { label: "גושים", icon: Landmark },
    document: { label: "מסמכים", icon: FileText },
  };

  return (
    <div className="space-y-2 p-1" dir="rtl">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold">חיפוש גלובלי</span>
      </div>

      <input
        type="text"
        placeholder="חיפוש תוכנית, מגרש, גוש, מיקום..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.length > 2) searchGeo(e.target.value);
        }}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-2 pr-1">
          {/* Data results */}
          {Object.entries(grouped).map(([type, items]) => {
            const { label, icon: Icon } = typeLabel[type] || { label: type, icon: Layers };
            return (
              <div key={type}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {label} ({items.length})
                  </span>
                </div>
                <div className="space-y-0.5">
                  {items.slice(0, 10).map((r, i) => (
                    <div
                      key={i}
                      className="rounded-md px-2 py-1 text-[11px] hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <div className="font-medium truncate">{r.title}</div>
                      {r.subtitle && (
                        <div className="text-[9px] text-muted-foreground truncate">{r.subtitle}</div>
                      )}
                    </div>
                  ))}
                  {items.length > 10 && (
                    <p className="text-[9px] text-muted-foreground px-2">
                      +{items.length - 10} תוצאות נוספות
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Geo results */}
          {geoResults.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Search className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground">מיקומים</span>
              </div>
              {geoResults.map((r: any, i: number) => (
                <button
                  key={i}
                  onClick={() => onLocationSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name)}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1 text-right hover:bg-accent/50 transition-colors"
                >
                  <span className="text-[11px] leading-tight truncate">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}

          {geoLoading && (
            <div className="flex items-center gap-1 px-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-[10px]">מחפש מיקום...</span>
            </div>
          )}

          {query && results.length === 0 && geoResults.length === 0 && !loading && !geoLoading && (
            <p className="text-xs text-muted-foreground text-center py-4">לא נמצאו תוצאות</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
