import { useState, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ChevronDown, ChevronLeft, MapPinned, Search, MapPin } from "lucide-react";
import { loadAllMigrashimByGush, loadMigrashDataForGush, getAvailableGushim } from "@/data/complot-data";
import { loadAllGushFeatures } from "@/data/cadastre-data";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ComplotPanelProps {
  onHighlightFeature?: (feature: GeoJSON.Feature | GeoJSON.Feature[], color?: string, label?: string) => void;
}

export default function ComplotPanel({ onHighlightFeature }: ComplotPanelProps) {
  const [migrashimByGush, setMigrashimByGush] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedGush, setExpandedGush] = useState<string | null>(null);
  const [migrashDetail, setMigrashDetail] = useState<Record<string, any> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [gushFeatures, setGushFeatures] = useState<Map<string, GeoJSON.Feature[]>>(new Map());

  const availableGushim = useMemo(() => getAvailableGushim(), []);

  useEffect(() => {
    Promise.all([
      loadAllMigrashimByGush(),
      loadAllGushFeatures(),
    ]).then(([data, gushGeo]) => {
      setMigrashimByGush(data);
      setGushFeatures(gushGeo);
      setLoading(false);
    });
  }, []);

  const gushList = useMemo(() => {
    const allKeys = new Set([...Object.keys(migrashimByGush), ...availableGushim]);
    return Array.from(allKeys)
      .sort((a, b) => Number(a) - Number(b))
      .filter((g) => !search || g.includes(search));
  }, [migrashimByGush, availableGushim, search]);

  const handleExpandGush = async (gush: string) => {
    if (expandedGush === gush) {
      setExpandedGush(null);
      setMigrashDetail(null);
      return;
    }
    setExpandedGush(gush);
    setDetailLoading(true);
    const data = await loadMigrashDataForGush(gush);
    setMigrashDetail(data);
    setDetailLoading(false);
  };

  const handleZoomToGush = (gush: string) => {
    if (!onHighlightFeature) return;
    const features = gushFeatures.get(gush);
    if (features && features.length > 0) {
      onHighlightFeature(features, "#f59e0b", `גוש ${gush}`);
    } else {
      toast.info("לא נמצאה גיאומטריה לגוש זה");
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 p-1 animate-fade-in">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-fade-in" dir="rtl">
      <div className="flex items-center gap-2 px-1">
        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
          <MapPinned className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1">
          <span className="text-xs font-semibold">קומפלוט כפר חב״ד</span>
          <p className="text-[9px] text-muted-foreground">{gushList.length} גושים</p>
        </div>
      </div>

      <div className="relative px-1">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <input
          type="text"
          placeholder="חיפוש גוש..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-background pr-8 pl-2 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
        />
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-0.5 pr-1">
          {gushList.map((gush) => {
            const isExpanded = expandedGush === gush;
            const migrashim = migrashimByGush[gush] || [];
            const hasData = availableGushim.includes(gush);
            const hasGeo = gushFeatures.has(gush);

            return (
              <div key={gush} className={`rounded-lg border transition-all duration-200 ${
                isExpanded ? "border-primary/30 bg-primary/5" : "border-border/40"
              }`}>
                <button
                  onClick={() => handleExpandGush(gush)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent/30 transition-colors rounded-lg"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 shrink-0 text-primary" />
                  ) : (
                    <ChevronLeft className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="font-medium">גוש {gush}</span>
                  {hasGeo && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleZoomToGush(gush); }}
                      className="p-0.5 rounded hover:bg-primary/20 transition-colors"
                      title="הצג במפה"
                    >
                      <MapPin className="h-3 w-3 text-primary" />
                    </button>
                  )}
                  <span className="text-[9px] text-muted-foreground mr-auto flex items-center gap-1">
                    {migrashim.length > 0 && <span>{migrashim.length} מגרשים</span>}
                    {hasData && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-2.5 space-y-1.5 animate-fade-in">
                    {hasGeo && (
                      <button
                        onClick={() => handleZoomToGush(gush)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-[10px] text-primary font-medium hover:bg-primary/10 transition-colors"
                      >
                        <MapPin className="h-3 w-3" />
                        הצג גוש במפה
                      </button>
                    )}

                    {detailLoading ? (
                      <div className="space-y-1.5 py-1">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-6 w-full rounded" />
                        ))}
                      </div>
                    ) : (
                      <>
                        {migrashim.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">מגרשים:</p>
                            <div className="flex flex-wrap gap-1">
                              {migrashim
                                .filter((m: any) => m.label?.trim())
                                .slice(0, 50)
                                .map((m: any, i: number) => (
                                  <span
                                    key={i}
                                    className="text-[9px] bg-accent px-1.5 py-0.5 rounded-md transition-colors hover:bg-accent/80"
                                  >
                                    {m.label}
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}

                        {migrashDetail && Object.keys(migrashDetail).length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                              פרטי חלקות ({Object.keys(migrashDetail).length}):
                            </p>
                            <div className="space-y-0.5 max-h-48 overflow-y-auto">
                              {Object.entries(migrashDetail).slice(0, 30).map(([helka, info]: [string, any]) => (
                                <div key={helka} className="text-[10px] bg-muted/40 rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors">
                                  <span className="font-medium text-foreground">חלקה {helka}</span>
                                  <div className="text-muted-foreground mt-0.5">
                                    {info.gush && <span>גוש {info.gush} · </span>}
                                    {info.yeud && <span>{info.yeud} · </span>}
                                    {info.shetach && <span>{info.shetach} מ״ר</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {gushList.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <MapPinned className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">לא נמצאו גושים</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
