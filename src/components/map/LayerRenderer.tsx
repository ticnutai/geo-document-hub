import { useRef, useEffect, useCallback } from "react";
import { GeoJSON, ImageOverlay, useMap } from "react-leaflet";
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

  // Check if this is a georef image layer
  const features = layer.data?.features || [];
  const georefFeature = features[0]?.properties?.type === "georef-image" ? features[0] : null;
  if (georefFeature) {
    const { imageUrl, bounds } = georefFeature.properties as any;
    if (imageUrl && bounds) {
      return layer.visible ? (
        // @ts-ignore
        <ImageOverlay
          url={imageUrl}
          bounds={bounds}
          opacity={layer.opacity}
          interactive
        />
      ) : null;
    }
  }

  const style = {
    color: layer.strokeColor || layer.color,
    weight: 2,
    opacity: layer.strokeOpacity ?? layer.opacity,
    fillColor: layer.fillColor || layer.color,
    fillOpacity: layer.fillOpacity ?? layer.opacity * 0.3,
  };

  return (
    // @ts-ignore
    <GeoJSON
      key={layer.id}
      ref={(ref) => { geoJsonRef.current = ref as any; }}
      data={layer.data}
      style={() => style}
      pointToLayer={(feature, latlng) => {
        const props = (feature.properties || {}) as Record<string, unknown>;
        const label = String(
          props.LABEL ?? props.PARCEL_NUM ?? props.LOT_NUM ?? props.Migrash ?? props.migrash ?? props.MIGRASH ?? props.helka ?? props.gush ?? props.NAME ?? props.name ?? props["שם"] ?? ""
        ).trim();
        
        if (label) {
          const div = L.divIcon({
            className: "gis-label-marker",
            html: `<div style="
              background: ${layer.fillColor || layer.color};
              color: #fff;
              border: 2px solid ${layer.strokeColor || "#fff"};
              border-radius: 50%;
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: 700;
              text-shadow: 0 1px 2px rgba(0,0,0,0.5);
              box-shadow: 0 1px 4px rgba(0,0,0,0.3);
              opacity: ${layer.fillOpacity ?? layer.opacity * 0.8};
            ">${label}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });
          return L.marker(latlng, { icon: div });
        }

        return L.circleMarker(latlng, {
          radius: 8,
          fillColor: layer.fillColor || layer.color,
          color: layer.strokeColor || "#fff",
          weight: 2,
          opacity: layer.strokeOpacity ?? layer.opacity,
          fillOpacity: layer.fillOpacity ?? layer.opacity * 0.8,
        });
      }}
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
