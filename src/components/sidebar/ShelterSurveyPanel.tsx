import { useState, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Shield, Search, MapPin, AlertTriangle, CheckCircle } from "lucide-react";
import { loadGisnetLayer, GISNET_LAYERS } from "@/data/gisnet-layers-data";

interface ShelterSurveyPanelProps {
  onHighlightFeature?: (feature: GeoJSON.Feature | GeoJSON.Feature[], color?: string, label?: string) => void;
}

interface ShelterItem {
  id: number;
  protectionDesc: string;
  protectionCode: number;
  buildingHeight: number;
  settlement: string;
  feature: GeoJSON.Feature;
}

const PROTECTION_COLORS: Record<number, string> = {
  2: "#ef4444", // ללא מיגון
  4: "#f59e0b", // מקלט ציבורי
  8: "#22c55e", // ממד/ממק
};

export default function ShelterSurveyPanel({ onHighlightFeature }: ShelterSurveyPanelProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ShelterItem[]>([]);
  const [search, setSearch] = useState("");
  const [protectionFilter, setProtectionFilter] = useState<number | null>(null);

  useEffect(() => {
    loadGisnetLayer(GISNET_LAYERS.shelterSurvey).then((fc) => {
      const items = fc.features.map((f) => {
        const p = f.properties || {};
        return {
          id: p.OBJECTID_1 || 0,
          protectionDesc: p.Protecti1 || "",
          protectionCode: p.Protective || 0,
          buildingHeight: p.BLDGHT || 0,
          settlement: p.settlenam || "",
          feature: f,
        };
      });
      setData(items);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const protected_ = data.filter((d) => d.protectionCode === 8).length;
    const unprotected = data.filter((d) => d.protectionCode === 2).length;
    const publicShelter = data.filter((d) => d.protectionCode === 4).length;
    return { protected: protected_, unprotected, publicShelter, total: data.length };
  }, [data]);

  const settlements = useMemo(() => {
    const set = new Set(data.map((d) => d.settlement).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "he"));
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((item) => {
      if (protectionFilter !== null && item.protectionCode !== protectionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return item.settlement.toLowerCase().includes(q) || item.protectionDesc.toLowerCase().includes(q);
      }
      return true;
    });
  }, [data, search, protectionFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs mr-2">טוען סקר מיגון...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2" dir="rtl">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold">סקר מיגון</span>
        <span className="text-[9px] text-muted-foreground mr-auto">{data.length} מבנים</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-1">
        <button
          onClick={() => setProtectionFilter(protectionFilter === 8 ? null : 8)}
          className={`rounded-lg border p-1.5 text-center transition-colors ${
            protectionFilter === 8 ? "border-green-500 bg-green-500/10" : "border-border hover:bg-accent/30"
          }`}
        >
          <CheckCircle className="h-3 w-3 mx-auto text-green-500 mb-0.5" />
          <div className="text-[11px] font-bold text-green-600">{stats.protected}</div>
          <div className="text-[8px] text-muted-foreground">ממוגן</div>
        </button>
        <button
          onClick={() => setProtectionFilter(protectionFilter === 2 ? null : 2)}
          className={`rounded-lg border p-1.5 text-center transition-colors ${
            protectionFilter === 2 ? "border-red-500 bg-red-500/10" : "border-border hover:bg-accent/30"
          }`}
        >
          <AlertTriangle className="h-3 w-3 mx-auto text-red-500 mb-0.5" />
          <div className="text-[11px] font-bold text-red-600">{stats.unprotected}</div>
          <div className="text-[8px] text-muted-foreground">ללא מיגון</div>
        </button>
        <button
          onClick={() => setProtectionFilter(protectionFilter === 4 ? null : 4)}
          className={`rounded-lg border p-1.5 text-center transition-colors ${
            protectionFilter === 4 ? "border-amber-500 bg-amber-500/10" : "border-border hover:bg-accent/30"
          }`}
        >
          <Shield className="h-3 w-3 mx-auto text-amber-500 mb-0.5" />
          <div className="text-[11px] font-bold text-amber-600">{stats.publicShelter}</div>
          <div className="text-[8px] text-muted-foreground">מקלט ציבורי</div>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חפש ישוב..."
          className="w-full rounded-md border border-input bg-background pr-7 pl-2 py-1.5 text-[10px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <ScrollArea className="h-[calc(100vh-340px)]">
        <div className="space-y-1">
          {filtered.slice(0, 80).map((item) => {
            const color = PROTECTION_COLORS[item.protectionCode] || "#6b7280";
            return (
              <div
                key={item.id}
                className="rounded-lg border border-border/60 bg-card p-2 hover:bg-accent/30 transition-colors cursor-pointer flex items-center gap-2"
                onClick={() => onHighlightFeature?.(item.feature, color, `${item.settlement} - ${item.protectionDesc}`)}
              >
                <div
                  className="w-2 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-medium truncate">{item.protectionDesc}</div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground">{item.settlement}</span>
                    {item.buildingHeight > 0 && (
                      <span className="text-[9px] text-muted-foreground">| גובה: {item.buildingHeight.toFixed(1)} מ'</span>
                    )}
                  </div>
                </div>
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
