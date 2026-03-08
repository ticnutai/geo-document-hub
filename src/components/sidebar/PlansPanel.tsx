import { useState, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ChevronDown, ChevronLeft, ExternalLink, Building2, Map, FileText } from "lucide-react";
import { loadPlans, extractPlans, loadDocsIndex, type PlanSummary } from "@/data/plans-data";
import { Button } from "@/components/ui/button";
import type { GeoLayer } from "@/types/gis";

const STATUS_COLORS: Record<string, string> = {
  "אישור/תוקף": "bg-green-500/20 text-green-700",
  "הפקדה": "bg-blue-500/20 text-blue-700",
  "בבדיקה תכנונית": "bg-yellow-500/20 text-yellow-700",
  "נדחתה": "bg-red-500/20 text-red-700",
};

// MMG geojson files
const mmgModules = import.meta.glob<string>('/data/mmg/**/*.geojson', {
  query: '?raw',
  import: 'default',
});

// MMG index
const mmgIndexModule = import.meta.glob<string>('/data/mmg/mmg_index.json', {
  query: '?raw',
  import: 'default',
});

const LAYER_COLORS: Record<string, string> = {
  MVT_GVUL: "#e74c3c",
  MVT_PLAN: "#3498db",
  MVT_POL: "#2ecc71",
  MVT_ARC: "#f39c12",
  MVT_LABEL: "#9b59b6",
  MVT_SYMBOL: "#1abc9c",
};

interface PlansPanelProps {
  onLayerAdd?: (layer: GeoLayer) => void;
}

export default function PlansPanel({ onLayerAdd }: PlansPanelProps) {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [mmgIndex, setMmgIndex] = useState<Record<string, any[]>>({});
  const [docsIndex, setDocsIndex] = useState<any>(null);
  const [loadingLayer, setLoadingLayer] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      loadPlans(),
      Object.values(mmgIndexModule)[0]?.(),
      loadDocsIndex(),
    ]).then(([plansData, mmgRaw, docs]) => {
      setPlans(extractPlans(plansData));
      if (mmgRaw) setMmgIndex(JSON.parse(mmgRaw));
      setDocsIndex(docs);
      setLoading(false);
    });
  }, []);

  const statuses = useMemo(() => {
    const set = new Set(plans.map((p) => p.status).filter(Boolean));
    return Array.from(set).sort();
  }, [plans]);

  const filtered = plans.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.planName.toLowerCase().includes(q) || p.title.toLowerCase().includes(q);
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const loadPlanLayer = async (planId: string, layerFile: string, layerName: string) => {
    if (!onLayerAdd) return;
    const key = Object.keys(mmgModules).find((k) => k.includes(`${planId}/${layerFile}`));
    if (!key) return;

    setLoadingLayer(`${planId}-${layerFile}`);
    try {
      const raw = await mmgModules[key]();
      const data = JSON.parse(raw);
      const geoData = data.type === "FeatureCollection" ? data : {
        type: "FeatureCollection",
        features: [data.type === "Feature" ? data : { type: "Feature", geometry: data, properties: {} }],
      };
      const baseName = layerFile.replace(".geojson", "");
      onLayerAdd({
        id: `mmg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `${planId} - ${layerName}`,
        type: "geojson",
        visible: true,
        opacity: 0.8,
        color: LAYER_COLORS[baseName] || "#e74c3c",
        category: "תוכניות מתאר (MMG)",
        data: geoData,
      });
    } catch (err) {
      console.error("Failed to load MMG layer:", err);
    }
    setLoadingLayer(null);
  };

  const loadAllPlanLayers = async (planId: string) => {
    const layers = mmgIndex[planId];
    if (!layers) return;
    for (const l of layers) {
      await loadPlanLayer(planId, l.file, l.name_heb || l.name);
    }
  };

  const getPlanDocs = (planId: string) => {
    if (!docsIndex?.plan_statistics?.[planId]) return null;
    return docsIndex.plan_statistics[planId];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs mr-2">טוען תוכניות...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex items-center gap-2 px-1">
        <Building2 className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold">תוכניות ({plans.length})</span>
      </div>

      <input
        type="text"
        placeholder="חיפוש תוכנית..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">כל הסטטוסים</option>
        {statuses.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-0.5 pr-1">
          {filtered.map((plan) => {
            const isExpanded = expandedPlan === plan.planName;
            const mmgLayers = mmgIndex[plan.planName] || [];
            const planDocs = getPlanDocs(plan.planName);

            return (
              <div key={plan.planName} className="border border-border/40 rounded-md">
                <button
                  onClick={() => setExpandedPlan(isExpanded ? null : plan.planName)}
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-accent/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronLeft className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 text-right truncate font-medium">{plan.planName}</span>
                  {mmgLayers.length > 0 && <Map className="h-3 w-3 text-primary shrink-0" />}
                  {plan.status && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[plan.status] || "bg-muted text-muted-foreground"}`}>
                      {plan.status}
                    </span>
                  )}
                </button>

                {isExpanded && (
                  <div className="px-2 pb-2 space-y-1.5 text-[11px]">
                    {plan.title && <p className="text-muted-foreground">{plan.title}</p>}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                      {plan.category && <Detail label="קטגוריה" value={plan.category} />}
                      {plan.areaDunam && <Detail label="שטח" value={plan.areaDunam} />}
                      {plan.settlement && <Detail label="יישוב" value={plan.settlement} />}
                      {plan.initiator && <Detail label="יזם" value={plan.initiator} />}
                      {plan.planner && <Detail label="מתכנן" value={plan.planner} />}
                      {plan.committee && <Detail label="ועדה" value={plan.committee} />}
                    </div>

                    {plan.areas.length > 0 && (
                      <div className="mt-1">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">ייעודי קרקע:</p>
                        <div className="space-y-0.5">
                          {plan.areas.slice(0, 8).map((a, i) => (
                            <div key={i} className="flex justify-between text-[10px]">
                              <span>{a.yeud}</span>
                              <span className="text-muted-foreground">{a.shetach_dunam?.toFixed(2)} דונם</span>
                            </div>
                          ))}
                          {plan.areas.length > 8 && (
                            <p className="text-[9px] text-muted-foreground">+{plan.areas.length - 8} נוספים</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* MMG layers */}
                    {mmgLayers.length > 0 && (
                      <div className="border-t border-border/30 pt-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-semibold text-muted-foreground">שכבות מפה ({mmgLayers.length}):</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-5 text-[9px] px-2"
                            onClick={() => loadAllPlanLayers(plan.planName)}
                          >
                            <Map className="h-2.5 w-2.5 mr-1" />
                            טען הכל
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {mmgLayers.map((l: any) => (
                            <button
                              key={l.file}
                              onClick={() => loadPlanLayer(plan.planName, l.file, l.name_heb || l.name)}
                              disabled={loadingLayer === `${plan.planName}-${l.file}`}
                              className="text-[9px] bg-primary/10 text-primary hover:bg-primary/20 px-1.5 py-0.5 rounded transition-colors disabled:opacity-50"
                            >
                              {loadingLayer === `${plan.planName}-${l.file}` ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin inline" />
                              ) : (
                                l.name_heb || l.name
                              )}
                              {l.features > 0 && <span className="text-muted-foreground"> ({l.features})</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Documents */}
                    {planDocs && (
                      <div className="border-t border-border/30 pt-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                          <FileText className="h-3 w-3 inline mr-1" />
                          מסמכים ({planDocs.metadata_docs})
                        </p>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
                          {Object.entries(planDocs.sources || {}).map(([src, count]: [string, any]) => (
                            <div key={src} className="flex justify-between">
                              <span className="text-muted-foreground">{src}</span>
                              <span>{count}</span>
                            </div>
                          ))}
                        </div>
                        {planDocs.files_on_disk > 0 && (
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {planDocs.files_on_disk} קבצים בדיסק
                          </p>
                        )}
                      </div>
                    )}

                    {plan.url && (
                      <a
                        href={plan.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-[10px] mt-1"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        צפה בתבע״ן
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">לא נמצאו תוכניות</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span>{value}</span>
    </div>
  );
}
