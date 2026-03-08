import { useState, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/sidebar/AppSidebar";
import MapView from "@/components/map/MapView";
import MapToolbar from "@/components/map/MapToolbar";
import FileUploader from "@/components/documents/FileUploader";
import GitHubLoader from "@/components/documents/GitHubLoader";
import { useLayers } from "@/hooks/useLayers";
import { useDocuments } from "@/hooks/useDocuments";
import { PanelRight, Map } from "lucide-react";
import QuickActions from "@/components/sidebar/QuickActions";
import type { GeoLayer } from "@/types/gis";
import L from "leaflet";

export default function Index() {
  const { layers, toggleVisibility, setOpacity, addLayer, removeLayer, categories } = useLayers();
  const { documents, addDocument, removeDocument, searchQuery, setSearchQuery } = useDocuments();
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([32.0853, 34.7818]);
  const [mapZoom, setMapZoom] = useState(13);
  const [waybackReleaseId, setWaybackReleaseId] = useState<string | null>(null);
  const [measureActive, setMeasureActive] = useState(false);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);

  const handleLocationSelect = useCallback((lat: number, lng: number, _name: string) => {
    setMapCenter([lat, lng]);
    setMapZoom(15);
  }, []);

  const handleZoomToLayer = useCallback((layer: GeoLayer) => {
    if (!mapRef || !layer.data) return;
    try {
      const geoJsonLayer = L.geoJSON(layer.data);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        mapRef.fitBounds(bounds, { padding: [30, 30] });
      }
    } catch (e) {
      console.error("Could not zoom to layer:", e);
    }
  }, [mapRef]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full" dir="rtl">
        <AppSidebar
          layers={layers}
          categories={categories}
          documents={documents}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleVisibility={toggleVisibility}
          onSetOpacity={setOpacity}
          onRemoveLayer={removeLayer}
          onRemoveDocument={removeDocument}
          onUploadClick={() => setUploaderOpen(true)}
          onGitHubClick={() => setGithubOpen(true)}
          onLocationSelect={handleLocationSelect}
          onLayerAdd={addLayer}
          onWaybackSelect={setWaybackReleaseId}
          activeWaybackId={waybackReleaseId}
          measureActive={measureActive}
          onMeasureToggle={() => setMeasureActive((prev) => !prev)}
          onZoomToLayer={handleZoomToLayer}
        />

        <div className="flex-1 flex flex-col">
          {/* Header with gold bottom border */}
          <header className="h-11 flex items-center border-b-2 border-border bg-background px-3 gap-2" dir="rtl">
            <SidebarTrigger>
              <PanelRight className="h-4 w-4" />
            </SidebarTrigger>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Map className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-primary">GIS Pro</span>
              <span className="text-[10px] text-muted-foreground">| מערכת מידע גיאוגרפי</span>
            </div>
            <div className="flex-1" />
            <QuickActions
              measureActive={measureActive}
              onMeasureToggle={() => setMeasureActive((prev) => !prev)}
              waybackActive={!!waybackReleaseId}
              onWaybackToggle={() => setWaybackReleaseId(waybackReleaseId ? null : waybackReleaseId)}
              activeLayers={layers.filter((l) => l.visible).length}
              totalDocs={documents.length}
            />
          </header>

          <main className="flex-1 relative">
            <MapView
              layers={layers}
              center={mapCenter}
              zoom={mapZoom}
              waybackReleaseId={waybackReleaseId}
              measureActive={measureActive}
              onMapReady={setMapRef}
            />
            <MapToolbar
              measureActive={measureActive}
              onMeasureToggle={() => setMeasureActive((prev) => !prev)}
              waybackActive={!!waybackReleaseId}
            />
          </main>
        </div>
      </div>

      <FileUploader
        open={uploaderOpen}
        onOpenChange={setUploaderOpen}
        onFileAdd={addDocument}
      />

      <GitHubLoader
        open={githubOpen}
        onOpenChange={setGithubOpen}
        onLayerAdd={addLayer}
      />
    </SidebarProvider>
  );
}
