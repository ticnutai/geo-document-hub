import { useState, useEffect, useMemo } from "react";
import { Loader2, Plane, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { loadWaybackReleases, type WaybackRelease } from "@/data/wayback-data";

interface AerialPanelProps {
  onReleaseSelect: (releaseId: string | null) => void;
  activeReleaseId: string | null;
}

export default function AerialPanel({ onReleaseSelect, activeReleaseId }: AerialPanelProps) {
  const [releases, setReleases] = useState<WaybackRelease[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWaybackReleases().then((data) => {
      setReleases(data);
      setLoading(false);
    });
  }, []);

  const years = useMemo(() => {
    const ySet = new Set(releases.map((r) => r.year));
    return Array.from(ySet).sort();
  }, [releases]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    if (years.length > 0 && !selectedYear) {
      setSelectedYear(years[years.length - 1]);
    }
  }, [years, selectedYear]);

  const yearReleases = useMemo(() => {
    if (!selectedYear) return [];
    return releases.filter((r) => r.year === selectedYear);
  }, [releases, selectedYear]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 animate-fade-in">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">טוען צילומי אוויר...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in" dir="rtl">
      <div className="flex items-center gap-2 px-1">
        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
          <Plane className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1">
          <span className="text-xs font-semibold">צילומי אוויר היסטוריים</span>
          <p className="text-[9px] text-muted-foreground">{releases.length} צילומים זמינים</p>
        </div>
      </div>

      {/* Active release banner */}
      {activeReleaseId && (
        <div className="mx-1 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 flex items-center justify-between animate-scale-in">
          <div>
            <span className="text-[10px] text-primary font-semibold block">
              🛩️ {releases.find((r) => r.id === activeReleaseId)?.label_he || "צילום פעיל"}
            </span>
            <span className="text-[9px] text-muted-foreground">
              {releases.find((r) => r.id === activeReleaseId)?.date}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={() => onReleaseSelect(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Year slider */}
      {years.length > 1 && (
        <div className="px-1 space-y-2">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">{years[0]}</span>
            <span className="font-bold text-primary text-sm">{selectedYear}</span>
            <span className="text-muted-foreground">{years[years.length - 1]}</span>
          </div>
          <Slider
            value={[years.indexOf(selectedYear!) || 0]}
            onValueChange={([v]) => setSelectedYear(years[v])}
            max={years.length - 1}
            step={1}
          />
        </div>
      )}

      {/* Releases grid */}
      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-1 pr-1">
          {yearReleases.map((release) => {
            const isActive = release.id === activeReleaseId;
            return (
              <button
                key={release.id}
                onClick={() => onReleaseSelect(isActive ? null : release.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-accent/50"
                }`}
              >
                <Plane className={`h-3.5 w-3.5 shrink-0 ${isActive ? "" : "text-muted-foreground"}`} />
                <span className="flex-1 text-right font-medium">{release.label_he}</span>
                <span className={`text-[9px] ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {release.date}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
