import { useEffect, useState, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const PRESET_SCALES = [
  { label: "1:500", value: 500 },
  { label: "1:1,000", value: 1000 },
  { label: "1:2,500", value: 2500 },
  { label: "1:5,000", value: 5000 },
  { label: "1:10,000", value: 10000 },
  { label: "1:25,000", value: 25000 },
  { label: "1:50,000", value: 50000 },
  { label: "1:100,000", value: 100000 },
  { label: "1:250,000", value: 250000 },
];

function getMapScale(map: L.Map): number {
  const center = map.getCenter();
  const zoom = map.getZoom();
  // meters per pixel at this zoom/lat
  const metersPerPixel = (40075016.686 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
  // screen DPI ~96
  const dpi = 96;
  const inchesPerMeter = 39.3701;
  const pixelsPerMeter = dpi * inchesPerMeter;
  return Math.round(metersPerPixel * pixelsPerMeter);
}

function zoomForScale(map: L.Map, targetScale: number): number {
  const center = map.getCenter();
  const dpi = 96;
  const inchesPerMeter = 39.3701;
  const pixelsPerMeter = dpi * inchesPerMeter;
  const targetMPP = targetScale / pixelsPerMeter;
  const cosLat = Math.cos((center.lat * Math.PI) / 180);
  const zoom = Math.log2((40075016.686 * cosLat) / (targetMPP * 256));
  return Math.max(0, Math.min(22, zoom));
}

function formatScale(scale: number): string {
  if (scale >= 1000000) return `1:${(scale / 1000000).toFixed(1)}M`;
  if (scale >= 1000) return `1:${Math.round(scale / 1000)}K`;
  return `1:${Math.round(scale)}`;
}

export default function ScaleBar() {
  const map = useMap();
  const [currentScale, setCurrentScale] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Add Leaflet's built-in scale bar on bottom-left
  useEffect(() => {
    const scale = L.control.scale({
      position: "bottomleft",
      metric: true,
      imperial: false,
      maxWidth: 150,
    });
    scale.addTo(map);
    return () => { map.removeControl(scale); };
  }, [map]);

  // Track current scale
  useEffect(() => {
    const update = () => setCurrentScale(getMapScale(map));
    update();
    map.on("zoomend moveend", update);
    return () => { map.off("zoomend moveend", update); };
  }, [map]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const setScale = (targetScale: number) => {
    const zoom = zoomForScale(map, targetScale);
    map.setZoom(zoom);
    setShowMenu(false);
  };

  return (
    <div
      ref={menuRef}
      style={{ position: "absolute", bottom: 8, left: 10, zIndex: 1000 }}
    >
      <button
        onClick={() => setShowMenu((p) => !p)}
        className="bg-background/90 backdrop-blur-sm border border-border rounded-md px-2.5 py-1 text-[11px] font-mono font-medium text-foreground shadow-sm hover:bg-accent/60 transition-colors cursor-pointer select-none"
        title="לחץ לבחור קנה מידה"
      >
        📏 {formatScale(currentScale)}
      </button>

      {showMenu && (
        <div className="absolute bottom-8 right-0 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg py-1 min-w-[130px]">
          <p className="text-[9px] text-muted-foreground px-3 py-1 font-medium">בחר קנה מידה</p>
          {PRESET_SCALES.map((ps) => {
            const isCurrent = Math.abs(currentScale - ps.value) / ps.value < 0.15;
            return (
              <button
                key={ps.value}
                onClick={() => setScale(ps.value)}
                className={`w-full text-right px-3 py-1.5 text-[11px] font-mono hover:bg-accent/60 transition-colors ${
                  isCurrent ? "text-primary font-bold bg-primary/10" : "text-foreground"
                }`}
              >
                {ps.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
