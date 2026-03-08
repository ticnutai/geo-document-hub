import { useState, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/sidebar/AppSidebar";
import MapView from "@/components/map/MapView";
import FileUploader from "@/components/documents/FileUploader";
import GitHubLoader from "@/components/documents/GitHubLoader";
import { useLayers } from "@/hooks/useLayers";
import { useDocuments } from "@/hooks/useDocuments";
import { PanelRight } from "lucide-react";

export default function Index() {
  const { layers, toggleVisibility, setOpacity, addLayer, removeLayer, categories } = useLayers();
  const { documents, addDocument, removeDocument, searchQuery, setSearchQuery } = useDocuments();
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([32.0853, 34.7818]);
  const [mapZoom, setMapZoom] = useState(13);

  const handleLocationSelect = useCallback((lat: number, lng: number, _name: string) => {
    setMapCenter([lat, lng]);
    setMapZoom(15);
  }, []);

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
        />

        <div className="flex-1 flex flex-col">
          <header className="h-10 flex items-center border-b bg-background/80 backdrop-blur-sm px-2 gap-2">
            <SidebarTrigger>
              <PanelRight className="h-4 w-4" />
            </SidebarTrigger>
            <span className="text-xs font-medium text-muted-foreground">
              {layers.filter((l) => l.visible).length} שכבות פעילות · {documents.length} מסמכים
            </span>
          </header>

          <main className="flex-1 relative">
            <MapView layers={layers} center={mapCenter} zoom={mapZoom} />
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
