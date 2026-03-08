import { useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, LayersControl } from "react-leaflet";
import L from "leaflet";
import type { GeoLayer } from "@/types/gis";
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
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function LayerRenderer({ layer }: { layer: GeoLayer }) {
  if (!layer.visible) return null;

  const style = {
    color: layer.color,
    weight: 2,
    opacity: layer.opacity,
    fillOpacity: layer.opacity * 0.3,
  };

  return (
    <GeoJSON
      key={`${layer.id}-${layer.visible}-${layer.opacity}`}
      data={layer.data}
      style={() => style}
      pointToLayer={(feature, latlng) => {
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
            .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
            .join("<br/>");
          leafletLayer.bindPopup(content);
        }
      }}
    />
  );
}

export default function MapView({ layers, center = [32.0853, 34.7818], zoom = 13 }: MapViewProps) {
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
            attribution='&copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="טופוגרפי">
          <TileLayer
            attribution='&copy; OpenTopoMap'
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {layers.map((layer) => (
        <LayerRenderer key={layer.id} layer={layer} />
      ))}

      <MapUpdater center={center} zoom={zoom} />
    </MapContainer>
  );
}
