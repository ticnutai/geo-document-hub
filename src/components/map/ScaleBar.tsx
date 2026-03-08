import { useEffect, useState, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { Plus, Trash2, Star } from "lucide-react";

const STORAGE_KEY = "gis-custom-scales";

const DEFAULT_SCALES = [
  { label: "1:100", value: 100 },
  { label: "1:250", value: 250 },
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

function loadCustomScales(): { label: string; value: number }[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomScales(scales: { label: string; value: number }[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scales));
}

function getMapScale(map: L.Map): number {
  const center = map.getCenter();
  const zoom = map.getZoom();
  const metersPerPixel = (40075016.686 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
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

function formatScaleNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export default function ScaleBar() {
  const map = useMap();
  const [currentScale, setCurrentScale] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [customScales, setCustomScales] = useState(loadCustomScales);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newScaleInput, setNewScaleInput] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        setShowAddInput(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  // Focus input when shown
  useEffect(() => {
    if (showAddInput && inputRef.current) inputRef.current.focus();
  }, [showAddInput]);

  const setScale = (targetScale: number) => {
    const zoom = zoomForScale(map, targetScale);
    map.setZoom(zoom);
    setShowMenu(false);
  };

  const addCustomScale = () => {
    const val = parseInt(newScaleInput.replace(/[^0-9]/g, ""), 10);
    if (!val || val < 1) return;
    const exists = [...DEFAULT_SCALES, ...customScales].some((s) => s.value === val);
    if (exists) { setNewScaleInput(""); setShowAddInput(false); return; }
    const newEntry = { label: `1:${formatScaleNumber(val)}`, value: val };
    const updated = [...customScales, newEntry].sort((a, b) => a.value - b.value);
    setCustomScales(updated);
    saveCustomScales(updated);
    setNewScaleInput("");
    setShowAddInput(false);
  };

  const removeCustomScale = (value: number) => {
    const updated = customScales.filter((s) => s.value !== value);
    setCustomScales(updated);
    saveCustomScales(updated);
  };

  // Merge and sort all scales
  const allScales = [...DEFAULT_SCALES, ...customScales].sort((a, b) => a.value - b.value);

  return (
    <div
      ref={menuRef}
      style={{ position: "absolute", bottom: 28, left: 10, zIndex: 1000 }}
    >
      <button
        onClick={() => setShowMenu((p) => !p)}
        className="bg-background/90 backdrop-blur-sm border border-border rounded-md px-3 py-1.5 text-xs font-mono font-bold text-foreground shadow-md hover:bg-accent/60 transition-colors cursor-pointer select-none"
        title="לחץ לבחור קנה מידה"
      >
        📏 1:{formatScaleNumber(currentScale)}
      </button>

      {showMenu && (
        <div className="absolute bottom-10 left-0 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-xl py-1.5 min-w-[160px] max-h-[350px] overflow-y-auto">
          <p className="text-[10px] text-muted-foreground px-3 py-1 font-semibold border-b border-border/50 mb-1">בחר קנה מידה</p>
          
          {allScales.map((ps) => {
            const isCurrent = Math.abs(currentScale - ps.value) / ps.value < 0.15;
            const isCustom = customScales.some((c) => c.value === ps.value);
            return (
              <div key={ps.value} className="flex items-center group">
                <button
                  onClick={() => setScale(ps.value)}
                  className={`flex-1 text-right px-3 py-1.5 text-[11px] font-mono hover:bg-accent/60 transition-colors ${
                    isCurrent ? "text-primary font-bold bg-primary/10" : "text-foreground"
                  }`}
                >
                  {isCustom && <Star className="inline h-2.5 w-2.5 mr-1 text-primary/60" />}
                  {ps.label}
                </button>
                {isCustom && (
                  <button
                    onClick={() => removeCustomScale(ps.value)}
                    className="px-1.5 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                    title="הסר"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          <div className="border-t border-border/50 mt-1 pt-1 px-2">
            {showAddInput ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-muted-foreground">1:</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={newScaleInput}
                  onChange={(e) => setNewScaleInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addCustomScale(); if (e.key === "Escape") setShowAddInput(false); }}
                  placeholder="למשל 750"
                  className="flex-1 bg-transparent border border-border rounded px-1.5 py-1 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-primary w-16"
                  dir="ltr"
                />
                <button
                  onClick={addCustomScale}
                  className="text-[9px] bg-primary text-primary-foreground rounded px-1.5 py-1 hover:bg-primary/90"
                >
                  הוסף
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddInput(true)}
                className="flex items-center gap-1 w-full text-[10px] text-muted-foreground hover:text-foreground py-1 transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>הוסף קנה מידה מותאם</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
