import { useState, useCallback } from "react";
import type { GeoLayer } from "@/types/gis";
import { sampleLayers } from "@/data/sample-layers";

export function useLayers() {
  const [layers, setLayers] = useState<GeoLayer[]>(sampleLayers);

  const toggleVisibility = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  }, []);

  const setOpacity = useCallback((id: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l))
    );
  }, []);

  const addLayer = useCallback((layer: GeoLayer) => {
    setLayers((prev) => [...prev, layer]);
  }, []);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const categories = [...new Set(layers.map((l) => l.category))];

  return { layers, toggleVisibility, setOpacity, addLayer, removeLayer, categories };
}
