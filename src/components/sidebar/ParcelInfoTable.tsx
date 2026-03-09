import { useState, useMemo, useRef } from "react";
import { Search, Download, ChevronDown, ChevronLeft, Building2, MapPin, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MigrashSummary } from "@/data/plans-data";
import type { BuildingRightsPlan } from "@/data/building-rights-data";
import type { HelkaMappingEntry } from "@/data/building-rights-data";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ParcelInfoTableProps {
  migrashim: MigrashSummary[];
  buildingRights: Record<string, BuildingRightsPlan>;
  helkaMapping: HelkaMappingEntry[];
  onHighlightFeature?: (feature: GeoJSON.Feature | GeoJSON.Feature[], color?: string, label?: string) => void;
}

type SortKey = "migrash" | "yeud" | "shetachDunam" | "yehidotDiur" | "megurimSqm";

export default function ParcelInfoTable({ migrashim, buildingRights, helkaMapping, onHighlightFeature }: ParcelInfoTableProps) {
  const [search, setSearch] = useState("");
  const [filterYeud, setFilterYeud] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("migrash");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const yeudOptions = useMemo(() => {
    const set = new Set(migrashim.map((m) => m.yeud).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "he"));
  }, [migrashim]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return migrashim
      .filter((m) => {
        const matchSearch = !q || m.migrash.includes(q) || m.plan.toLowerCase().includes(q) || m.yeud.toLowerCase().includes(q);
        const matchYeud = !filterYeud || m.yeud === filterYeud;
        return matchSearch && matchYeud;
      })
      .sort((a, b) => {
        const va = a[sortKey] ?? 0;
        const vb = b[sortKey] ?? 0;
        if (typeof va === "string" && typeof vb === "string") {
          return sortAsc ? va.localeCompare(vb, "he") : vb.localeCompare(va, "he");
        }
        return sortAsc ? (Number(va) - Number(vb)) : (Number(vb) - Number(va));
      });
  }, [migrashim, search, filterYeud, sortKey, sortAsc]);

  const stats = useMemo(() => ({
    count: filtered.length,
    totalArea: filtered.reduce((s, m) => s + m.shetachDunam, 0),
    totalUnits: filtered.reduce((s, m) => s + (m.yehidotDiur || 0), 0),
    totalMegurim: filtered.reduce((s, m) => s + (m.megurimSqm || 0), 0),
  }), [filtered]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const exportCSV = () => {
    const header = "מגרש,תוכנית,ייעוד,שטח_דונם,יח_דיור,מגורים_מר,לא_מגורים_מר";
    const rows = filtered.map((m) =>
      `${m.migrash},${m.plan},${m.yeud},${m.shetachDunam},${m.yehidotDiur || ""},${m.megurimSqm || ""},${m.loMegurimSqm || ""}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "parcels_analysis.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getHelkaInfo = (migrash: string) => {
    return helkaMapping.filter((h) => h.migrash === migrash);
  };

  return (
    <div className="space-y-2 px-1">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-md border border-border/40 bg-muted/30 p-2 text-center">
          <div className="text-lg font-bold text-primary">{stats.count}</div>
          <div className="text-[9px] text-muted-foreground">מגרשים</div>
        </div>
        <div className="rounded-md border border-border/40 bg-muted/30 p-2 text-center">
          <div className="text-lg font-bold text-primary">{stats.totalArea.toFixed(1)}</div>
          <div className="text-[9px] text-muted-foreground">דונם סה"כ</div>
        </div>
        <div className="rounded-md border border-border/40 bg-muted/30 p-2 text-center">
          <div className="text-lg font-bold text-primary">{stats.totalUnits.toLocaleString()}</div>
          <div className="text-[9px] text-muted-foreground">יח' דיור</div>
        </div>
        <div className="rounded-md border border-border/40 bg-muted/30 p-2 text-center">
          <div className="text-lg font-bold text-primary">{stats.totalMegurim.toLocaleString()}</div>
          <div className="text-[9px] text-muted-foreground">מ"ר מגורים</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-1.5">
        <div className="flex-1 relative">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="חיפוש מגרש, תוכנית..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background pr-7 pl-2 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <Button variant="outline" size="sm" className="h-7 text-[9px] gap-1" onClick={exportCSV}>
          <Download className="h-3 w-3" />
          CSV
        </Button>
      </div>

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

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border/40">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-muted/50 border-b border-border/40">
              {[
                { key: "migrash" as SortKey, label: "מגרש" },
                { key: "yeud" as SortKey, label: "ייעוד" },
                { key: "shetachDunam" as SortKey, label: "שטח (ד')" },
                { key: "yehidotDiur" as SortKey, label: "יח\"ד" },
                { key: "megurimSqm" as SortKey, label: "מ\"ר" },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-1.5 py-1 text-right font-medium cursor-pointer hover:bg-accent/30 transition-colors whitespace-nowrap"
                >
                  {col.label}
                  {sortKey === col.key && (sortAsc ? " ▲" : " ▼")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((m) => {
              const rowKey = `${m.migrash}-${m.plan}`;
              const isExpanded = expandedRow === rowKey;
              const helkaInfo = getHelkaInfo(m.migrash);
              const br = buildingRights[m.plan];

              return (
                <>
                  <tr
                    key={rowKey}
                    onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                    className="border-b border-border/20 cursor-pointer hover:bg-accent/20 transition-colors"
                  >
                    <td className="px-1.5 py-1 font-medium">
                      <div className="flex items-center gap-1">
                        {isExpanded ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronLeft className="h-2.5 w-2.5" />}
                        {m.migrash}
                      </div>
                    </td>
                    <td className="px-1.5 py-1 truncate max-w-[80px]" title={m.yeud}>{m.yeud}</td>
                    <td className="px-1.5 py-1">{m.shetachDunam.toFixed(2)}</td>
                    <td className="px-1.5 py-1">{m.yehidotDiur || "—"}</td>
                    <td className="px-1.5 py-1">{m.megurimSqm?.toLocaleString() || "—"}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${rowKey}-detail`}>
                      <td colSpan={5} className="px-2 py-2 bg-muted/20">
                        <div className="space-y-1.5 text-[10px]">
                          <div className="font-medium text-primary">תוכנית: {m.plan}</div>
                          {m.loMegurimSqm && (
                            <div>לא מגורים: {m.loMegurimSqm.toLocaleString()} מ"ר</div>
                          )}
                          {helkaInfo.length > 0 && (
                            <div>
                              <span className="font-medium">חלקות:</span>{" "}
                              {helkaInfo.map((h) => `גוש ${h.gush} חלקה ${h.helka}`).join(", ")}
                            </div>
                          )}
                          {br && (
                            <div className="mt-1 p-1.5 rounded bg-background border border-border/30">
                              <div className="font-medium text-xs mb-1">זכויות בנייה ({m.plan})</div>
                              {br.quantities?.slice(0, 5).map((q, i) => (
                                <div key={i} className="flex justify-between">
                                  <span>{q.QUANTITY_DESC}</span>
                                  <span className="font-medium">{q.IMPLEMENTATION || q.AUTHORISED_QUANTITY} {q.UNIT_DESC}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length > 200 && (
        <div className="text-[9px] text-muted-foreground text-center">
          מוצגים 200 מתוך {filtered.length} מגרשים
        </div>
      )}
    </div>
  );
}
