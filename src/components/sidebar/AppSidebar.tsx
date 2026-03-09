import { useState } from "react";
import { Map, Github, Pin, PinOff, GripVertical } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import type { GeoLayer, GISDocument, SidebarTab } from "@/types/gis";
import SidebarGroupNav, { type UserFolder } from "@/components/sidebar/SidebarGroupNav";
import LayerPanel from "@/components/map/LayerPanel";
import DocumentPanel from "@/components/documents/DocumentPanel";
import DrawTools from "@/components/map/DrawTools";
import GlobalSearch from "@/components/sidebar/GlobalSearch";
import DataCatalog from "@/components/sidebar/DataCatalog";
import PlansPanel from "@/components/sidebar/PlansPanel";
import MigrashimPanel from "@/components/sidebar/MigrashimPanel";
import BlocksPanel from "@/components/sidebar/BlocksPanel";
import StatsPanel from "@/components/sidebar/StatsPanel";
import AerialPanel from "@/components/sidebar/AerialPanel";
import ComplotPanel from "@/components/sidebar/ComplotPanel";
import FavoritesPanel from "@/components/sidebar/FavoritesPanel";
import PlanningAnalysisPanel from "@/components/sidebar/PlanningAnalysisPanel";
import { Button } from "@/components/ui/button";
import type { FavoriteItem } from "@/hooks/useFavorites";

interface AppSidebarProps {
  layers: GeoLayer[];
  categories: string[];
  documents: GISDocument[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleVisibility: (id: string) => void;
  onSetOpacity: (id: string, opacity: number) => void;
  onSetColor?: (id: string, color: string) => void;
  onSetStrokeColor?: (id: string, color: string) => void;
  onSetStrokeOpacity?: (id: string, opacity: number) => void;
  onSetFillColor?: (id: string, color: string) => void;
  onSetFillOpacity?: (id: string, opacity: number) => void;
  onRemoveLayer: (id: string) => void;
  onRenameLayer?: (id: string, name: string) => void;
  onRemoveDocument: (id: string) => void;
  onUploadClick: () => void;
  onGitHubClick: () => void;
  onLocationSelect: (lat: number, lng: number, name: string) => void;
  onLayerAdd: (layer: GeoLayer) => void;
  onWaybackSelect: (releaseId: string | null) => void;
  activeWaybackId: string | null;
  measureActive: boolean;
  onMeasureToggle: () => void;
  onZoomToLayer?: (layer: GeoLayer) => void;
  onReorderLayers?: (fromIndex: number, toIndex: number) => void;
  onHighlightFeature?: (feature: GeoJSON.Feature | GeoJSON.Feature[], color?: string, label?: string) => void;
  onClearHighlight?: () => void;
  favorites: FavoriteItem[];
  onToggleFavorite: (item: FavoriteItem) => void;
  onRemoveFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  // Resize & pin props
  sidebarWidth?: number;
  sidebarPinned?: boolean;
  sidebarVisible?: boolean;
  onDragStart?: (e: React.MouseEvent) => void;
  onTogglePin?: () => void;
}

export default function AppSidebar(props: AppSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("layers");
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const handleFolderAdd = (name: string) => {
    setFolders((prev) => [
      ...prev,
      { id: `folder-${Date.now()}`, name, layerIds: [], planNames: [] },
    ]);
  };

  const handleFolderRemove = (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (activeFolderId === id) setActiveFolderId(null);
  };

  const favoriteLayerIds = new Set(
    props.favorites.filter((f) => f.type === "layer").map((f) => f.id)
  );
  const favoriteMigrashIds = new Set(
    props.favorites.filter((f) => f.type === "migrash").map((f) => f.id)
  );

  const handleToggleLayerFavorite = (layerId: string, layerName: string) => {
    props.onToggleFavorite({ id: layerId, type: "layer", label: layerName });
  };

  const handleToggleMigrashFavorite = (id: string, label: string) => {
    props.onToggleFavorite({ id, type: "migrash", label });
  };

  const renderPanel = () => {
    switch (activeTab) {
      case "layers":
        return (
          <>
            <LayerPanel
              layers={props.layers}
              categories={props.categories}
              onToggleVisibility={props.onToggleVisibility}
              onSetOpacity={props.onSetOpacity}
              onSetColor={props.onSetColor}
              onSetStrokeColor={props.onSetStrokeColor}
              onSetStrokeOpacity={props.onSetStrokeOpacity}
              onSetFillColor={props.onSetFillColor}
              onSetFillOpacity={props.onSetFillOpacity}
              onRemoveLayer={props.onRemoveLayer}
              onRenameLayer={props.onRenameLayer}
              onZoomToLayer={props.onZoomToLayer}
              onReorderLayers={props.onReorderLayers}
              favorites={favoriteLayerIds}
              onToggleFavorite={handleToggleLayerFavorite}
            />
          </>
        );
      case "catalog":
        return <DataCatalog onLayerAdd={props.onLayerAdd} />;
      case "plans":
        return (
          <PlansPanel
            onLayerAdd={props.onLayerAdd}
            onHighlightFeature={props.onHighlightFeature}
          />
        );
      case "migrashim":
        return (
          <MigrashimPanel
            onHighlightFeature={props.onHighlightFeature}
            favorites={favoriteMigrashIds}
            onToggleFavorite={handleToggleMigrashFavorite}
          />
        );
      case "blocks":
        return <BlocksPanel onHighlightFeature={props.onHighlightFeature} />;
      case "complot":
        return <ComplotPanel onHighlightFeature={props.onHighlightFeature} />;
      case "analysis":
        return <PlanningAnalysisPanel onHighlightFeature={props.onHighlightFeature} />;
      case "aerial":
        return (
          <AerialPanel
            onReleaseSelect={props.onWaybackSelect}
            activeReleaseId={props.activeWaybackId}
          />
        );
      case "stats":
        return <StatsPanel />;
      case "documents":
        return (
          <DocumentPanel
            documents={props.documents}
            searchQuery={props.searchQuery}
            onSearchChange={props.onSearchChange}
            onRemove={props.onRemoveDocument}
            onUploadClick={props.onUploadClick}
          />
        );
      case "draw":
        return <DrawTools onModeChange={() => {}} />;
      case "search":
        return (
          <GlobalSearch
            onLocationSelect={props.onLocationSelect}
            onHighlightFeature={props.onHighlightFeature}
            onNavigateTo={(tab, search) => {
              const tabMap: Record<string, SidebarTab> = {
                plans: "plans",
                migrashim: "migrashim",
                blocks: "blocks",
              };
              if (tabMap[tab]) setActiveTab(tabMap[tab]);
            }}
          />
        );
      case "favorites":
        return (
          <FavoritesPanel
            favorites={props.favorites}
            onRemove={props.onRemoveFavorite}
          />
        );
      default:
        return null;
    }
  };

  const sidebarWidth = props.sidebarWidth ?? 320;
  const isPinned = props.sidebarPinned ?? true;
  const isVisible = props.sidebarVisible ?? true;

  return (
    <div
      className={`relative flex-shrink-0 h-screen transition-all duration-300 ease-in-out ${
        isVisible ? "" : "pointer-events-none"
      }`}
      style={{
        width: isVisible ? (collapsed ? 48 : sidebarWidth) : 0,
      }}
    >
      {/* Drag handle (left edge for RTL sidebar on right) */}
      {!collapsed && isVisible && (
        <div
          onMouseDown={props.onDragStart}
          className="absolute top-0 left-0 w-2 h-full cursor-col-resize z-30 group hover:bg-primary/10 transition-colors"
          title="גרור לשינוי רוחב"
        >
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-2 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}

      <Sidebar
        collapsible="icon"
        side="right"
        className="border-r-0 border-l border-border"
        style={{
          "--sidebar-width": `${sidebarWidth}px`,
        } as React.CSSProperties}
      >
        <SidebarHeader className="border-b border-border p-3 bg-background">
          {!collapsed && (
            <div className="flex items-center gap-2.5" dir="rtl">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <Map className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <span className="font-bold text-sm text-foreground">GIS Pro</span>
                <p className="text-[9px] text-muted-foreground">מערכת מידע גיאוגרפי</p>
              </div>
              {/* Pin button */}
              {props.onTogglePin && (
                <button
                  onClick={props.onTogglePin}
                  className={`h-6 w-6 flex items-center justify-center rounded-md transition-colors ${
                    isPinned
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                  title={isPinned ? "בטל הצמדה (אוטו-הסתר)" : "הצמד סרגל צד"}
                >
                  {isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          )}
          {collapsed && (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto shadow-sm">
              <Map className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="bg-background">
          <SidebarGroup>
            <SidebarGroupContent>
              {!collapsed ? (
                <SidebarGroupNav
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  measureActive={props.measureActive}
                  onMeasureToggle={props.onMeasureToggle}
                  folders={folders}
                  onFolderAdd={handleFolderAdd}
                  onFolderRemove={handleFolderRemove}
                  activeFolderId={activeFolderId}
                  onFolderSelect={setActiveFolderId}
                  favoritesCount={props.favorites.length}
                />
              ) : (
                <div className="flex flex-col items-center gap-1 py-1">
                  <Map className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>

          {!collapsed && (
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="animate-fade-in" key={activeTab}>
                  {renderPanel()}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
      </Sidebar>
    </div>
  );
}
