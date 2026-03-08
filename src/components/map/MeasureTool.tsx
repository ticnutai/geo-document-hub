import { useState, useCallback, useEffect } from "react";
import { useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

interface MeasureToolProps {
  active: boolean;
}

function computeArea(points: L.LatLng[]): number {
  if (points.length < 3) return 0;
  // Use Leaflet's built-in geodesic area
  return L.GeometryUtil
    ? 0
    : Math.abs(
        points.reduce((area, p, i) => {
          const j = (i + 1) % points.length;
          return area + (p.lng * points[j].lat - points[j].lng * p.lat);
        }, 0) / 2 * 111320 * 111320 * Math.cos((points[0].lat * Math.PI) / 180)
      );
}

export default function MeasureTool({ active }: MeasureToolProps) {
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const [polyline, setPolyline] = useState<L.Polyline | null>(null);
  const [polygon, setPolygon] = useState<L.Polygon | null>(null);
  const map = useMap();

  // Clear on deactivate
  useEffect(() => {
    if (!active) {
      setPoints([]);
      if (polyline) { map.removeLayer(polyline); setPolyline(null); }
      if (polygon) { map.removeLayer(polygon); setPolygon(null); }
    }
  }, [active]);

  // Update drawn shapes
  useEffect(() => {
    if (polyline) map.removeLayer(polyline);
    if (polygon) map.removeLayer(polygon);

    if (points.length >= 2) {
      const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);
      const newLine = L.polyline(latlngs, {
        color: "hsl(210, 80%, 45%)",
        weight: 3,
        dashArray: "8, 4",
      }).addTo(map);
      setPolyline(newLine);

      if (points.length >= 3) {
        const newPoly = L.polygon(latlngs, {
          color: "hsl(210, 80%, 45%)",
          weight: 1,
          fillOpacity: 0.1,
          dashArray: "4, 4",
        }).addTo(map);
        setPolygon(newPoly);
      } else {
        setPolygon(null);
      }
    } else {
      setPolyline(null);
      setPolygon(null);
    }

    // Add markers at each point
    return () => {};
  }, [points]);

  useMapEvents({
    click(e) {
      if (!active) return;
      setPoints((prev) => [...prev, e.latlng]);
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

  const handleClear = () => {
    setPoints([]);
  };

  const handleUndo = () => {
    setPoints((prev) => prev.slice(0, -1));
  };

  if (!active || points.length === 0) return null;

  const area = points.length >= 3 ? computeArea(points) : 0;

  return (
    <div
      className="absolute bottom-12 left-3 z-[1000] rounded-lg bg-background/95 backdrop-blur-sm border border-border shadow-lg px-4 py-3 min-w-[180px] animate-scale-in"
      dir="rtl"
    >
      <div className="text-xs font-semibold text-foreground mb-1.5">📏 מדידה</div>
      <div className="space-y-1">
        <div className="text-[11px]">
          <span className="text-muted-foreground">מרחק: </span>
          <span className="text-primary font-bold">{formatDist(totalDistance())}</span>
        </div>
        {area > 0 && (
          <div className="text-[11px]">
            <span className="text-muted-foreground">שטח: </span>
            <span className="text-primary font-bold">
              {area > 10000 ? `${(area / 10000).toFixed(2)} דונם` : `${area.toFixed(0)} מ״ר`}
            </span>
          </div>
        )}
        <div className="text-[9px] text-muted-foreground">{points.length} נקודות</div>
      </div>
      <div className="flex gap-2 mt-2 pt-2 border-t border-border">
        <button
          onClick={handleUndo}
          disabled={points.length === 0}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
        >
          ↩ בטל אחרון
        </button>
        <button
          onClick={handleClear}
          className="text-[10px] text-destructive hover:underline"
        >
          נקה הכל
        </button>
      </div>
    </div>
  );
}
