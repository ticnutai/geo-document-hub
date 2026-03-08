import { useState, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ChevronDown, ChevronLeft, MapPinned } from "lucide-react";
import { loadAllMigrashimByGush, loadMigrashDataForGush, getAvailableGushim } from "@/data/complot-data";

export default function ComplotPanel() {
  const [migrashimByGush, setMigrashimByGush] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedGush, setExpandedGush] = useState<string | null>(null);
  const [migrashDetail, setMigrashDetail] = useState<Record<string, any> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const availableGushim = useMemo(() => getAvailableGushim(), []);

  useEffect(() => {
    loadAllMigrashimByGush().then((data) => {
      setMigrashimByGush(data);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs mr-2">טוען נתוני קומפלוט...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex items-center gap-2 px-1">
        <MapPinned className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold">קומפלוט כפר חב״ד</span>
        <span className="text-[10px] text-muted-foreground mr-auto">{gushList.length} גושים</span>
      </div>

      <input
        type="text"
        placeholder="חיפוש גוש..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-0.5 pr-1">
          {gushList.map((gush) => {
            const isExpanded = expandedGush === gush;
            const migrashim = migrashimByGush[gush] || [];

            return (
              <div key={gush} className="border border-border/40 rounded-md">
                <button
                  onClick={() => handleExpandGush(gush)}
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-accent/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronLeft className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="font-medium">גוש {gush}</span>
                  <span className="text-[9px] text-muted-foreground mr-auto">
                    {migrashim.length > 0 ? `${migrashim.length} מגרשים` : ""}
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-2 pb-2 space-y-1">
                    {detailLoading ? (
                      <div className="flex items-center gap-1 py-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-[10px]">טוען...</span>
                      </div>
                    ) : (
                      <>
                        {migrashim.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">מגרשים:</p>
                            <div className="flex flex-wrap gap-1">
                              {migrashim
                                .filter((m: any) => m.label?.trim())
                                .slice(0, 50)
                                .map((m: any, i: number) => (
                                  <span
                                    key={i}
                                    className="text-[9px] bg-accent/60 px-1.5 py-0.5 rounded"
                                  >
                                    {m.label}
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}

                        {migrashDetail && Object.keys(migrashDetail).length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                              פרטי חלקות ({Object.keys(migrashDetail).length}):
                            </p>
                            <div className="space-y-0.5 max-h-48 overflow-y-auto">
                              {Object.entries(migrashDetail).slice(0, 30).map(([helka, info]: [string, any]) => (
                                <div key={helka} className="text-[10px] bg-muted/30 rounded px-1.5 py-1">
                                  <span className="font-medium">חלקה {helka}</span>
                                  {info.gush && <span className="text-muted-foreground"> · גוש {info.gush}</span>}
                                  {info.yeud && <span className="text-muted-foreground"> · {info.yeud}</span>}
                                  {info.shetach && <span className="text-muted-foreground"> · {info.shetach} מ״ר</span>}
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
            <p className="text-xs text-muted-foreground text-center py-4">לא נמצאו גושים</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
