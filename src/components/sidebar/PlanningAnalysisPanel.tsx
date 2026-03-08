import { useState, useEffect, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, DollarSign, BarChart3, Clock, Search, Building2, ArrowUpDown, ChevronDown, ChevronLeft } from "lucide-react";
import { loadMigrashim, extractMigrashim, type MigrashSummary } from "@/data/plans-data";
import { loadBuildingRights, loadInstructionsSummary, type BuildingRightsPlan, type InstructionsPlan } from "@/data/building-rights-data";
import { loadHelkaMapping, type HelkaMappingEntry } from "@/data/building-rights-data";
import { fetchNadlanTransactions, type NadlanTransaction } from "@/lib/api/nadlan";
import { toast } from "sonner";
import ParcelInfoTable from "./ParcelInfoTable";
import PlanComparisonView from "./PlanComparisonView";
import PlanTimeline from "./PlanTimeline";
import TransactionsView from "./TransactionsView";

type AnalysisTab = "parcels" | "compare" | "timeline" | "transactions";

interface PlanningAnalysisPanelProps {
  onHighlightFeature?: (feature: GeoJSON.Feature | GeoJSON.Feature[], color?: string, label?: string) => void;
}

export default function PlanningAnalysisPanel({ onHighlightFeature }: PlanningAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>("parcels");
  const [loading, setLoading] = useState(true);
  const [migrashim, setMigrashim] = useState<MigrashSummary[]>([]);
  const [buildingRights, setBuildingRights] = useState<Record<string, BuildingRightsPlan>>({});
  const [instructions, setInstructions] = useState<Record<string, InstructionsPlan>>({});
  const [helkaMapping, setHelkaMapping] = useState<HelkaMappingEntry[]>([]);

  useEffect(() => {
    Promise.all([
      loadMigrashim(),
      loadBuildingRights(),
      loadInstructionsSummary(),
      loadHelkaMapping(),
    ]).then(([migData, br, instr, helka]) => {
      setMigrashim(extractMigrashim(migData));
      setBuildingRights(br);
      setInstructions(instr);
      setHelkaMapping(helka.mapping || []);
      setLoading(false);
    });
  }, []);

  const tabs: { id: AnalysisTab; label: string; icon: any }[] = [
    { id: "parcels", label: "מגרשים", icon: Building2 },
    { id: "compare", label: "השוואה", icon: ArrowUpDown },
    { id: "timeline", label: "ציר זמן", icon: Clock },
    { id: "transactions", label: "עסקאות", icon: DollarSign },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs mr-2">טוען נתוני ניתוח...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex items-center gap-2 px-1">
        <BarChart3 className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold">ניתוח תכנוני מתקדם</span>
      </div>

      <div className="flex gap-0.5 bg-muted/50 rounded-md p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 rounded px-1.5 py-1.5 text-[9px] font-medium transition-all ${
              activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        {activeTab === "parcels" && (
          <ParcelInfoTable
            migrashim={migrashim}
            buildingRights={buildingRights}
            helkaMapping={helkaMapping}
            onHighlightFeature={onHighlightFeature}
          />
        )}
        {activeTab === "compare" && (
          <PlanComparisonView
            buildingRights={buildingRights}
            instructions={instructions}
          />
        )}
        {activeTab === "timeline" && (
          <PlanTimeline buildingRights={buildingRights} />
        )}
        {activeTab === "transactions" && (
          <TransactionsView />
        )}
      </ScrollArea>
    </div>
  );
}
