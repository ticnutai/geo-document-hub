import { useState, useMemo } from "react";
import { ArrowUpDown, Check, X } from "lucide-react";
import type { BuildingRightsPlan, InstructionsPlan } from "@/data/building-rights-data";

interface PlanComparisonViewProps {
  buildingRights: Record<string, BuildingRightsPlan>;
  instructions: Record<string, InstructionsPlan>;
}

export default function PlanComparisonView({ buildingRights, instructions }: PlanComparisonViewProps) {
  const planNames = useMemo(() => Object.keys(buildingRights).sort(), [buildingRights]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const filteredPlans = planNames.filter((p) =>
    !search || p.toLowerCase().includes(search.toLowerCase()) ||
    (buildingRights[p]?.plan_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const togglePlan = (plan: string) => {
    setSelectedPlans((prev) =>
      prev.includes(plan) ? prev.filter((p) => p !== plan) : prev.length < 4 ? [...prev, plan] : prev
    );
  };

  const getQuantityValue = (plan: BuildingRightsPlan, desc: string) => {
    const q = plan.quantities?.find((q) => q.QUANTITY_DESC?.includes(desc));
    return q ? (q.IMPLEMENTATION || q.AUTHORISED_QUANTITY || "—") : "—";
  };

  const comparisonRows = [
    { label: 'שטח (דונם)', getValue: (p: BuildingRightsPlan) => p.area_dunam?.toFixed(2) || "—" },
    { label: 'סטטוס', getValue: (p: BuildingRightsPlan) => p.status || "—" },
    { label: 'יח"ד מגורים', getValue: (p: BuildingRightsPlan) => getQuantityValue(p, 'יח"ד') || getQuantityValue(p, "יח\\\"ד") },
    { label: 'מ"ר מגורים', getValue: (p: BuildingRightsPlan) => getQuantityValue(p, 'מגורים (מ"ר)') || getQuantityValue(p, "מגורים (מ\\\"ר)") },
    { label: 'מ"ר מסחרי', getValue: (p: BuildingRightsPlan) => getQuantityValue(p, 'מסחר') },
    { label: 'קומות', getValue: (p: BuildingRightsPlan) => getQuantityValue(p, 'קומות') },
    { label: 'תעסוקה', getValue: (p: BuildingRightsPlan) => getQuantityValue(p, 'תעסוקה') },
  ];

  return (
    <div className="space-y-2 px-1">
      <div className="text-[10px] text-muted-foreground">
        בחר עד 4 תוכניות להשוואה
      </div>

      <input
        type="text"
        placeholder="חיפוש תוכנית..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* Plan selector */}
      <div className="max-h-32 overflow-y-auto rounded-md border border-border/40 bg-muted/20">
        {filteredPlans.slice(0, 50).map((plan) => {
          const selected = selectedPlans.includes(plan);
          return (
            <button
              key={plan}
              onClick={() => togglePlan(plan)}
              className={`flex w-full items-center gap-1.5 px-2 py-1 text-[10px] hover:bg-accent/30 transition-colors ${
                selected ? "bg-primary/10 text-primary font-medium" : ""
              }`}
            >
              <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${
                selected ? "bg-primary border-primary" : "border-border"
              }`}>
                {selected && <Check className="h-2 w-2 text-primary-foreground" />}
              </div>
              <span className="truncate">{plan}</span>
            </button>
          );
        })}
      </div>

      {selectedPlans.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {selectedPlans.map((p) => (
            <span key={p} className="inline-flex items-center gap-0.5 text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {p}
              <button onClick={() => togglePlan(p)} className="hover:text-destructive">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Comparison table */}
      {selectedPlans.length >= 2 && (
        <div className="overflow-x-auto rounded-md border border-border/40">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border/40">
                <th className="px-1.5 py-1 text-right font-medium">פרמטר</th>
                {selectedPlans.map((p) => (
                  <th key={p} className="px-1.5 py-1 text-right font-medium truncate max-w-[60px]" title={p}>
                    {p.split("-").pop() || p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label} className="border-b border-border/20">
                  <td className="px-1.5 py-1 font-medium whitespace-nowrap">{row.label}</td>
                  {selectedPlans.map((p) => (
                    <td key={p} className="px-1.5 py-1">
                      {buildingRights[p] ? row.getValue(buildingRights[p]) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPlans.length < 2 && selectedPlans.length > 0 && (
        <div className="text-[10px] text-muted-foreground text-center py-4">
          בחר עוד לפחות תוכנית אחת להשוואה
        </div>
      )}

      {selectedPlans.length === 0 && (
        <div className="text-[10px] text-muted-foreground text-center py-8">
          <ArrowUpDown className="h-6 w-6 mx-auto mb-2 opacity-30" />
          בחר תוכניות מהרשימה למעלה
        </div>
      )}
    </div>
  );
}
