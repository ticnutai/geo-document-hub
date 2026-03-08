import { useState, useMemo } from "react";
import { Search, Loader2, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchNadlanTransactions, type NadlanTransaction } from "@/lib/api/nadlan";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function TransactionsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [gush, setGush] = useState("");
  const [helka, setHelka] = useState("");
  const [transactions, setTransactions] = useState<NadlanTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  const handleSearch = async () => {
    if (!searchQuery && !gush) {
      toast.error("יש להזין שכונה/כתובת או גוש");
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetchNadlanTransactions({
        query: searchQuery || undefined,
        gush: gush || undefined,
        helka: helka || undefined,
      });

      if (res.success && res.transactions) {
        setTransactions(res.transactions);
        setTotalResults(res.totalResults || res.transactions.length);
        if (res.transactions.length === 0) {
          toast.info("לא נמצאו עסקאות");
        }
      } else {
        toast.error(res.error || "שגיאה בחיפוש עסקאות");
        setTransactions([]);
      }
    } catch (err) {
      toast.error("שגיאה בחיבור לשרת");
      setTransactions([]);
    }
    setLoading(false);
  };

  // Price trend data
  const trendData = useMemo(() => {
    if (transactions.length === 0) return [];
    const byMonth = new Map<string, { sum: number; count: number }>();
    for (const t of transactions) {
      if (!t.dealDate || !t.pricePerSqm) continue;
      const date = new Date(t.dealDate);
      if (isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const entry = byMonth.get(key) || { sum: 0, count: 0 };
      entry.sum += t.pricePerSqm;
      entry.count++;
      byMonth.set(key, entry);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { sum, count }]) => ({
        month,
        avgPrice: Math.round(sum / count),
      }));
  }, [transactions]);

  const stats = useMemo(() => {
    if (transactions.length === 0) return null;
    const prices = transactions.filter((t) => t.dealAmount > 0).map((t) => t.dealAmount);
    const sqmPrices = transactions.filter((t) => t.pricePerSqm && t.pricePerSqm > 0).map((t) => t.pricePerSqm!);
    return {
      count: transactions.length,
      avgPrice: prices.length ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : 0,
      medianPrice: prices.length ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : 0,
      avgPricePerSqm: sqmPrices.length ? Math.round(sqmPrices.reduce((s, p) => s + p, 0) / sqmPrices.length) : 0,
    };
  }, [transactions]);

  const formatPrice = (n: number) => {
    if (n >= 1_000_000) return `₪${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₪${(n / 1_000).toFixed(0)}K`;
    return `₪${n}`;
  };

  return (
    <div className="space-y-2 px-1">
      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
        <DollarSign className="h-3 w-3" />
        חיפוש עסקאות מרשות המיסים (נדל"ן)
      </div>

      {/* Search by address */}
      <input
        type="text"
        placeholder="שכונה, רחוב או עיר..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* Search by gush/helka */}
      <div className="flex gap-1.5">
        <input
          type="text"
          placeholder="גוש"
          value={gush}
          onChange={(e) => setGush(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          type="text"
          placeholder="חלקה"
          value={helka}
          onChange={(e) => setHelka(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <Button
        onClick={handleSearch}
        disabled={loading}
        className="w-full h-7 text-xs gap-1.5"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
        חפש עסקאות
      </Button>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-md border border-border/40 bg-muted/30 p-2 text-center">
            <div className="text-sm font-bold text-primary">{stats.count}</div>
            <div className="text-[9px] text-muted-foreground">עסקאות</div>
          </div>
          <div className="rounded-md border border-border/40 bg-muted/30 p-2 text-center">
            <div className="text-sm font-bold text-primary">{formatPrice(stats.avgPrice)}</div>
            <div className="text-[9px] text-muted-foreground">ממוצע</div>
          </div>
          <div className="rounded-md border border-border/40 bg-muted/30 p-2 text-center">
            <div className="text-sm font-bold text-primary">{formatPrice(stats.medianPrice)}</div>
            <div className="text-[9px] text-muted-foreground">חציון</div>
          </div>
          <div className="rounded-md border border-border/40 bg-muted/30 p-2 text-center">
            <div className="text-sm font-bold text-primary">{formatPrice(stats.avgPricePerSqm)}</div>
            <div className="text-[9px] text-muted-foreground">למ"ר</div>
          </div>
        </div>
      )}

      {/* Price trend chart */}
      {trendData.length > 1 && (
        <div className="rounded-md border border-border/40 bg-muted/10 p-2">
          <div className="text-[10px] font-medium mb-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-primary" />
            מגמת מחירים למ"ר
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 8 }} />
              <YAxis tick={{ fontSize: 8 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(val: number) => [`₪${val.toLocaleString()}`, "ממוצע למ\"ר"]}
                labelFormatter={(label: string) => `חודש: ${label}`}
              />
              <Area type="monotone" dataKey="avgPrice" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transactions table */}
      {transactions.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-border/40">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border/40">
                <th className="px-1.5 py-1 text-right font-medium">תאריך</th>
                <th className="px-1.5 py-1 text-right font-medium">מחיר</th>
                <th className="px-1.5 py-1 text-right font-medium">שטח</th>
                <th className="px-1.5 py-1 text-right font-medium">חד'</th>
                <th className="px-1.5 py-1 text-right font-medium">למ"ר</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 50).map((t, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-accent/20">
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    {t.dealDate ? new Date(t.dealDate).toLocaleDateString("he-IL") : "—"}
                  </td>
                  <td className="px-1.5 py-1 font-medium">{t.dealAmount ? formatPrice(t.dealAmount) : "—"}</td>
                  <td className="px-1.5 py-1">{t.area || "—"}</td>
                  <td className="px-1.5 py-1">{t.rooms || "—"}</td>
                  <td className="px-1.5 py-1">{t.pricePerSqm ? formatPrice(t.pricePerSqm) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length > 50 && (
            <div className="text-[9px] text-muted-foreground text-center py-1">
              מוצגות 50 מתוך {totalResults} עסקאות
            </div>
          )}
        </div>
      )}

      {searched && !loading && transactions.length === 0 && (
        <div className="text-center py-6 text-[10px] text-muted-foreground">
          <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-30" />
          לא נמצאו עסקאות עבור החיפוש
        </div>
      )}

      {!searched && (
        <div className="text-center py-6 text-[10px] text-muted-foreground">
          <DollarSign className="h-6 w-6 mx-auto mb-2 opacity-30" />
          חפש לפי כתובת או גוש/חלקה לצפייה בעסקאות אחרונות
        </div>
      )}
    </div>
  );
}
