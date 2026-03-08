import { useState, useEffect } from "react";
import { useMapEvents } from "react-leaflet";

export default function MouseCoords() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useMapEvents({
    mousemove(e) {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    mouseout() {
      setCoords(null);
    },
  });

  if (!coords) return null;

  return (
    <div
      className="absolute bottom-2 left-2 z-[1000] rounded bg-background/90 backdrop-blur-sm px-2 py-1 text-[10px] font-mono text-foreground border border-border shadow-sm"
      dir="ltr"
    >
      {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
    </div>
  );
}
