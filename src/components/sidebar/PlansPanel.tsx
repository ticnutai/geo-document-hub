import { useState, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ChevronDown, ChevronLeft, ExternalLink, Building2, Map, FileText, MapPin, BookOpen, Hammer, AlertTriangle } from "lucide-react";
import { loadPlans, extractPlans, loadDocsIndex, type PlanSummary } from "@/data/plans-data";
import { loadBuildingRights, loadInstructionsSummary, type BuildingRightsPlan, type InstructionsPlan } from "@/data/building-rights-data";
import { loadPlanBoundaries, findPlanBoundary } from "@/data/cadastre-data";
import { Button } from "@/components/ui/button";
import type { GeoLayer } from "@/types/gis";
import { toast } from "sonner";
import PlanDocsDialog from "@/components/documents/PlanDocsDialog";

const STATUS_COLORS: Record<string, string> = {
  "אישור/תוקף": "bg-green-500/20 text-green-700",
  "הפקדה": "bg-blue-500/20 text-blue-700",
  "בבדיקה תכנונית": "bg-yellow-500/20 text-yellow-700",
  "נדחתה": "bg-red-500/20 text-red-700",
};

const mmgModules = import.meta.glob<string>('/data/mmg/**/*.geojson', {
  query: '?raw',
  import: 'default',
});

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

type PlanTab = "info" | "rights" | "instructions" | "docs";

interface PlansPanelProps {
  onLayerAdd?: (layer: GeoLayer) => void;
  onHighlightFeature?: (feature: GeoJSON.Feature | GeoJSON.Feature[], color?: string, label?: string) => void;
}

export default function PlansPanel({ onLayerAdd, onHighlightFeature }: PlansPanelProps) {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [mmgIndex, setMmgIndex] = useState<Record<string, any[]>>({});
  const [docsIndex, setDocsIndex] = useState<any>(null);
  const [loadingLayer, setLoadingLayer] = useState<string | null>(null);
  const [planBoundaries, setPlanBoundaries] = useState<GeoJSON.FeatureCollection | null>(null);
  const [buildingRights, setBuildingRights] = useState<Record<string, BuildingRightsPlan>>({});
  const [instructions, setInstructions] = useState<Record<string, InstructionsPlan>>({});
  const [planTab, setPlanTab] = useState<PlanTab>("info");
  const [docsDialogPlan, setDocsDialogPlan] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      loadPlans(),
      Object.values(mmgIndexModule)[0]?.(),
      loadDocsIndex(),
      loadPlanBoundaries(),
      loadBuildingRights(),
      loadInstructionsSummary(),
    ]).then(([plansData, mmgRaw, docs, boundaries, br, instr]) => {
      setPlans(extractPlans(plansData));
      if (mmgRaw) setMmgIndex(JSON.parse(mmgRaw));
      setDocsIndex(docs);
      setPlanBoundaries(boundaries);
      setBuildingRights(br);
      setInstructions(instr);
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

  const handleZoomToPlan = async (planName: string) => {
    if (!onHighlightFeature) return;
    
    // Try plan boundaries first
    if (planBoundaries) {
      const feature = findPlanBoundary(planName, planBoundaries);
      if (feature) {
        onHighlightFeature(feature, "#e74c3c", planName);
        return;
      }
    }
    
    // Fallback: try loading MMG geometry (MVT_GVUL or first available layer)
    const mmgLayers = mmgIndex[planName] || [];
    const preferredOrder = ["MVT_GVUL.geojson", "MVT_POL.geojson", "MVT_PLAN.geojson", "MVT_ARC.geojson"];
    const sortedLayers = [...mmgLayers].sort((a, b) => {
      const ai = preferredOrder.indexOf(a.file);
      const bi = preferredOrder.indexOf(b.file);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    
    for (const layer of sortedLayers) {
      const key = Object.keys(mmgModules).find((k) => k.includes(`${planName}/${layer.file}`));
      if (!key) continue;
      try {
        const raw = await mmgModules[key]();
        const data = JSON.parse(raw);
        const fc = data.type === "FeatureCollection" ? data : {
          type: "FeatureCollection",
          features: [data.type === "Feature" ? data : { type: "Feature", geometry: data, properties: {} }],
        };
        if (fc.features.length > 0) {
          onHighlightFeature(fc.features, "#e74c3c", planName);
          return;
        }
      } catch (e) {
        console.warn("Failed to load MMG fallback layer", e);
      }
    }
    
    toast.info("לא נמצא גבול תוכנית במפה");
  };

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
            const hasBoundary = planBoundaries?.features.some(
              (f) => f.properties?.plan_number === plan.planName
            );
            const canZoom = hasBoundary || mmgLayers.length > 0;
            const br = buildingRights[plan.planName];
            const instr = instructions[plan.planName];

            return (
              <div key={plan.planName} className="border border-border/40 rounded-md">
                <button
                  onClick={() => { setExpandedPlan(isExpanded ? null : plan.planName); setPlanTab("info"); }}
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-accent/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronLeft className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 text-right truncate font-medium">{plan.planName}</span>
                  {hasBoundary && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleZoomToPlan(plan.planName); }}
                      className="p-0.5 rounded hover:bg-primary/20 transition-colors"
                      title="הצג במפה"
                    >
                      <MapPin className="h-3 w-3 text-primary" />
                    </button>
                  )}
                  {mmgLayers.length > 0 && <Map className="h-3 w-3 text-primary shrink-0" />}
                  {br && <Hammer className="h-3 w-3 text-amber-500 shrink-0" />}
                  {plan.status && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[plan.status] || "bg-muted text-muted-foreground"}`}>
                      {plan.status}
                    </span>
                  )}
                </button>

                {isExpanded && (
                  <div className="px-2 pb-2 space-y-1.5 text-[11px]">
                    {/* Internal plan tabs */}
                    <div className="flex gap-0.5 bg-muted/50 rounded-md p-0.5">
                      {(
                        [
                          { id: "info" as PlanTab, label: "מידע", icon: Building2 },
                          ...(br ? [{ id: "rights" as PlanTab, label: "זכויות", icon: Hammer }] : []),
                          ...(instr ? [{ id: "instructions" as PlanTab, label: "הוראות", icon: BookOpen }] : []),
                          ...(planDocs ? [{ id: "docs" as PlanTab, label: "מסמכים", icon: FileText }] : []),
                        ]
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setPlanTab(tab.id)}
                          className={`flex-1 flex items-center justify-center gap-1 rounded px-1.5 py-1 text-[9px] font-medium transition-all ${
                            planTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <tab.icon className="h-2.5 w-2.5" />
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {planTab === "info" && (
                      <>
                        {plan.title && <p className="text-muted-foreground">{plan.title}</p>}

                        {hasBoundary && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[10px] gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => handleZoomToPlan(plan.planName)}
                          >
                            <MapPin className="h-3 w-3" />
                            הצג גבול תוכנית במפה
                          </Button>
                        )}

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
                      </>
                    )}

                    {planTab === "rights" && br && (
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-1">
                          <Detail label="שם" value={br.plan_name} />
                          <Detail label="שטח" value={`${br.area_dunam} דונם`} />
                          <Detail label="סטטוס" value={br.status} />
                        </div>
                        {br.quantities?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">כמויות מאושרות:</p>
                            <div className="space-y-0.5">
                              {br.quantities.map((q, i) => (
                                <div key={i} className="flex justify-between text-[10px] bg-muted/30 rounded px-1.5 py-1">
                                  <span>{q.QUANTITY_DESC}</span>
                                  <div className="flex gap-2 text-muted-foreground">
                                    <span>{q.AUTHORISED_QUANTITY} {q.UNIT_DESC}</span>
                                    {q.AUTHORISED_QUANTITY_ADD && (
                                      <span className="text-green-600">+{q.AUTHORISED_QUANTITY_ADD}</span>
                                    )}
                                    {q.IMPLEMENTATION && (
                                      <span className="font-medium text-foreground">ביצוע: {q.IMPLEMENTATION}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {planTab === "instructions" && instr && (
                      <div className="space-y-1.5">
                        {instr.explanation?.EXPLANATION && (
                          <div className="bg-muted/30 rounded-md p-2">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">הסבר:</p>
                            <p className="text-[10px] leading-relaxed">{instr.explanation.EXPLANATION}</p>
                          </div>
                        )}
                        {instr.instructions?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">מסמכי הוראות ({instr.instructions.length}):</p>
                            <div className="space-y-0.5">
                              {instr.instructions.map((doc, i) => (
                                <div key={i} className="flex items-center gap-2 text-[10px] bg-muted/30 rounded px-1.5 py-1">
                                  <FileText className="h-3 w-3 text-primary shrink-0" />
                                  <span className="flex-1 truncate">{doc.LUT_DOC_NAME || doc.DOC_NAME}</span>
                                  <span className="text-[9px] text-muted-foreground uppercase">{(doc.FILE_TYPE || "").trim()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {planTab === "docs" && planDocs && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground">
                          {planDocs.metadata_docs} מסמכים · {planDocs.files_on_disk || 0} קבצים בדיסק
                        </p>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
                          {Object.entries(planDocs.sources || {}).map(([src, count]: [string, any]) => (
                            <div key={src} className="flex justify-between">
                              <span className="text-muted-foreground">{src}</span>
                              <span>{count}</span>
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-[10px] gap-1.5"
                          onClick={() => setDocsDialogPlan(plan.planName)}
                        >
                          <FileText className="h-3 w-3" />
                          הצג רשימת מסמכים מלאה
                        </Button>
                      </div>
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

      {docsDialogPlan && (
        <PlanDocsDialog
          planId={docsDialogPlan}
          planName={docsDialogPlan}
          open={!!docsDialogPlan}
          onOpenChange={(open) => !open && setDocsDialogPlan(null)}
        />
      )}
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
