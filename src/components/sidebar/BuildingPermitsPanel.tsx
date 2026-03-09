import { useState, useEffect, useMemo, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Hammer, ExternalLink, Search, MapPin, Layers } from "lucide-react";
import { loadGisnetLayer, GISNET_LAYERS } from "@/data/gisnet-layers-data";
import type { GeoLayer } from "@/types/gis";

interface BuildingPermitsPanelProps {
  onHighlightFeature?: (feature: GeoJSON.Feature | GeoJSON.Feature[], color?: string, label?: string) => void;
  onLayerAdd?: (layer: GeoLayer) => void;
}

interface PermitFeature {
  id: number;
  settlement: string;
  plan: string;
  applicant: string;
  gush: number;
  helka: number;
  migrash: string;
  urlRequest: string;
  urlFile: string;
  gushParcel: string;
  feature: GeoJSON.Feature;
}

export default function BuildingPermitsPanel({ onHighlightFeature, onLayerAdd }: BuildingPermitsPanelProps) {
  const fcRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PermitFeature[]>([]);
  const [search, setSearch] = useState("");
  const [settlementFilter, setSettlementFilter] = useState("");

  useEffect(() => {
    loadGisnetLayer(GISNET_LAYERS.buildingPermits).then((fc) => {
      fcRef.current = fc;
      const permits = fc.features.map((f) => {
        const p = f.properties || {};
        return {
          id: p.OBJECTID,
          settlement: p.settlement || "",
          plan: p.tochnit || "",
          applicant: p.mevakesh || "",
          gush: p.gush || 0,
          helka: p.helka || 0,
          migrash: (p.migrash || "").trim(),
          urlRequest: p.url_bkasha || "",
          urlFile: p.url_tik || "",
          gushParcel: p.gush_parce || "",
          feature: f,
        };
      });
      setData(permits);
      setLoading(false);
    });
  }, []);

  const settlements = useMemo(() => {
    const set = new Set(data.map((d) => d.settlement).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "he"));
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((p) => {
      if (settlementFilter && p.settlement !== settlementFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.applicant.toLowerCase().includes(q) ||
          p.plan.toLowerCase().includes(q) ||
          p.gushParcel.includes(q) ||
          p.settlement.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, search, settlementFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs mr-2">טוען היתרי בנייה...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2" dir="rtl">
      <div className="flex items-center gap-2">
        <Hammer className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold">היתרי בנייה</span>
        <span className="text-[9px] text-muted-foreground mr-auto">{filtered.length} / {data.length}</span>
      </div>

      <div className="flex gap-1">
        <div className="relative flex-1">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חפש מבקש, תוכנית, גוש..."
            className="w-full rounded-md border border-input bg-background pr-7 pl-2 py-1.5 text-[10px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          value={settlementFilter}
          onChange={(e) => setSettlementFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-1 py-1 text-[10px] max-w-[80px]"
        >
          <option value="">כל הישובים</option>
          {settlements.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <ScrollArea className="h-[calc(100vh-260px)]">
        <div className="space-y-1">
          {filtered.slice(0, 100).map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-border/60 bg-card p-2 hover:bg-accent/30 transition-colors cursor-pointer"
              onClick={() => onHighlightFeature?.(p.feature, "#e74c3c", `היתר: ${p.gushParcel}`)}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-medium truncate">{p.applicant}</div>
                  <div className="text-[9px] text-muted-foreground">{p.plan}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground">{p.settlement} | {p.gushParcel}</span>
                    {p.migrash && <span className="text-[9px] text-muted-foreground">מגרש {p.migrash}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  {p.urlRequest && (
                    <a
                      href={p.urlRequest}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[8px] text-primary hover:underline flex items-center gap-0.5"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      בקשה
                    </a>
                  )}
                  {p.urlFile && (
                    <a
                      href={p.urlFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[8px] text-primary hover:underline flex items-center gap-0.5"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      תיק
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length > 100 && (
            <div className="text-center text-[9px] text-muted-foreground py-2">
              מציג 100 מתוך {filtered.length} תוצאות. צמצם את החיפוש.
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
