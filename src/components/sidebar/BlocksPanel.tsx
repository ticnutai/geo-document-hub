import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ChevronDown, ChevronLeft, Landmark, MapPin } from "lucide-react";
import { loadBlocksByPlan, loadPlansByBlock, extractBlocksParcels, type BlockParcelEntry } from "@/data/plans-data";
import { loadAllGushFeatures } from "@/data/cadastre-data";
import { toast } from "sonner";

interface BlocksPanelProps {
  onHighlightFeature?: (feature: GeoJSON.Feature | GeoJSON.Feature[], color?: string, label?: string) => void;
}

export default function BlocksPanel({ onHighlightFeature }: BlocksPanelProps) {
  const [blockData, setBlockData] = useState<Map<string, BlockParcelEntry[]>>(new Map());
  const [plansByBlock, setPlansByBlock] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [gushFeatures, setGushFeatures] = useState<Map<string, GeoJSON.Feature[]>>(new Map());
  const [gushLoading, setGushLoading] = useState(false);

  useEffect(() => {
    Promise.all([loadBlocksByPlan(), loadPlansByBlock()]).then(([bp, pb]) => {
      setBlockData(extractBlocksParcels(bp));
      setPlansByBlock(pb);
      setLoading(false);
    });
    // Load gush features in background
    setGushLoading(true);
    loadAllGushFeatures().then((data) => {
      setGushFeatures(data);
      setGushLoading(false);
    });
  }, []);

  const blocks = Array.from(blockData.keys()).sort((a, b) => Number(a) - Number(b));

  const allBlocks = new Set([...blocks]);
  if (plansByBlock?.block_plan_map) {
    for (const b of Object.keys(plansByBlock.block_plan_map)) {
      allBlocks.add(b);
    }
  }
  const sortedAllBlocks = Array.from(allBlocks).sort((a, b) => Number(a) - Number(b)).filter((b) => !search || b.includes(search));

  const handleZoomToBlock = (blockNum: string) => {
    if (!onHighlightFeature) return;
    const features = gushFeatures.get(blockNum);
    if (features && features.length > 0) {
      onHighlightFeature(features, "#2563eb", `גוש ${blockNum}`);
    } else {
      toast.info("לא נמצאה גיאומטריה לגוש זה במפה");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs mr-2">טוען גושים...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex items-center gap-2 px-1">
        <Landmark className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold">גושים וחלקות ({sortedAllBlocks.length})</span>
        {gushLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
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
          {sortedAllBlocks.map((block) => {
            const isExpanded = expandedBlock === block;
            const parcels = blockData.get(block) || [];
            const plansList = plansByBlock?.block_plan_map?.[block] || [];
            const hasGeo = gushFeatures.has(block);

            return (
              <div key={block} className="border border-border/40 rounded-md">
                <button
                  onClick={() => setExpandedBlock(isExpanded ? null : block)}
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-accent/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronLeft className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="font-medium">גוש {block}</span>
                  {hasGeo && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleZoomToBlock(block); }}
                      className="p-0.5 rounded hover:bg-primary/20 transition-colors"
                      title="הצג במפה"
                    >
                      <MapPin className="h-3 w-3 text-primary" />
                    </button>
                  )}
                  <span className="text-[9px] text-muted-foreground mr-auto">
                    {plansList.length > 0 ? `${plansList.length} תוכניות` : ""}
                    {parcels.length > 0 ? ` · ${parcels.length} רשומות` : ""}
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-2 pb-2 space-y-1.5">
                    {hasGeo && (
                      <button
                        onClick={() => handleZoomToBlock(block)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-[10px] text-primary font-medium hover:bg-primary/10 transition-colors"
                      >
                        <MapPin className="h-3 w-3" />
                        הצג גוש במפה
                      </button>
                    )}

                    {plansList.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">תוכניות:</p>
                        <div className="flex flex-wrap gap-1">
                          {plansList.map((p: string) => (
                            <span key={p} className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {parcels.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">חלקות לפי תוכנית:</p>
                        <div className="space-y-0.5">
                          {parcels.map((p, i) => (
                            <div key={i} className="text-[10px] bg-muted/30 rounded px-1.5 py-1">
                              <div className="font-medium">{p.plan}</div>
                              <div className="text-muted-foreground">
                                {p.blockType && <span>{p.blockType} · </span>}
                                {p.partiality}
                                {p.parcelsWhole && <span> · חלקות: {p.parcelsWhole}</span>}
                                {p.parcelsPartial && <span> · חלקי: {p.parcelsPartial}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {sortedAllBlocks.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">לא נמצאו גושים</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
