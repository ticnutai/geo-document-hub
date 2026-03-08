import { useMemo } from "react";
import { Clock } from "lucide-react";
import type { BuildingRightsPlan } from "@/data/building-rights-data";

interface PlanTimelineProps {
  buildingRights: Record<string, BuildingRightsPlan>;
}

const STATUS_ORDER: Record<string, number> = {
  "נדחתה": 0,
  "בבדיקה תכנונית": 1,
  "הפקדה": 2,
  "אישור/תוקף": 3,
};

const STATUS_COLORS: Record<string, string> = {
  "אישור/תוקף": "bg-green-500",
  "הפקדה": "bg-blue-500",
  "בבדיקה תכנונית": "bg-amber-500",
  "נדחתה": "bg-red-500",
};

export default function PlanTimeline({ buildingRights }: PlanTimelineProps) {
  const timelineData = useMemo(() => {
    return Object.entries(buildingRights)
      .map(([key, plan]) => ({
        planNumber: key,
        planName: plan.plan_name || key,
        status: plan.status || "לא ידוע",
        areaDunam: plan.area_dunam || 0,
        unitsCount: plan.quantities?.reduce((sum, q) => {
          if (q.QUANTITY_DESC?.includes('יח"ד') || q.QUANTITY_DESC?.includes("יח\\\"ד")) {
            return sum + (parseFloat(q.IMPLEMENTATION || q.AUTHORISED_QUANTITY || "0") || 0);
          }
          return sum;
        }, 0) || 0,
        statusOrder: STATUS_ORDER[plan.status] ?? -1,
      }))
      .sort((a, b) => b.statusOrder - a.statusOrder);
  }, [buildingRights]);

  const statusGroups = useMemo(() => {
    const groups = new Map<string, typeof timelineData>();
    for (const item of timelineData) {
      if (!groups.has(item.status)) groups.set(item.status, []);
      groups.get(item.status)!.push(item);
    }
    return groups;
  }, [timelineData]);

  return (
    <div className="space-y-3 px-1">
      <div className="text-[10px] text-muted-foreground">
        ציר זמן תכנוני - {timelineData.length} תוכניות
      </div>

      {/* Status summary bar */}
      <div className="flex rounded-full overflow-hidden h-3">
        {Array.from(statusGroups.entries()).map(([status, items]) => {
          const pct = (items.length / timelineData.length) * 100;
          return (
            <div
              key={status}
              className={`${STATUS_COLORS[status] || "bg-muted"} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${status}: ${items.length} תוכניות`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 text-[9px]">
        {Array.from(statusGroups.entries()).map(([status, items]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status] || "bg-muted"}`} />
            <span>{status} ({items.length})</span>
          </div>
        ))}
      </div>

      {/* Timeline list */}
      <div className="relative pr-4">
        {/* Vertical line */}
        <div className="absolute right-[7px] top-0 bottom-0 w-0.5 bg-border/60" />

        {Array.from(statusGroups.entries()).map(([status, items]) => (
          <div key={status} className="mb-3">
            <div className="flex items-center gap-2 mb-1.5 relative">
              <div className={`w-3.5 h-3.5 rounded-full ${STATUS_COLORS[status] || "bg-muted"} border-2 border-background z-10 absolute right-0`} />
              <span className="text-[10px] font-bold mr-5">{status}</span>
              <span className="text-[9px] text-muted-foreground">({items.length})</span>
            </div>
            <div className="space-y-1 mr-5">
              {items.slice(0, 10).map((item) => (
                <div
                  key={item.planNumber}
                  className="rounded border border-border/30 bg-muted/20 px-2 py-1.5 text-[10px]"
                >
                  <div className="font-medium truncate">{item.planName}</div>
                  <div className="flex gap-3 text-muted-foreground">
                    <span>{item.areaDunam.toFixed(1)} ד'</span>
                    {item.unitsCount > 0 && <span>{item.unitsCount} יח"ד</span>}
                  </div>
                </div>
              ))}
              {items.length > 10 && (
                <div className="text-[9px] text-muted-foreground">ועוד {items.length - 10} תוכניות...</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
