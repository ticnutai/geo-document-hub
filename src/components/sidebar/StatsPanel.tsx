import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, BarChart3, Users, MapPin, Home, TrendingUp, Hammer, Shield, ExternalLink } from "lucide-react";
import { loadCBS, loadPlans, loadMigrashim, loadDocsIndex, extractPlans, extractMigrashim } from "@/data/plans-data";
import { loadBuildingRights, getBuildingRightsSummary, type BuildingRightsPlan } from "@/data/building-rights-data";
import { loadGovDatasets } from "@/data/gov-data";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const CHART_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

type StatsTab = "overview" | "plans" | "land" | "rights" | "gov";

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
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");
  const [brData, setBrData] = useState<Record<string, BuildingRightsPlan>>({});
  const [govDatasets, setGovDatasets] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([loadCBS(), loadPlans(), loadMigrashim(), loadDocsIndex(), loadBuildingRights(), loadGovDatasets()]).then(
      ([cbs, plansRaw, migrashimRaw, docsIdx, br, gov]) => {
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
        setBrData(br);
        setGovDatasets(gov);
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 p-1 animate-fade-in">
        <div className="grid grid-cols-2 gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (!stats) return null;

  const brSummary = getBuildingRightsSummary(brData);

  const tabs: { id: StatsTab; label: string }[] = [
    { id: "overview", label: "סקירה" },
    { id: "plans", label: "תוכניות" },
    { id: "land", label: "קרקע" },
    { id: "rights", label: "זכויות" },
    { id: "gov", label: "ממשלתי" },
  ];

  return (
    <div className="space-y-3 animate-fade-in" dir="rtl">
      <div className="flex items-center gap-2 px-1">
        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-xs font-semibold">סטטיסטיקות</span>
      </div>

      <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5 mx-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-1.5 py-1 text-[9px] font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-3 pr-1 animate-fade-in" key={activeTab}>
          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <BigStat icon={<MapPin className="h-4 w-4" />} value={stats.totalPlans} label="תוכניות" color="text-blue-500" />
                <BigStat icon={<Home className="h-4 w-4" />} value={stats.totalMigrashim.toLocaleString()} label="מגרשים" color="text-green-500" />
                <BigStat icon={<Users className="h-4 w-4" />} value={stats.population?.["סהכ"]?.toLocaleString() || "—"} label="תושבים" color="text-amber-500" />
                <BigStat icon={<TrendingUp className="h-4 w-4" />} value={stats.totalDocs.toLocaleString()} label="מסמכים" color="text-purple-500" />
                <BigStat icon={<Hammer className="h-4 w-4" />} value={brSummary.totalUnits.toLocaleString()} label="יח״ד מאושרות" color="text-orange-500" />
                <BigStat icon={<Shield className="h-4 w-4" />} value={brSummary.planCount} label="תוכניות עם זכויות" color="text-cyan-500" />
              </div>

              {stats.population && (
                <Section title="דמוגרפיה - כפר חב״ד">
                  <div className="space-y-1">
                    <DemoRow label="גיל 0-5" value={stats.population["גיל_0_5"]} total={stats.population["סהכ"]} color="bg-blue-400" />
                    <DemoRow label="גיל 6-18" value={stats.population["גיל_6_18"]} total={stats.population["סהכ"]} color="bg-green-400" />
                    <DemoRow label="גיל 19-45" value={stats.population["גיל_19_45"]} total={stats.population["סהכ"]} color="bg-amber-400" />
                    <DemoRow label="גיל 46-55" value={stats.population["גיל_46_55"]} total={stats.population["סהכ"]} color="bg-orange-400" />
                    <DemoRow label="גיל 56-64" value={stats.population["גיל_56_64"]} total={stats.population["סהכ"]} color="bg-red-400" />
                    <DemoRow label="גיל 65+" value={stats.population["גיל_65_פלוס"]} total={stats.population["סהכ"]} color="bg-purple-400" />
                  </div>
                </Section>
              )}
            </>
          )}

          {activeTab === "plans" && (
            <>
              <Section title="תוכניות לפי סטטוס">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.plansByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={60}
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

              <Section title="תוכניות לפי קטגוריה">
                <div className="h-40">
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
            </>
          )}

          {activeTab === "land" && (
            <>
              <Section title="ייעודי קרקע - שטח (דונם)">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.yeudBreakdown.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 9 }} />
                      <YAxis type="category" dataKey="yeud" tick={{ fontSize: 9 }} width={80} />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(1)} דונם`, "שטח"]} labelStyle={{ fontSize: 10 }} />
                      <Bar dataKey="area" fill="hsl(210, 80%, 45%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Section>

              <Section title="פירוט ייעודי קרקע">
                <div className="space-y-0.5">
                  {stats.yeudBreakdown.slice(0, 20).map((y) => (
                    <div key={y.yeud} className="flex justify-between text-[10px] py-0.5 hover:bg-muted/30 rounded px-1 transition-colors">
                      <span className="truncate flex-1">{y.yeud}</span>
                      <span className="text-muted-foreground mr-2">{y.count}</span>
                      <span className="font-medium w-16 text-left">{y.area.toFixed(1)} ד׳</span>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

          {activeTab === "rights" && (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <BigStat icon={<Hammer className="h-4 w-4" />} value={brSummary.planCount} label="תוכניות" color="text-amber-500" />
                <BigStat icon={<Home className="h-4 w-4" />} value={brSummary.totalUnits.toLocaleString()} label="יח״ד" color="text-green-500" />
                <BigStat icon={<TrendingUp className="h-4 w-4" />} value={`${brSummary.totalResidentialSqm.toLocaleString()}`} label="מ״ר מגורים" color="text-blue-500" />
                <BigStat icon={<MapPin className="h-4 w-4" />} value={brSummary.totalArea.toFixed(1)} label="דונם" color="text-purple-500" />
              </div>

              <Section title="תוכניות עם זכויות בנייה">
                <div className="space-y-0.5">
                  {Object.values(brData).slice(0, 30).map((plan) => (
                    <div key={plan.plan_number} className="text-[10px] bg-muted/30 rounded px-1.5 py-1 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between">
                        <span className="font-medium truncate flex-1">{plan.plan_number}</span>
                        <span className={`text-[9px] px-1 rounded ${
                          plan.status === "אישור/תוקף" ? "bg-green-500/20 text-green-700" : "bg-muted text-muted-foreground"
                        }`}>{plan.status}</span>
                      </div>
                      <p className="text-muted-foreground truncate">{plan.plan_name}</p>
                      <div className="flex gap-2 mt-0.5 text-muted-foreground">
                        {plan.area_dunam > 0 && <span>{plan.area_dunam} דונם</span>}
                        {plan.quantities?.map((q, i) => (
                          <span key={i}>{q.AUTHORISED_QUANTITY} {q.UNIT_DESC}</span>
                        )).slice(0, 3)}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

          {activeTab === "gov" && (
            <>
              <Section title="מאגרי מידע ממשלתיים">
                <div className="space-y-1.5">
                  {govDatasets.map((ds, i) => (
                    <div key={i} className="bg-muted/30 rounded-md p-2 hover:bg-muted/50 transition-colors">
                      <p className="text-[10px] font-medium">{ds.title}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{ds.notes}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">ארגון: {ds.organization}</p>
                      {ds.resources?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ds.resources.slice(0, 3).map((r: any, j: number) => (
                            <a
                              key={j}
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-[9px] text-primary hover:underline"
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                              {r.name?.slice(0, 30) || r.format}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {govDatasets.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-2">אין נתונים ממשלתיים</p>
                  )}
                </div>
              </Section>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function BigStat({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card p-2.5 text-center hover:shadow-sm transition-shadow">
      <div className={`flex items-center justify-center ${color} mb-1`}>{icon}</div>
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card p-2.5">
      <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">{title}</p>
      {children}
    </div>
  );
}

function DemoRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  if (!value || !total) return null;
  const pct = ((value / total) * 100).toFixed(1);
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className="w-14 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-left text-muted-foreground text-[9px]">{value.toLocaleString()}</span>
      <span className="w-8 text-left font-medium text-[9px]">{pct}%</span>
    </div>
  );
}
