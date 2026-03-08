import { useState, useCallback } from "react";
import { useMapEvents } from "react-leaflet";
import L from "leaflet";

interface MeasureToolProps {
  active: boolean;
}

export default function MeasureTool({ active }: MeasureToolProps) {
  const [points, setPoints] = useState<L.LatLng[]>([]);

  const map = useMapEvents({
    click(e) {
      if (!active) return;
      setPoints((prev) => {
        const next = [...prev, e.latlng];
        return next;
      });
    },
  });

  const totalDistance = useCallback(() => {
    let dist = 0;
    for (let i = 1; i < points.length; i++) {
      dist += points[i - 1].distanceTo(points[i]);
    }
    return dist;
  }, [points]);

  const formatDist = (m: number) => {
    if (m > 1000) return `${(m / 1000).toFixed(2)} ק״מ`;
    return `${m.toFixed(1)} מ׳`;
  };

  // Draw polyline
  if (active && points.length > 1) {
    const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);
    // Use leaflet directly for the polyline
    const line = L.polyline(latlngs, { color: "hsl(210, 80%, 45%)", weight: 3, dashArray: "8, 4" });
    line.addTo(map);
    // Clean on next render
    setTimeout(() => map.removeLayer(line), 100);
  }

  if (!active || points.length === 0) return null;

  return (
    <div
      className="absolute bottom-10 left-2 z-[1000] rounded-md bg-background/95 backdrop-blur-sm border border-border shadow-md px-3 py-2"
      dir="rtl"
    >
      <div className="text-[11px] font-medium">
        מרחק: <span className="text-primary font-bold">{formatDist(totalDistance())}</span>
      </div>
      <div className="text-[9px] text-muted-foreground">{points.length} נקודות</div>
      <button
        onClick={() => setPoints([])}
        className="text-[9px] text-destructive hover:underline mt-0.5"
      >
        נקה מדידה
      </button>
    </div>
  );
}
