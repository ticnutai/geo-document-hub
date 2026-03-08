import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GISDocument } from "@/types/gis";
import { sampleDocuments } from "@/data/sample-layers";

export function useDocuments() {
  const [documents, setDocuments] = useState<GISDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching documents:", error);
        setDocuments(sampleDocuments);
      } else if (data && data.length > 0) {
        setDocuments(
          data.map((row) => ({
            id: row.id,
            name: row.name,
            type: row.type as GISDocument["type"],
            size: Number(row.size),
            uploadedAt: new Date(row.created_at),
            location: row.location as any,
            layerId: row.layer_id ?? undefined,
            url: row.file_path ?? undefined,
          }))
        );
      } else {
        // Seed sample documents (without layer_id references to avoid FK issues)
        const inserts = sampleDocuments.map((d) => ({
          name: d.name,
          type: d.type,
          size: d.size,
          location: d.location ? { lat: (d.location as number[])[0], lng: (d.location as number[])[1] } : null,
          layer_id: null,
        }));
        const { data: seeded } = await supabase.from("documents").insert(inserts).select();
        if (seeded) {
          setDocuments(
            seeded.map((row) => ({
              id: row.id,
              name: row.name,
              type: row.type as GISDocument["type"],
              size: Number(row.size),
              uploadedAt: new Date(row.created_at),
              location: row.location as any,
              layerId: row.layer_id ?? undefined,
            }))
          );
        } else {
          setDocuments(sampleDocuments);
        }
      }
      setLoading(false);
    };
    fetchDocs();
  }, []);

  const addDocument = useCallback(async (doc: GISDocument) => {
    const { data, error } = await supabase
      .from("documents")
      .insert({
        name: doc.name,
        type: doc.type,
        size: doc.size,
        location: doc.location ? { lat: (doc.location as number[])[0], lng: (doc.location as number[])[1] } : null,
        layer_id: doc.layerId ?? null,
        file_path: doc.url ?? null,
      })
      .select()
      .single();

    if (!error && data) {
      setDocuments((prev) => [{ ...doc, id: data.id }, ...prev]);
    } else {
      setDocuments((prev) => [doc, ...prev]);
    }
  }, []);

  const removeDocument = useCallback((id: string) => {
    supabase.from("documents").delete().eq("id", id).then();
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const filteredDocuments = documents.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return { documents: filteredDocuments, allDocuments: documents, loading, addDocument, removeDocument, searchQuery, setSearchQuery };
}
