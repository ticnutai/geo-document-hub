import { useState, useCallback, useEffect } from "react";
import { useSidebarResize } from "@/hooks/useSidebarResize";
import { generatePlanningSheet } from "@/utils/planning-sheet";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/sidebar/AppSidebar";
import MapView from "@/components/map/MapView";
import MapToolbar from "@/components/map/MapToolbar";
import MapLegend from "@/components/map/MapLegend";
import FileUploader from "@/components/documents/FileUploader";
import GitHubLoader from "@/components/documents/GitHubLoader";
import AdvancedSearchDialog from "@/components/search/AdvancedSearchDialog";
import { useLayers } from "@/hooks/useLayers";
import { useDocuments } from "@/hooks/useDocuments";
import { useMapHighlight } from "@/hooks/useMapHighlight";
import { useFavorites } from "@/hooks/useFavorites";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useSearchFavorites } from "@/hooks/useSearchFavorites";
import { PanelRight, Map, Search } from "lucide-react";
import QuickActions from "@/components/sidebar/QuickActions";
import type { GeoLayer } from "@/types/gis";
import L from "leaflet";

export default function Index() {
  const { layers, toggleVisibility, setOpacity, setColor, setStrokeColor, setStrokeOpacity, setFillColor, setFillOpacity, addLayer, removeLayer, renameLayer, reorderLayers, categories } = useLayers();
  const { documents, addDocument, removeDocument, searchQuery, setSearchQuery } = useDocuments();
  const { favorites, toggleFavorite, removeFavorite, isFavorite } = useFavorites();
  const { recents, addRecent, clearRecents } = useRecentSearches();
  const { favorites: searchFavorites, addFavorite: addSearchFav, removeFavorite: removeSearchFav, isFavorite: isSearchFav } = useSearchFavorites();
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([32.0853, 34.7818]);
  const [mapZoom, setMapZoom] = useState(13);
  const [waybackReleaseId, setWaybackReleaseId] = useState<string | null>(null);
  const [measureActive, setMeasureActive] = useState(false);
  const [georefActive, setGeorefActive] = useState(false);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [legendSelection, setLegendSelection] = useState<Set<string>>(new Set());
  const { width: sidebarWidth, pinned: sidebarPinned, isVisible: sidebarVisible, onDragStart, togglePin } = useSidebarResize();

  const toggleLegendItem = useCallback((id: string) => {
    setLegendSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Register global planning sheet function for popup buttons
  useEffect(() => {
    (window as any).__gisPlanningSheet = generatePlanningSheet;
    return () => { delete (window as any).__gisPlanningSheet; };
  }, []);

  // Keyboard shortcut: Ctrl+K / ⌘K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { highlighted, highlightAndZoom, highlightOnly, clearHighlight } = useMapHighlight(mapRef);

  const handleLocationSelect = useCallback((lat: number, lng: number, _name: string) => {
    setMapCenter([lat + Math.random() * 0.000001, lng + Math.random() * 0.000001]);
    setMapZoom(16);
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

  const handleHighlightFeature = useCallback(
    (feature: GeoJSON.Feature | GeoJSON.Feature[], color?: string, label?: string) => {
      highlightAndZoom(feature, color, label);
    },
    [highlightAndZoom]
  );

  const handleMapFeatureClick = useCallback((feature: GeoJSON.Feature, label?: string) => {
    highlightOnly(feature, undefined, label);
  }, [highlightOnly]);

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
          onSetColor={setColor}
          onSetStrokeColor={setStrokeColor}
          onSetStrokeOpacity={setStrokeOpacity}
          onSetFillColor={setFillColor}
          onSetFillOpacity={setFillOpacity}
          onRemoveLayer={removeLayer}
          onRenameLayer={renameLayer}
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
          onReorderLayers={reorderLayers}
          onHighlightFeature={handleHighlightFeature}
          onClearHighlight={clearHighlight}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onRemoveFavorite={removeFavorite}
          isFavorite={isFavorite}
          sidebarWidth={sidebarWidth}
          sidebarPinned={sidebarPinned}
          sidebarVisible={sidebarVisible}
          onDragStart={onDragStart}
          onTogglePin={togglePin}
        />

        <div className="flex-1 flex flex-col">
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

            {/* Persistent search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 mr-2 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-accent/60 hover:border-ring/40 transition-all text-muted-foreground hover:text-foreground group"
              title="חיפוש מתקדם (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-[10px]">חיפוש מתקדם...</span>
              <kbd className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-background border border-border/60 text-muted-foreground font-mono">⌘K</kbd>
            </button>

            <div className="flex-1" />
            {highlighted && (
              <button
                onClick={clearHighlight}
                className="text-[10px] bg-destructive/10 text-destructive px-2 py-1 rounded-md hover:bg-destructive/20 transition-colors"
              >
                ✕ נקה סימון
              </button>
            )}
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
              georefActive={georefActive}
              onGeorefClose={() => setGeorefActive(false)}
              onMapReady={setMapRef}
              highlighted={highlighted}
              onFeatureClick={handleMapFeatureClick}
            />
            <MapLegend layers={layers} legendSelection={legendSelection} onToggleLegendItem={toggleLegendItem} />
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

      <AdvancedSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onLocationSelect={handleLocationSelect}
        onHighlightFeature={handleHighlightFeature}
        recents={recents}
        onAddRecent={addRecent}
        onClearRecents={clearRecents}
        searchFavorites={searchFavorites}
        onAddSearchFavorite={addSearchFav}
        onRemoveSearchFavorite={removeSearchFav}
        isSearchFavorite={isSearchFav}
      />
    </SidebarProvider>
  );
}
