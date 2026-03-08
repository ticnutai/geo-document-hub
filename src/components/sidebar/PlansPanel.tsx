import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ChevronDown, ChevronLeft, ExternalLink, Building2 } from "lucide-react";
import { loadPlans, extractPlans, type PlanSummary } from "@/data/plans-data";

const STATUS_COLORS: Record<string, string> = {
  "אישור/תוקף": "bg-green-500/20 text-green-700",
  "הפקדה": "bg-blue-500/20 text-blue-700",
  "בבדיקה תכנונית": "bg-yellow-500/20 text-yellow-700",
  "נדחתה": "bg-red-500/20 text-red-700",
};

export default function PlansPanel() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPlans().then((data) => {
      setPlans(extractPlans(data));
      setLoading(false);
    });
  }, []);

  const filtered = plans.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.planName.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || p.category.includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs mr-2">טוען תוכניות...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex items-center gap-2 px-1">
        <Building2 className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold">תוכניות ({plans.length})</span>
      </div>

      <input
        type="text"
        placeholder="חיפוש תוכנית..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-0.5 pr-1">
          {filtered.map((plan) => {
            const isExpanded = expandedPlan === plan.planName;
            return (
              <div key={plan.planName} className="border border-border/40 rounded-md">
                <button
                  onClick={() => setExpandedPlan(isExpanded ? null : plan.planName)}
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-accent/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronLeft className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 text-right truncate font-medium">{plan.planName}</span>
                  {plan.status && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[plan.status] || "bg-muted text-muted-foreground"}`}>
                      {plan.status}
                    </span>
                  )}
                </button>

                {isExpanded && (
                  <div className="px-2 pb-2 space-y-1 text-[11px]">
                    {plan.title && <p className="text-muted-foreground">{plan.title}</p>}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                      {plan.category && <Detail label="קטגוריה" value={plan.category} />}
                      {plan.areaDunam && <Detail label="שטח" value={plan.areaDunam} />}
                      {plan.settlement && <Detail label="יישוב" value={plan.settlement} />}
                      {plan.initiator && <Detail label="יזם" value={plan.initiator} />}
                      {plan.planner && <Detail label="מתכנן" value={plan.planner} />}
                      {plan.committee && <Detail label="ועדה" value={plan.committee} />}
                    </div>

                    {plan.areas.length > 0 && (
                      <div className="mt-1">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">ייעודי קרקע:</p>
                        <div className="space-y-0.5">
                          {plan.areas.slice(0, 8).map((a, i) => (
                            <div key={i} className="flex justify-between text-[10px]">
                              <span>{a.yeud}</span>
                              <span className="text-muted-foreground">{a.shetach_dunam?.toFixed(2)} דונם</span>
                            </div>
                          ))}
                          {plan.areas.length > 8 && (
                            <p className="text-[9px] text-muted-foreground">+{plan.areas.length - 8} נוספים</p>
                          )}
                        </div>
                      </div>
                    )}

                    {plan.url && (
                      <a
                        href={plan.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-[10px] mt-1"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        צפה בתבע"ן
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">לא נמצאו תוכניות</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span>{value}</span>
    </div>
  );
}
