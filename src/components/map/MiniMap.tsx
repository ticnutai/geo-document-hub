import { useState, useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { Minimize2, Maximize2 } from "lucide-react";

export default function MiniMap() {
  const map = useMap();
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const miniMapRef = useRef<L.Map | null>(null);
  const rectRef = useRef<L.Rectangle | null>(null);

  useEffect(() => {
    if (!containerRef.current || !visible) return;

    // Prevent main map events from leaking
    L.DomEvent.disableClickPropagation(containerRef.current);
    L.DomEvent.disableScrollPropagation(containerRef.current);

    const miniMap = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(miniMap);

    miniMapRef.current = miniMap;

    const updateMiniMap = () => {
      const center = map.getCenter();
      const zoom = Math.max(map.getZoom() - 5, 1);
      miniMap.setView(center, zoom);

      if (rectRef.current) miniMap.removeLayer(rectRef.current);
      const bounds = map.getBounds();
      rectRef.current = L.rectangle(bounds, {
        color: "hsl(210, 80%, 45%)",
        weight: 2,
        fillOpacity: 0.15,
      }).addTo(miniMap);
    };

    updateMiniMap();
    map.on("moveend zoomend", updateMiniMap);

    return () => {
      map.off("moveend zoomend", updateMiniMap);
      miniMap.remove();
      miniMapRef.current = null;
    };
  }, [map, visible]);

  return (
    <div className="absolute bottom-16 right-2 z-[1000]">
      <button
        onClick={() => setVisible(!visible)}
        className="absolute -top-7 right-0 z-10 rounded-t-md bg-background/90 border border-b-0 border-border px-1.5 py-0.5 text-foreground hover:bg-accent transition-colors"
        title={visible ? "הסתר מפת סקירה" : "הצג מפת סקירה"}
      >
        {visible ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
      </button>
      {visible && (
        <div
          ref={containerRef}
          className="w-36 h-28 rounded-md border-2 border-border bg-background shadow-lg overflow-hidden"
          style={{ cursor: "default" }}
        />
      )}
    </div>
  );
}
