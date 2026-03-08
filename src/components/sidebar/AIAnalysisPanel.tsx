import { useState, useMemo } from "react";
import { Sparkles, Loader2, Building2, DollarSign, AlertTriangle, Calculator, MapPin, Brain, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { streamPlanningAI, type AnalysisType } from "@/lib/api/planning-ai";
import type { MigrashSummary } from "@/data/plans-data";
import type { BuildingRightsPlan } from "@/data/building-rights-data";
import type { NadlanTransaction } from "@/lib/api/nadlan";
import { toast } from "sonner";

interface AIAnalysisPanelProps {
  migrashim: MigrashSummary[];
  buildingRights: Record<string, BuildingRightsPlan>;
}

type AIMode = "plan_summary" | "price_estimate" | "building_potential" | "risk_analysis";

const AI_MODES: { id: AIMode; label: string; icon: any; desc: string }[] = [
  { id: "plan_summary", label: "סיכום תוכנית", icon: FileText, desc: "ניתוח AI מקיף של תוכנית בנייה" },
  { id: "price_estimate", label: "הערכת שווי", icon: DollarSign, desc: "הערכת מחיר על בסיס עסקאות" },
  { id: "building_potential", label: "פוטנציאל בנייה", icon: Calculator, desc: "חישוב יכולת בנייה מותרת" },
  { id: "risk_analysis", label: "ניתוח סיכונים", icon: AlertTriangle, desc: "זיהוי סיכוני השקעה" },
];

export default function AIAnalysisPanel({ migrashim, buildingRights }: AIAnalysisPanelProps) {
  const [mode, setMode] = useState<AIMode>("plan_summary");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedMigrash, setSelectedMigrash] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const planNames = useMemo(() => Object.keys(buildingRights).sort(), [buildingRights]);
  const filteredPlans = planNames.filter((p) => !search || p.toLowerCase().includes(search.toLowerCase()));

  const filteredMigrashim = useMemo(() => {
    if (!selectedPlan) return migrashim.slice(0, 50);
    return migrashim.filter((m) => m.plan === selectedPlan);
  }, [migrashim, selectedPlan]);

  const runAnalysis = async () => {
    if (!selectedPlan && mode !== "price_estimate") {
      toast.error("בחר תוכנית לניתוח");
      return;
    }

    setLoading(true);
    setResult("");

    const plan = selectedPlan ? buildingRights[selectedPlan] : null;
    const parcel = selectedMigrash
      ? migrashim.find((m) => m.migrash === selectedMigrash && m.plan === selectedPlan)
      : null;

    let analysisData: any = {};

    switch (mode) {
      case "plan_summary":
        analysisData = { plan };
        break;
      case "price_estimate":
        analysisData = { parcel: parcel || { plan: selectedPlan }, transactions: [] };
        break;
      case "building_potential":
        analysisData = { parcel: parcel || { plan: selectedPlan }, rights: plan };
        break;
      case "risk_analysis":
        analysisData = { plan, parcel, transactions: [] };
        break;
    }

    try {
      await streamPlanningAI({
        type: mode,
        data: analysisData,
        onDelta: (text) => {
          setResult((prev) => prev + text);
        },
        onDone: () => {
          setLoading(false);
        },
        onError: (error) => {
          toast.error(error);
          setLoading(false);
        },
      });
    } catch (err) {
      toast.error("שגיאה בביצוע ניתוח");
      setLoading(false);
    }
  };

  const exportResult = () => {
    if (!result) return;
    const blob = new Blob(["\ufeff" + result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis_${mode}_${selectedPlan || "general"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2 px-1">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Brain className="h-3 w-3 text-primary" />
        ניתוח חכם מבוסס בינה מלאכותית
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-1">
        {AI_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setResult(""); }}
            className={`flex items-center gap-1.5 rounded-md border p-2 text-right transition-all ${
              mode === m.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/40 bg-muted/20 text-muted-foreground hover:bg-accent/30"
            }`}
          >
            <m.icon className="h-3.5 w-3.5 shrink-0" />
            <div>
              <div className="text-[10px] font-medium">{m.label}</div>
              <div className="text-[8px] opacity-70">{m.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Plan selector */}
      <div className="space-y-1">
        <label className="text-[9px] font-medium text-muted-foreground">תוכנית</label>
        <select
          value={selectedPlan}
          onChange={(e) => { setSelectedPlan(e.target.value); setSelectedMigrash(""); }}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">בחר תוכנית...</option>
          {filteredPlans.map((p) => (
            <option key={p} value={p}>{p} — {buildingRights[p]?.plan_name || ""}</option>
          ))}
        </select>
      </div>

      {/* Migrash selector (optional) */}
      {selectedPlan && filteredMigrashim.length > 0 && (
        <div className="space-y-1">
          <label className="text-[9px] font-medium text-muted-foreground">מגרש (אופציונלי)</label>
          <select
            value={selectedMigrash}
            onChange={(e) => setSelectedMigrash(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">כל המגרשים</option>
            {filteredMigrashim.map((m) => (
              <option key={m.migrash} value={m.migrash}>
                מגרש {m.migrash} — {m.yeud} ({m.shetachDunam} ד')
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Run button */}
      <Button
        onClick={runAnalysis}
        disabled={loading}
        className="w-full h-8 text-xs gap-1.5"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {loading ? "מנתח..." : "הפעל ניתוח AI"}
      </Button>

      {/* Result */}
      {result && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-medium text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              תוצאת ניתוח
            </span>
            <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-1 px-1.5" onClick={exportResult}>
              <Download className="h-2.5 w-2.5" />
              ייצוא
            </Button>
          </div>
          <div className="rounded-md border border-border/40 bg-muted/10 p-3 text-[11px] leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
            {result}
            {loading && <span className="inline-block w-1.5 h-3.5 bg-primary/60 animate-pulse mr-0.5" />}
          </div>
        </div>
      )}
    </div>
  );
}
