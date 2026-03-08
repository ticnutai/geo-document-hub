import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";
import type { MigrashSummary } from "@/data/plans-data";
import type { BuildingRightsPlan } from "@/data/building-rights-data";

interface AreaStatsChartsProps {
  migrashim: MigrashSummary[];
  buildingRights: Record<string, BuildingRightsPlan>;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(221, 83%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(271, 81%, 56%)",
  "hsl(192, 91%, 36%)",
  "hsl(340, 65%, 47%)",
];

export default function AreaStatsCharts({ migrashim, buildingRights }: AreaStatsChartsProps) {
  // Land use distribution
  const landUseData = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of migrashim) {
      const yeud = m.yeud || "אחר";
      map.set(yeud, (map.get(yeud) || 0) + m.shetachDunam);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: name.length > 15 ? name.slice(0, 15) + "..." : name, fullName: name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [migrashim]);

  // Plans by status
  const statusData = useMemo(() => {
    const map = new Map<string, number>();
    for (const plan of Object.values(buildingRights)) {
      const status = plan.status || "לא ידוע";
      map.set(status, (map.get(status) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [buildingRights]);

  // Top plans by area
  const topPlansData = useMemo(() => {
    return Object.entries(buildingRights)
      .map(([key, plan]) => ({
        name: key.split("-").pop() || key,
        fullName: plan.plan_name || key,
        area: plan.area_dunam || 0,
      }))
      .filter((p) => p.area > 0)
      .sort((a, b) => b.area - a.area)
      .slice(0, 10);
  }, [buildingRights]);

  // Housing units by plan
  const unitsData = useMemo(() => {
    return Object.entries(buildingRights)
      .map(([key, plan]) => {
        let units = 0;
        for (const q of plan.quantities || []) {
          if (q.QUANTITY_DESC?.includes('יח"ד') || q.QUANTITY_DESC?.includes("יח\\\"ד")) {
            units += parseFloat(q.IMPLEMENTATION || q.AUTHORISED_QUANTITY || "0") || 0;
          }
        }
        return { name: key.split("-").pop() || key, fullName: plan.plan_name || key, units };
      })
      .filter((p) => p.units > 0)
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);
  }, [buildingRights]);

  return (
    <div className="space-y-3 px-1">
      {/* Land use pie */}
      <div className="rounded-md border border-border/40 bg-muted/10 p-2">
        <div className="text-[10px] font-medium mb-1">התפלגות ייעודי קרקע (דונם)</div>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={landUseData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={60}
              innerRadius={25}
            >
              {landUseData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val: number, name: string, entry: any) => [
                `${val} ד'`,
                entry.payload.fullName,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-1 mt-1">
          {landUseData.map((d, i) => (
            <span key={d.name} className="text-[8px] flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS[i % COLORS.length] }} />
              {d.name}
            </span>
          ))}
        </div>
      </div>

      {/* Status distribution */}
      <div className="rounded-md border border-border/40 bg-muted/10 p-2">
        <div className="text-[10px] font-medium mb-1">תוכניות לפי סטטוס</div>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={statusData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis type="number" tick={{ fontSize: 8 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} width={80} />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top plans by area */}
      <div className="rounded-md border border-border/40 bg-muted/10 p-2">
        <div className="text-[10px] font-medium mb-1">תוכניות גדולות (דונם)</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={topPlansData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 7 }} />
            <YAxis tick={{ fontSize: 8 }} />
            <Tooltip
              formatter={(val: number, _: string, entry: any) => [`${val} ד'`, entry.payload.fullName]}
            />
            <Bar dataKey="area" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Housing units */}
      {unitsData.length > 0 && (
        <div className="rounded-md border border-border/40 bg-muted/10 p-2">
          <div className="text-[10px] font-medium mb-1">יחידות דיור לפי תוכנית</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={unitsData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 7 }} />
              <YAxis tick={{ fontSize: 8 }} />
              <Tooltip
                formatter={(val: number, _: string, entry: any) => [`${val} יח"ד`, entry.payload.fullName]}
              />
              <Bar dataKey="units" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
