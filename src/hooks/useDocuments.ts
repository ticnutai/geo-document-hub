import { useState, useCallback } from "react";
import type { GISDocument } from "@/types/gis";
import { sampleDocuments } from "@/data/sample-layers";

export function useDocuments() {
  const [documents, setDocuments] = useState<GISDocument[]>(sampleDocuments);
  const [searchQuery, setSearchQuery] = useState("");

  const addDocument = useCallback((doc: GISDocument) => {
    setDocuments((prev) => [...prev, doc]);
  }, []);

  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const filteredDocuments = documents.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return { documents: filteredDocuments, allDocuments: documents, addDocument, removeDocument, searchQuery, setSearchQuery };
}
