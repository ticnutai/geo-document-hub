import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GeoLayer } from "@/types/gis";
import { sampleLayers } from "@/data/sample-layers";

export function useLayers() {
  const [layers, setLayers] = useState<GeoLayer[]>([]);
  const [loading, setLoading] = useState(true);

  // Load layers from DB
  useEffect(() => {
    const fetchLayers = async () => {
      const { data, error } = await supabase
        .from("layers")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching layers:", error);
        setLayers(sampleLayers); // fallback
      } else if (data && data.length > 0) {
        setLayers(
          data.map((row) => ({
            id: row.id,
            name: row.name,
            type: row.type as GeoLayer["type"],
            visible: row.visible,
            opacity: Number(row.opacity),
            color: row.color,
            strokeColor: (row as any).stroke_color || row.color,
            strokeOpacity: Number((row as any).stroke_opacity ?? 1),
            fillColor: (row as any).fill_color || row.color,
            fillOpacity: Number((row as any).fill_opacity ?? 0.3),
            category: row.category,
            data: row.data,
          }))
        );
      } else {
        // Seed with sample data on first load
        await seedSampleLayers();
      }
      setLoading(false);
    };
    fetchLayers();
  }, []);

  const seedSampleLayers = async () => {
    const inserts = sampleLayers.map((l) => ({
      name: l.name,
      type: l.type,
      visible: l.visible,
      opacity: l.opacity,
      color: l.color,
      category: l.category,
      data: l.data,
    }));
    const { data, error } = await supabase.from("layers").insert(inserts).select();
    if (!error && data) {
      setLayers(
        data.map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type as GeoLayer["type"],
          visible: row.visible,
          opacity: Number(row.opacity),
          color: row.color,
          strokeColor: (row as any).stroke_color || row.color,
          strokeOpacity: Number((row as any).stroke_opacity ?? 1),
          fillColor: (row as any).fill_color || row.color,
          fillOpacity: Number((row as any).fill_opacity ?? 0.3),
          category: row.category,
          data: row.data,
        }))
      );
    } else {
      setLayers(sampleLayers);
    }
  };

  const toggleVisibility = useCallback((id: string) => {
    setLayers((prev) => {
      const layer = prev.find((l) => l.id === id);
      if (layer) {
        supabase.from("layers").update({ visible: !layer.visible }).eq("id", id).then();
      }
      return prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
    });
  }, []);

  const setOpacity = useCallback((id: string, opacity: number) => {
    setLayers((prev) => {
      supabase.from("layers").update({ opacity }).eq("id", id).then();
      return prev.map((l) => (l.id === id ? { ...l, opacity } : l));
    });
  }, []);

  const setColor = useCallback((id: string, color: string) => {
    setLayers((prev) => {
      supabase.from("layers").update({ color }).eq("id", id).then();
      return prev.map((l) => (l.id === id ? { ...l, color } : l));
    });
  }, []);

  const addLayer = useCallback(async (layer: GeoLayer) => {
    const { data, error } = await supabase
      .from("layers")
      .insert({
        name: layer.name,
        type: layer.type,
        visible: layer.visible,
        opacity: layer.opacity,
        color: layer.color,
        category: layer.category,
        data: layer.data,
      })
      .select()
      .single();

    if (!error && data) {
      setLayers((prev) => [
        ...prev,
        { ...layer, id: data.id },
      ]);
    } else {
      setLayers((prev) => [...prev, layer]);
    }
  }, []);

  const removeLayer = useCallback((id: string) => {
    supabase.from("layers").delete().eq("id", id).then();
    setLayers((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    setLayers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const categories = [...new Set(layers.map((l) => l.category))];

  return { layers, loading, toggleVisibility, setOpacity, setColor, addLayer, removeLayer, reorderLayers, categories };
}
