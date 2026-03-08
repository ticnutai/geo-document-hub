import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, BarChart3, Users, MapPin, Home } from "lucide-react";
import { loadCBS, loadPlans, loadMigrashim, loadDocsIndex, extractPlans, extractMigrashim } from "@/data/plans-data";

interface Stats {
  population: any;
  totalPlans: number;
  totalMigrashim: number;
  totalDocs: number;
  plansByStatus: Record<string, number>;
  plansByCategory: Record<string, number>;
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

        const plansByStatus: Record<string, number> = {};
        const plansByCategory: Record<string, number> = {};
        for (const p of plans) {
          const s = p.status || "לא ידוע";
          plansByStatus[s] = (plansByStatus[s] || 0) + 1;
          const c = p.category || "לא ידוע";
          plansByCategory[c] = (plansByCategory[c] || 0) + 1;
        }

        const yeudMap = new Map<string, { count: number; area: number }>();
        for (const m of migrashim) {
          const key = m.yeud || "לא ידוע";
          const existing = yeudMap.get(key) || { count: 0, area: 0 };
          existing.count++;
          existing.area += m.shetachDunam;
          yeudMap.set(key, existing);
        }
        const yeudBreakdown = Array.from(yeudMap.entries())
          .map(([yeud, { count, area }]) => ({ yeud, count, area }))
          .sort((a, b) => b.area - a.area);

        setStats({
          population: Array.isArray(cbs) ? cbs[0] : null,
          totalPlans: plans.length,
          totalMigrashim: migrashim.length,
          totalDocs: docsIdx?.total_documents_in_metadata || 0,
          plansByStatus,
          plansByCategory,
          yeudBreakdown,
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

          {/* Plans by status */}
          <Section title="תוכניות לפי סטטוס">
            <div className="space-y-0.5">
              {Object.entries(stats.plansByStatus).sort(([,a],[,b]) => b - a).map(([status, count]) => (
                <div key={status} className="flex justify-between text-[10px]">
                  <span>{status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Plans by category */}
          <Section title="תוכניות לפי קטגוריה">
            <div className="space-y-0.5">
              {Object.entries(stats.plansByCategory).sort(([,a],[,b]) => b - a).map(([cat, count]) => (
                <div key={cat} className="flex justify-between text-[10px]">
                  <span>{cat}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Land use breakdown */}
          <Section title="ייעודי קרקע (מגרשים)">
            <div className="space-y-0.5">
              {stats.yeudBreakdown.slice(0, 15).map((y) => (
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
