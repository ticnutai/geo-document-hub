import { useRef, useEffect, useCallback } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import type { GeoLayer } from "@/types/gis";
import { buildFeaturePopupHTML } from "@/utils/popup-builder";

interface LayerRendererProps {
  layer: GeoLayer;
  onFeatureClick?: (feature: GeoJSON.Feature, label?: string) => void;
}

export default function LayerRenderer({ layer, onFeatureClick }: LayerRendererProps) {
  const geoJsonRef = useRef<L.GeoJSON | null>(null);
  const map = useMap();

  // Update styles in-place without re-mounting
  useEffect(() => {
    if (!geoJsonRef.current) return;
    geoJsonRef.current.setStyle({
      color: layer.strokeColor || layer.color,
      weight: 2,
      opacity: layer.strokeOpacity ?? layer.opacity,
      fillColor: layer.fillColor || layer.color,
      fillOpacity: layer.fillOpacity ?? layer.opacity * 0.3,
    });
  }, [layer.strokeColor, layer.strokeOpacity, layer.fillColor, layer.fillOpacity, layer.color, layer.opacity]);

  // Toggle visibility via pane display
  useEffect(() => {
    if (!geoJsonRef.current) return;
    const el = geoJsonRef.current.getPane()?.querySelector('.leaflet-overlay-pane');
    if (layer.visible) {
      geoJsonRef.current.eachLayer((l) => {
        if ((l as any)._path) (l as any)._path.style.display = '';
        if ((l as any)._icon) (l as any)._icon.style.display = '';
      });
    } else {
      geoJsonRef.current.eachLayer((l) => {
        if ((l as any)._path) (l as any)._path.style.display = 'none';
        if ((l as any)._icon) (l as any)._icon.style.display = 'none';
      });
    }
  }, [layer.visible]);

  const getFeatureLabel = useCallback((feature: GeoJSON.Feature) => {
    const props = (feature.properties || {}) as Record<string, unknown>;
    const gush = String(props.LOT_NUM ?? props.gush ?? props.GUSH_NUM ?? "").trim();
    const helka = String(props.PARCEL_NUM ?? props.helka ?? props.HELKA_NUM ?? "").trim();
    const migrash = String(props.migrash ?? props.MIGRASH ?? "").trim();
    if (gush && helka) return `גוש ${gush} · חלקה ${helka}`;
    if (gush) return `גוש ${gush}`;
    if (migrash) return `מגרש ${migrash}`;
    return layer.name;
  }, [layer.name]);

  if (!layer.data) return null;

  const style = {
    color: layer.strokeColor || layer.color,
    weight: 2,
    opacity: layer.strokeOpacity ?? layer.opacity,
    fillColor: layer.fillColor || layer.color,
    fillOpacity: layer.fillOpacity ?? layer.opacity * 0.3,
  };

  return (
    <GeoJSON
      key={layer.id}
      ref={(ref) => { geoJsonRef.current = ref as any; }}
      data={layer.data}
      style={() => style}
      pointToLayer={(_feature, latlng) =>
        L.circleMarker(latlng, {
          radius: 8,
          fillColor: layer.fillColor || layer.color,
          color: layer.strokeColor || "#fff",
          weight: 2,
          opacity: layer.strokeOpacity ?? layer.opacity,
          fillOpacity: layer.fillOpacity ?? layer.opacity * 0.8,
        })
      }
      onEachFeature={(feature, leafletLayer) => {
        if (feature.properties) {
          const html = buildFeaturePopupHTML(feature.properties as Record<string, unknown>);
          if (html) {
            leafletLayer.bindPopup(html, { maxWidth: 320, minWidth: 200, className: "gis-popup-wrapper" });
          }
        }
        if (onFeatureClick) {
          leafletLayer.on("click", () => {
            onFeatureClick(feature, getFeatureLabel(feature));
          });
        }
      }}
    />
  );
}
