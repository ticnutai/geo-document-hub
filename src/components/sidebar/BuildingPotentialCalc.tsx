import { useState, useMemo } from "react";
import { Calculator, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MigrashSummary } from "@/data/plans-data";
import type { BuildingRightsPlan } from "@/data/building-rights-data";

interface BuildingPotentialCalcProps {
  migrashim: MigrashSummary[];
  buildingRights: Record<string, BuildingRightsPlan>;
}

export default function BuildingPotentialCalc({ migrashim, buildingRights }: BuildingPotentialCalcProps) {
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedMigrash, setSelectedMigrash] = useState("");

  const planNames = useMemo(() => Object.keys(buildingRights).sort(), [buildingRights]);

  const filteredMigrashim = useMemo(() => {
    if (!selectedPlan) return [];
    return migrashim.filter((m) => m.plan === selectedPlan);
  }, [migrashim, selectedPlan]);

  const calculation = useMemo(() => {
    if (!selectedPlan) return null;
    const plan = buildingRights[selectedPlan];
    if (!plan) return null;

    const parcel = selectedMigrash
      ? migrashim.find((m) => m.migrash === selectedMigrash && m.plan === selectedPlan)
      : null;

    const areaDunam = parcel?.shetachDunam || plan.area_dunam || 0;
    const areaSqm = areaDunam * 1000;

    // Extract quantities
    let maxFloors = 0;
    let residentialUnits = 0;
    let residentialSqm = 0;
    let commercialSqm = 0;
    let publicSqm = 0;

    for (const q of plan.quantities || []) {
      const val = parseFloat(q.IMPLEMENTATION || q.AUTHORISED_QUANTITY || "0") || 0;
      const desc = q.QUANTITY_DESC || "";

      if (desc.includes("קומות")) maxFloors = val;
      if (desc.includes('יח"ד') || desc.includes("יח\\\"ד")) residentialUnits = val;
      if (desc.includes('מגורים') && (desc.includes('מ"ר') || desc.includes("מ\\\"ר"))) residentialSqm = val;
      if (desc.includes('מסחר')) commercialSqm = val;
      if (desc.includes('ציבור')) publicSqm = val;
    }

    // Estimated calculations
    const totalBuildingSqm = residentialSqm + commercialSqm + publicSqm;
    const buildingCoverage = areaSqm > 0 ? ((totalBuildingSqm / (maxFloors || 4)) / areaSqm * 100) : 0;
    const avgUnitSize = residentialUnits > 0 ? Math.round(residentialSqm / residentialUnits) : 0;
    const estimatedParking = Math.ceil(residentialUnits * 1.5 + (commercialSqm / 25));
    const estimatedGreenArea = areaSqm * 0.2; // ~20% open space

    return {
      areaDunam,
      areaSqm,
      maxFloors,
      residentialUnits,
      residentialSqm,
      commercialSqm,
      publicSqm,
      totalBuildingSqm,
      buildingCoverage: buildingCoverage.toFixed(1),
      avgUnitSize,
      estimatedParking,
      estimatedGreenArea: estimatedGreenArea.toFixed(0),
      planName: plan.plan_name,
      status: plan.status,
    };
  }, [selectedPlan, selectedMigrash, buildingRights, migrashim]);

  return (
    <div className="space-y-2 px-1">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Calculator className="h-3 w-3 text-primary" />
        מחשבון פוטנציאל בנייה
      </div>

      <select
        value={selectedPlan}
        onChange={(e) => { setSelectedPlan(e.target.value); setSelectedMigrash(""); }}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">בחר תוכנית...</option>
        {planNames.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      {selectedPlan && filteredMigrashim.length > 0 && (
        <select
          value={selectedMigrash}
          onChange={(e) => setSelectedMigrash(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">כל המגרשים (סה"כ)</option>
          {filteredMigrashim.map((m) => (
            <option key={m.migrash} value={m.migrash}>מגרש {m.migrash} — {m.yeud}</option>
          ))}
        </select>
      )}

      {calculation && (
        <div className="space-y-2">
          {/* Header info */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-2">
            <div className="text-[10px] font-bold text-primary">{calculation.planName || selectedPlan}</div>
            <div className="text-[9px] text-muted-foreground">סטטוס: {calculation.status}</div>
          </div>

          {/* Main metrics */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "שטח מגרש", value: `${calculation.areaDunam.toFixed(2)} ד'`, sub: `${calculation.areaSqm.toFixed(0)} מ"ר` },
              { label: "קומות", value: calculation.maxFloors || "—", sub: "מקסימום" },
              { label: "יח' דיור", value: calculation.residentialUnits || "—", sub: "מאושר" },
              { label: "שטח מגורים", value: `${calculation.residentialSqm.toLocaleString()}`, sub: 'מ"ר' },
              { label: "שטח מסחרי", value: `${calculation.commercialSqm.toLocaleString()}`, sub: 'מ"ר' },
              { label: "שטח ציבורי", value: `${calculation.publicSqm.toLocaleString()}`, sub: 'מ"ר' },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-border/40 bg-muted/20 p-2 text-center">
                <div className="text-sm font-bold text-foreground">{item.value}</div>
                <div className="text-[9px] text-muted-foreground">{item.label}</div>
                <div className="text-[8px] text-muted-foreground/70">{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Calculated metrics */}
          <div className="rounded-md border border-border/40 bg-muted/10 p-2 space-y-1.5">
            <div className="text-[10px] font-medium flex items-center gap-1">
              <Info className="h-3 w-3 text-primary" />
              נתונים מחושבים
            </div>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">סה"כ שטח בנייה</span>
                <span className="font-medium">{calculation.totalBuildingSqm.toLocaleString()} מ"ר</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">אחוזי כיסוי (משוערך)</span>
                <span className="font-medium">{calculation.buildingCoverage}%</span>
              </div>
              {calculation.avgUnitSize > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">גודל דירה ממוצע</span>
                  <span className="font-medium">{calculation.avgUnitSize} מ"ר</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">חניות נדרשות (משוערך)</span>
                <span className="font-medium">{calculation.estimatedParking}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">שטח ירוק (משוערך)</span>
                <span className="font-medium">{calculation.estimatedGreenArea} מ"ר</span>
              </div>
            </div>
          </div>

          <div className="text-[8px] text-muted-foreground/60 text-center">
            * הנתונים המחושבים הם הערכה בלבד ואינם מהווים חוות דעת מקצועית
          </div>
        </div>
      )}

      {!selectedPlan && (
        <div className="text-center py-8 text-[10px] text-muted-foreground">
          <Calculator className="h-6 w-6 mx-auto mb-2 opacity-30" />
          בחר תוכנית לחישוב פוטנציאל בנייה
        </div>
      )}
    </div>
  );
}
