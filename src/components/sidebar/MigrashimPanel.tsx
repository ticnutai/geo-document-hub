import { useState, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Grid3X3 } from "lucide-react";
import { loadMigrashim, extractMigrashim, type MigrashSummary } from "@/data/plans-data";

export default function MigrashimPanel() {
  const [migrashim, setMigrashim] = useState<MigrashSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterYeud, setFilterYeud] = useState("");

  useEffect(() => {
    loadMigrashim().then((data) => {
      setMigrashim(extractMigrashim(data));
      setLoading(false);
    });
  }, []);

  const yeudOptions = useMemo(() => {
    const set = new Set(migrashim.map((m) => m.yeud).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "he"));
  }, [migrashim]);

  const filtered = useMemo(() => {
    return migrashim.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch = !q || m.migrash.includes(q) || m.plan.toLowerCase().includes(q) || m.yeud.toLowerCase().includes(q);
      const matchYeud = !filterYeud || m.yeud === filterYeud;
      return matchSearch && matchYeud;
    });
  }, [migrashim, search, filterYeud]);

  const stats = useMemo(() => {
    const totalArea = filtered.reduce((s, m) => s + m.shetachDunam, 0);
    const totalUnits = filtered.reduce((s, m) => s + (m.yehidotDiur || 0), 0);
    return { totalArea, totalUnits, count: filtered.length };
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs mr-2">טוען מגרשים...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex items-center gap-2 px-1">
        <Grid3X3 className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold">מגרשים ({migrashim.length})</span>
      </div>

      <input
        type="text"
        placeholder="חיפוש מגרש / תוכנית..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <select
        value={filterYeud}
        onChange={(e) => setFilterYeud(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">כל הייעודים</option>
        {yeudOptions.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <div className="grid grid-cols-3 gap-1 px-1">
        <StatBox label="מגרשים" value={stats.count.toLocaleString()} />
        <StatBox label="שטח (דונם)" value={stats.totalArea.toFixed(1)} />
        <StatBox label="יח״ד" value={stats.totalUnits.toLocaleString()} />
      </div>

      <ScrollArea className="h-[calc(100vh-360px)]">
        <div className="space-y-0.5 pr-1">
          {filtered.slice(0, 200).map((m, i) => (
            <div key={`${m.plan}-${m.migrash}-${i}`} className="border border-border/40 rounded-md px-2 py-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">מגרש {m.migrash}</span>
                <span className="text-[9px] text-muted-foreground">{m.plan}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                <span>{m.yeud}</span>
                <span>·</span>
                <span>{m.shetachDunam.toFixed(2)} דונם</span>
                {m.yehidotDiur && <><span>·</span><span>{m.yehidotDiur} יח״ד</span></>}
                {m.megurimSqm && <><span>·</span><span>{m.megurimSqm} מ״ר</span></>}
              </div>
            </div>
          ))}
          {filtered.length > 200 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              מציג 200 מתוך {filtered.length} תוצאות
            </p>
          )}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">לא נמצאו מגרשים</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/40 bg-muted/30 p-1.5 text-center">
      <p className="text-xs font-bold">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
