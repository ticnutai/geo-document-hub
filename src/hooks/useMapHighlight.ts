import { useState, useCallback } from "react";
import L from "leaflet";

export interface HighlightedFeature {
  id: string;
  data: GeoJSON.FeatureCollection;
  color: string;
  label?: string;
}

export function useMapHighlight(mapRef: L.Map | null) {
  const [highlighted, setHighlighted] = useState<HighlightedFeature | null>(null);

  const buildHighlight = useCallback(
    (feature: GeoJSON.Feature | GeoJSON.Feature[], color = "#e74c3c", label?: string): HighlightedFeature => {
      const features = Array.isArray(feature) ? feature : [feature];
      const fc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features,
      };

      return {
        id: `hl-${Date.now()}`,
        data: fc,
        color,
        label,
      };
    },
    []
  );

  const highlightAndZoom = useCallback(
    (feature: GeoJSON.Feature | GeoJSON.Feature[], color = "#e74c3c", label?: string) => {
      const nextHighlight = buildHighlight(feature, color, label);
      setHighlighted(nextHighlight);

      if (!mapRef) return;

      try {
        const geoLayer = L.geoJSON(nextHighlight.data as any);
        const bounds = geoLayer.getBounds();
        if (bounds.isValid()) {
          mapRef.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
        }
      } catch (e) {
        console.warn("Could not zoom to highlight:", e);
      }
    },
    [buildHighlight, mapRef]
  );

  const highlightOnly = useCallback(
    (feature: GeoJSON.Feature | GeoJSON.Feature[], color = "#e74c3c", label?: string) => {
      const nextHighlight = buildHighlight(feature, color, label);
      setHighlighted(nextHighlight);
    },
    [buildHighlight]
  );

  const clearHighlight = useCallback(() => {
    setHighlighted(null);
  }, []);

  return { highlighted, highlightAndZoom, highlightOnly, clearHighlight };
}
