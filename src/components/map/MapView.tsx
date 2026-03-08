import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, LayersControl } from "react-leaflet";
import L from "leaflet";
import type { GeoLayer } from "@/types/gis";
import type { HighlightedFeature } from "@/hooks/useMapHighlight";
import { getWaybackTileUrl } from "@/data/wayback-data";
import MouseCoords from "./MouseCoords";
import LocateButton from "./LocateButton";
import MeasureTool from "./MeasureTool";
import ScaleBar from "./ScaleBar";
import MiniMap from "./MiniMap";
import ZoomControls from "./ZoomControls";
import GoToCoords from "./GoToCoords";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapViewProps {
  layers: GeoLayer[];
  center?: [number, number];
  zoom?: number;
  waybackReleaseId?: string | null;
  measureActive?: boolean;
  onMapReady?: (map: L.Map) => void;
  highlighted?: HighlightedFeature | null;
  onFeatureClick?: (feature: GeoJSON.Feature, label?: string) => void;
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prevCenter = useRef<string>("");
  useEffect(() => {
    const key = `${center[0]},${center[1]},${zoom}`;
    if (key !== prevCenter.current) {
      map.flyTo(center, zoom, { duration: 1 });
      prevCenter.current = key;
    }
  }, [center, zoom, map]);
  return null;
}

function MapRefReporter({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap();
  const reported = useRef(false);
  useEffect(() => {
    if (!reported.current) {
      onMapReady(map);
      reported.current = true;
    }
  }, [map, onMapReady]);
  return null;
}

function WaybackLayer({ releaseId }: { releaseId: string }) {
  return (
    <TileLayer
      key={releaseId}
      url={getWaybackTileUrl(releaseId)}
      attribution="&copy; Esri Wayback"
      opacity={1}
      zIndex={50}
    />
  );
}

function LayerRenderer({ layer }: { layer: GeoLayer }) {
  if (!layer.visible || !layer.data) return null;

  const style = {
    color: layer.color,
    weight: 2,
    opacity: layer.opacity,
    fillOpacity: layer.opacity * 0.3,
  };

  return (
    <GeoJSON
      key={`${layer.id}-${layer.visible}-${layer.opacity}-${layer.color}`}
      data={layer.data}
      style={() => style}
      pointToLayer={(_feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 8,
          fillColor: layer.color,
          color: "#fff",
          weight: 2,
          opacity: layer.opacity,
          fillOpacity: layer.opacity * 0.8,
        });
      }}
      onEachFeature={(feature, leafletLayer) => {
        if (feature.properties) {
          const content = Object.entries(feature.properties)
            .filter(([, v]) => v !== null && v !== undefined && v !== "")
            .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
            .join("<br/>");
          if (content) leafletLayer.bindPopup(content);
        }
      }}
    />
  );
}

function HighlightLayer({ highlighted }: { highlighted: HighlightedFeature }) {
  return (
    <GeoJSON
      key={highlighted.id}
      data={highlighted.data}
      style={() => ({
        color: highlighted.color,
        weight: 4,
        opacity: 1,
        fillOpacity: 0.25,
        fillColor: highlighted.color,
        dashArray: "6, 3",
      })}
      onEachFeature={(feature, layer) => {
        if (highlighted.label) {
          layer.bindTooltip(highlighted.label, {
            permanent: true,
            direction: "center",
            className: "highlight-tooltip",
          });
        }
        if (feature.properties) {
          const content = Object.entries(feature.properties)
            .filter(([, v]) => v !== null && v !== undefined && v !== "")
            .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
            .join("<br/>");
          if (content) layer.bindPopup(content);
        }
      }}
    />
  );
}

export default function MapView({
  layers,
  center = [32.0853, 34.7818],
  zoom = 13,
  waybackReleaseId,
  measureActive = false,
  onMapReady,
  highlighted,
}: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full"
      zoomControl={false}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="לוויין">
          <TileLayer
            attribution="&copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="טופוגרפי">
          <TileLayer
            attribution="&copy; OpenTopoMap"
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {waybackReleaseId && <WaybackLayer releaseId={waybackReleaseId} />}

      {layers.map((layer) => (
        <LayerRenderer key={layer.id} layer={layer} />
      ))}

      {highlighted && <HighlightLayer highlighted={highlighted} />}

      <MapUpdater center={center} zoom={zoom} />
      <MouseCoords />
      <LocateButton />
      <ZoomControls />
      <MeasureTool active={measureActive} />
      <ScaleBar />
      <MiniMap />
      <GoToCoords />
      {onMapReady && <MapRefReporter onMapReady={onMapReady} />}
    </MapContainer>
  );
}
