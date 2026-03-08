import { useState, useRef, useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { Map, ChevronDown } from "lucide-react";

export interface BaseMapOption {
  id: string;
  name: string;
  nameHe: string;
  url: string;
  attribution: string;
  maxZoom?: number;
  subdomains?: string;
}

export const BASE_MAPS: BaseMapOption[] = [
  {
    id: "osm",
    name: "OpenStreetMap",
    nameHe: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  },
  {
    id: "satellite",
    name: "Satellite",
    nameHe: "לוויין",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
  },
  {
    id: "topo",
    name: "Topographic",
    nameHe: "טופוגרפי",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenTopoMap",
  },
  {
    id: "cartodb-light",
    name: "CartoDB Light",
    nameHe: "בהיר",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
  },
  {
    id: "cartodb-dark",
    name: "CartoDB Dark",
    nameHe: "כהה",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
  },
  {
    id: "cartodb-voyager",
    name: "CartoDB Voyager",
    nameHe: "וויאג׳ר",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
  },
  {
    id: "esri-street",
    name: "Esri Streets",
    nameHe: "רחובות Esri",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
  },
  {
    id: "esri-topo",
    name: "Esri Topo",
    nameHe: "טופו Esri",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
  },
  {
    id: "esri-natgeo",
    name: "Esri NatGeo",
    nameHe: "נשיונל ג׳יאוגרפיק",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, National Geographic",
  },
  {
    id: "esri-gray",
    name: "Esri Gray",
    nameHe: "אפור Esri",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
  },
  {
    id: "stadia-smooth",
    name: "Stadia Smooth",
    nameHe: "חלק",
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia</a>',
  },
  {
    id: "stadia-smooth-dark",
    name: "Stadia Dark",
    nameHe: "חלק כהה",
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia</a>',
  },
  {
    id: "stadia-satellite",
    name: "Stadia Satellite",
    nameHe: "לוויין Stadia",
    url: "https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia</a>',
  },
  {
    id: "osm-hot",
    name: "OSM Humanitarian",
    nameHe: "הומניטרי",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: '&copy; OSM, HOT',
  },
  {
    id: "cyclosm",
    name: "CyclOSM",
    nameHe: "אופניים",
    url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
    attribution: '&copy; CyclOSM',
  },
];

export default function BaseLayerSwitcher() {
  const map = useMap();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState("osm");
  const tileRef = useRef<L.TileLayer | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Initialize with default tile layer
  useEffect(() => {
    const base = BASE_MAPS[0];
    const layer = L.tileLayer(base.url, {
      attribution: base.attribution,
      maxZoom: base.maxZoom || 19,
      subdomains: base.subdomains || "abc",
    });
    layer.addTo(map);
    tileRef.current = layer;

    return () => {
      layer.remove();
    };
  }, [map]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const switchBase = (opt: BaseMapOption) => {
    if (tileRef.current) {
      tileRef.current.remove();
    }
    const layer = L.tileLayer(opt.url, {
      attribution: opt.attribution,
      maxZoom: opt.maxZoom || 19,
      subdomains: opt.subdomains || "abc",
    });
    layer.addTo(map);
    // Ensure base layer is behind everything
    layer.setZIndex(0);
    tileRef.current = layer;
    setActiveId(opt.id);
    setOpen(false);
  };

  const activeName = BASE_MAPS.find((b) => b.id === activeId)?.nameHe || "מפה";

  return (
    <div ref={menuRef} className="absolute top-3 right-3 z-[1000]" dir="rtl">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 rounded-lg bg-background/95 backdrop-blur-sm shadow-md border border-border px-2.5 py-1.5 hover:bg-accent transition-colors text-xs font-medium text-foreground"
      >
        <Map className="h-3.5 w-3.5 text-primary" />
        <span>{activeName}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-1 rounded-lg bg-background/95 backdrop-blur-sm shadow-lg border border-border max-h-[320px] overflow-y-auto w-[180px]">
          {BASE_MAPS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => switchBase(opt)}
              className={`w-full text-right px-3 py-1.5 text-xs transition-colors flex items-center gap-2 ${
                activeId === opt.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-accent/60"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  activeId === opt.id ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
              <span className="truncate">{opt.nameHe}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
