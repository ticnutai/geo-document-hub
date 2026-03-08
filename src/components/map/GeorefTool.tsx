import { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

interface GeorefToolProps {
  active: boolean;
  onClose: () => void;
  onSaveAsLayer?: (name: string, imageUrl: string, bounds: [[number, number], [number, number]]) => void;
}

const CORNER_ICON = L.divIcon({
  className: "georef-corner-marker",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#f43f5e;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);cursor:move"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export default function GeorefTool({ active, onClose, onSaveAsLayer }: GeorefToolProps) {
  const map = useMap();
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.7);
  const [rotation, setRotation] = useState(0);
  const [layerName, setLayerName] = useState("תמונה מגואורפרנס");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const clearOverlay = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    overlayRef.current?.remove();
    overlayRef.current = null;
    setImageUrl(null);
  }, []);

  useEffect(() => {
    if (!active) {
      clearOverlay();
    }
  }, [active, clearOverlay]);

  const updateOverlay = useCallback(() => {
    if (!overlayRef.current || markersRef.current.length < 4) return;
    const corners = markersRef.current.map((m) => m.getLatLng());
    const lats = corners.map((c) => c.lat);
    const lngs = corners.map((c) => c.lng);
    const bounds = L.latLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );
    overlayRef.current.setBounds(bounds);
  }, []);

  const placeImage = useCallback(
    (url: string) => {
      clearOverlay();
      const center = map.getCenter();
      const zoom = map.getZoom();
      const spread = 0.005 * Math.pow(2, 15 - zoom);

      const sw: L.LatLngTuple = [center.lat - spread, center.lng - spread * 1.4];
      const ne: L.LatLngTuple = [center.lat + spread, center.lng + spread * 1.4];
      const bounds = L.latLngBounds(sw, ne);

      const overlay = L.imageOverlay(url, bounds, { opacity, interactive: true }).addTo(map);
      overlayRef.current = overlay;

      const cornerLatLngs: L.LatLngTuple[] = [
        [sw[0], sw[1]],
        [sw[0], ne[1]],
        [ne[0], ne[1]],
        [ne[0], sw[1]],
      ];

      cornerLatLngs.forEach((ll) => {
        const marker = L.marker(ll, { icon: CORNER_ICON, draggable: true }).addTo(map);
        marker.on("drag", updateOverlay);
        markersRef.current.push(marker);
      });
    },
    [map, clearOverlay, updateOverlay, opacity]
  );

  useEffect(() => {
    overlayRef.current?.setOpacity(opacity);
  }, [opacity]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setLayerName(file.name.replace(/\.[^.]+$/, ""));
    placeImage(url);
  };

  const handleSave = () => {
    if (!overlayRef.current || !imageUrl || markersRef.current.length < 4) return;
    const corners = markersRef.current.map((m) => m.getLatLng());
    const lats = corners.map((c) => c.lat);
    const lngs = corners.map((c) => c.lng);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
    onSaveAsLayer?.(layerName, imageUrl, bounds);
    // Remove markers but keep overlay as a permanent layer
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    overlayRef.current = null;
    setImageUrl(null);
  };

  if (!active) return null;

  return (
    <div className="absolute bottom-14 left-3 z-[1100] bg-background/95 backdrop-blur border border-border rounded-xl shadow-xl p-3 w-64" dir="rtl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-foreground">📐 גיאורפרנס</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-destructive text-sm">✕</button>
      </div>

      {!imageUrl ? (
        <div>
          <p className="text-[10px] text-muted-foreground mb-2">
            העלה תמונה או תוכנית כדי למקם על המפה
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            📁 בחר תמונה
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">
            גרור את הנקודות האדומות כדי למקם את התמונה
          </p>
          <input
            type="text"
            value={layerName}
            onChange={(e) => setLayerName(e.target.value)}
            placeholder="שם השכבה"
            className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">שקיפות</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="flex-1 h-1 accent-primary"
            />
            <span className="text-[10px] text-muted-foreground w-8 text-left">{Math.round(opacity * 100)}%</span>
          </div>
          <button
            onClick={handleSave}
            className="w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-medium hover:bg-primary/90 transition-colors"
          >
            💾 שמור כשכבה קבועה
          </button>
          <div className="flex gap-1.5">
            <button
              onClick={clearOverlay}
              className="flex-1 py-1.5 rounded-lg bg-destructive/10 text-destructive text-[10px] font-medium hover:bg-destructive/20 transition-colors"
            >
              🗑️ הסר
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 py-1.5 rounded-lg bg-muted text-foreground text-[10px] font-medium hover:bg-accent transition-colors"
            >
              🔄 החלף
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}