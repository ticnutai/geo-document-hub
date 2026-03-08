import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, DollarSign, BarChart3, Clock, Building2, ArrowUpDown, Brain, Calculator, PieChart } from "lucide-react";
import { loadMigrashim, extractMigrashim, type MigrashSummary } from "@/data/plans-data";
import { loadBuildingRights, loadInstructionsSummary, type BuildingRightsPlan, type InstructionsPlan } from "@/data/building-rights-data";
import { loadHelkaMapping, type HelkaMappingEntry } from "@/data/building-rights-data";
import ParcelInfoTable from "./ParcelInfoTable";
import PlanComparisonView from "./PlanComparisonView";
import PlanTimeline from "./PlanTimeline";
import TransactionsView from "./TransactionsView";
import AIAnalysisPanel from "./AIAnalysisPanel";
import BuildingPotentialCalc from "./BuildingPotentialCalc";
import AreaStatsCharts from "./AreaStatsCharts";

type AnalysisTab = "parcels" | "compare" | "timeline" | "transactions" | "ai" | "potential" | "charts";

interface PlanningAnalysisPanelProps {
  onHighlightFeature?: (feature: GeoJSON.Feature | GeoJSON.Feature[], color?: string, label?: string) => void;
}

export default function PlanningAnalysisPanel({ onHighlightFeature }: PlanningAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>("ai");
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
    { id: "ai", label: "AI", icon: Brain },
    { id: "potential", label: "פוטנציאל", icon: Calculator },
    { id: "charts", label: "גרפים", icon: PieChart },
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

      {/* Two-row tab bar for better readability */}
      <div className="space-y-0.5">
        <div className="flex gap-0.5 bg-muted/50 rounded-md p-0.5">
          {tabs.slice(0, 4).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-0.5 rounded px-1 py-1.5 text-[9px] font-medium transition-all ${
                activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 bg-muted/50 rounded-md p-0.5">
          {tabs.slice(4).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-0.5 rounded px-1 py-1.5 text-[9px] font-medium transition-all ${
                activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        {activeTab === "ai" && (
          <AIAnalysisPanel migrashim={migrashim} buildingRights={buildingRights} />
        )}
        {activeTab === "potential" && (
          <BuildingPotentialCalc migrashim={migrashim} buildingRights={buildingRights} />
        )}
        {activeTab === "charts" && (
          <AreaStatsCharts migrashim={migrashim} buildingRights={buildingRights} />
        )}
        {activeTab === "parcels" && (
          <ParcelInfoTable
            migrashim={migrashim}
            buildingRights={buildingRights}
            helkaMapping={helkaMapping}
            onHighlightFeature={onHighlightFeature}
          />
        )}
        {activeTab === "compare" && (
          <PlanComparisonView buildingRights={buildingRights} instructions={instructions} />
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
