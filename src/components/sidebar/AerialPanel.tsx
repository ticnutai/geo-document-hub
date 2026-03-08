import { useState, useEffect, useMemo } from "react";
import { Loader2, Plane } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs mr-2">טוען צילומי אוויר...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center gap-2 px-1">
        <Plane className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold">צילומי אוויר היסטוריים</span>
        <span className="text-[10px] text-muted-foreground mr-auto">{releases.length} צילומים</span>
      </div>

      {/* Year slider */}
      {years.length > 1 && (
        <div className="px-1 space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{years[0]}</span>
            <span className="font-semibold text-foreground">{selectedYear}</span>
            <span>{years[years.length - 1]}</span>
          </div>
          <Slider
            value={[years.indexOf(selectedYear!) || 0]}
            onValueChange={([v]) => setSelectedYear(years[v])}
            max={years.length - 1}
            step={1}
          />
        </div>
      )}

      {/* Active release indicator */}
      {activeReleaseId && (
        <div className="mx-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-primary font-medium">
            {releases.find((r) => r.id === activeReleaseId)?.label_he || "צילום פעיל"}
          </span>
          <button
            onClick={() => onReleaseSelect(null)}
            className="text-[9px] text-destructive hover:underline"
          >
            כבה
          </button>
        </div>
      )}

      {/* Releases for selected year */}
      <ScrollArea className="h-[calc(100vh-340px)]">
        <div className="space-y-0.5 pr-1">
          {yearReleases.map((release) => (
            <button
              key={release.id}
              onClick={() => onReleaseSelect(release.id === activeReleaseId ? null : release.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                release.id === activeReleaseId
                  ? "bg-primary/15 text-primary font-medium"
                  : "hover:bg-accent/50"
              }`}
            >
              <Plane className="h-3 w-3 shrink-0" />
              <span className="flex-1 text-right">{release.label_he}</span>
              <span className="text-[9px] text-muted-foreground">{release.date}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
