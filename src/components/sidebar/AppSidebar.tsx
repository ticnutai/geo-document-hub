import { GripVertical, Map } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import type { GeoLayer, GISDocument, SidebarTab } from "@/types/gis";
import SidebarGroupNav from "@/components/sidebar/SidebarGroupNav";
import type { FavoriteItem } from "@/hooks/useFavorites";

import { useFolders } from "@/hooks/useFolders";
import { useSidebarState } from "@/hooks/useSidebarState";
import { AppSidebarHeader } from "@/components/sidebar/AppSidebarHeader";
import { SidebarPanelRenderer } from "@/components/sidebar/SidebarPanelRenderer";

export interface AppSidebarProps {
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
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const {
    folders,
    activeFolderId,
    setActiveFolderId,
    handleFolderAdd,
    handleFolderRemove
  } = useFolders();

  const {
    activeTab,
    setActiveTab,
    favoriteLayerIds,
    favoriteMigrashIds,
    handleToggleLayerFavorite,
    handleToggleMigrashFavorite,
  } = useSidebarState(props.favorites, props.onToggleFavorite);

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
        <AppSidebarHeader 
          collapsed={collapsed} 
          isPinned={isPinned} 
          onTogglePin={props.onTogglePin} 
        />

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
                  <SidebarPanelRenderer
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    props={props}
                    favoriteLayerIds={favoriteLayerIds}
                    favoriteMigrashIds={favoriteMigrashIds}
                    handleToggleLayerFavorite={handleToggleLayerFavorite}
                    handleToggleMigrashFavorite={handleToggleMigrashFavorite}
                  />
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
      </Sidebar>
    </div>
  );
}
