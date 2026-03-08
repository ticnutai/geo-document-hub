import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, BarChart3, Users, MapPin, Home } from "lucide-react";
import { loadCBS, loadPlans, loadMigrashim, loadDocsIndex, extractPlans, extractMigrashim } from "@/data/plans-data";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const CHART_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

interface Stats {
  population: any;
  totalPlans: number;
  totalMigrashim: number;
  totalDocs: number;
  plansByStatus: { name: string; value: number }[];
  plansByCategory: { name: string; value: number }[];
  yeudBreakdown: { yeud: string; count: number; area: number }[];
}

export default function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadCBS(), loadPlans(), loadMigrashim(), loadDocsIndex()]).then(
      ([cbs, plansRaw, migrashimRaw, docsIdx]) => {
        const plans = extractPlans(plansRaw);
        const migrashim = extractMigrashim(migrashimRaw);

        const statusMap: Record<string, number> = {};
        const catMap: Record<string, number> = {};
        for (const p of plans) {
          const s = p.status || "לא ידוע";
          statusMap[s] = (statusMap[s] || 0) + 1;
          const c = p.category || "לא ידוע";
          catMap[c] = (catMap[c] || 0) + 1;
        }

        const yeudMap = new Map<string, { count: number; area: number }>();
        for (const m of migrashim) {
          const key = m.yeud || "לא ידוע";
          const existing = yeudMap.get(key) || { count: 0, area: 0 };
          existing.count++;
          existing.area += m.shetachDunam;
          yeudMap.set(key, existing);
        }

        setStats({
          population: Array.isArray(cbs) ? cbs[0] : null,
          totalPlans: plans.length,
          totalMigrashim: migrashim.length,
          totalDocs: docsIdx?.total_documents_in_metadata || 0,
          plansByStatus: Object.entries(statusMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value),
          plansByCategory: Object.entries(catMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value),
          yeudBreakdown: Array.from(yeudMap.entries())
            .map(([yeud, { count, area }]) => ({ yeud, count, area }))
            .sort((a, b) => b.area - a.area),
        });
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs mr-2">טוען סטטיסטיקות...</span>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center gap-2 px-1">
        <BarChart3 className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold">סטטיסטיקות</span>
      </div>

      <ScrollArea className="h-[calc(100vh-240px)]">
        <div className="space-y-3 pr-1">
          {/* Key numbers */}
          <div className="grid grid-cols-2 gap-1.5">
            <BigStat icon={<MapPin className="h-3.5 w-3.5" />} value={stats.totalPlans} label="תוכניות" />
            <BigStat icon={<Home className="h-3.5 w-3.5" />} value={stats.totalMigrashim.toLocaleString()} label="מגרשים" />
            <BigStat icon={<Users className="h-3.5 w-3.5" />} value={stats.population?.["סהכ"]?.toLocaleString() || "—"} label="תושבים" />
            <BigStat icon={<BarChart3 className="h-3.5 w-3.5" />} value={stats.totalDocs.toLocaleString()} label="מסמכים" />
          </div>

          {/* Demographics */}
          {stats.population && (
            <Section title="דמוגרפיה - כפר חב״ד">
              <div className="space-y-0.5">
                <DemoRow label="גיל 0-5" value={stats.population["גיל_0_5"]} total={stats.population["סהכ"]} />
                <DemoRow label="גיל 6-18" value={stats.population["גיל_6_18"]} total={stats.population["סהכ"]} />
                <DemoRow label="גיל 19-45" value={stats.population["גיל_19_45"]} total={stats.population["סהכ"]} />
                <DemoRow label="גיל 46-55" value={stats.population["גיל_46_55"]} total={stats.population["סהכ"]} />
                <DemoRow label="גיל 56-64" value={stats.population["גיל_56_64"]} total={stats.population["סהכ"]} />
                <DemoRow label="גיל 65+" value={stats.population["גיל_65_פלוס"]} total={stats.population["סהכ"]} />
              </div>
            </Section>
          )}

          {/* Plans by status - Pie Chart */}
          <Section title="תוכניות לפי סטטוס">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.plansByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={55}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name.slice(0, 10)} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {stats.plansByStatus.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-0.5 mt-1">
              {stats.plansByStatus.map((s, i) => (
                <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="flex-1">{s.name}</span>
                  <span className="font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Land use - Bar Chart */}
          <Section title="ייעודי קרקע - שטח (דונם)">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.yeudBreakdown.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis
                    type="category"
                    dataKey="yeud"
                    tick={{ fontSize: 9 }}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)} דונם`, "שטח"]}
                    labelStyle={{ fontSize: 10 }}
                  />
                  <Bar dataKey="area" fill="hsl(210, 80%, 45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Plans by category */}
          <Section title="תוכניות לפי קטגוריה">
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.plansByCategory.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    outerRadius={50}
                    dataKey="value"
                  >
                    {stats.plansByCategory.slice(0, 6).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    formatter={(value) => <span className="text-[9px]">{value}</span>}
                    wrapperStyle={{ fontSize: 9 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Full yeud breakdown table */}
          <Section title="פירוט ייעודי קרקע">
            <div className="space-y-0.5">
              {stats.yeudBreakdown.slice(0, 20).map((y) => (
                <div key={y.yeud} className="flex justify-between text-[10px]">
                  <span className="truncate flex-1">{y.yeud}</span>
                  <span className="text-muted-foreground mr-2">{y.count}</span>
                  <span className="font-medium w-16 text-left">{y.area.toFixed(1)} ד׳</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
}

function BigStat({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="rounded-md border border-border/40 bg-muted/30 p-2 text-center">
      <div className="flex items-center justify-center text-primary mb-1">{icon}</div>
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border/40 rounded-md p-2">
      <p className="text-[10px] font-semibold text-muted-foreground mb-1">{title}</p>
      {children}
    </div>
  );
}

function DemoRow({ label, value, total }: { label: string; value: number; total: number }) {
  if (!value || !total) return null;
  const pct = ((value / total) * 100).toFixed(1);
  return (
    <div className="flex items-center gap-1 text-[10px]">
      <span className="w-16">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-left text-muted-foreground">{value.toLocaleString()}</span>
      <span className="w-10 text-left text-muted-foreground">{pct}%</span>
    </div>
  );
}
