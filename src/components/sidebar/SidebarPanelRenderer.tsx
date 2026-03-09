import type { SidebarTab } from "@/types/gis";
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
import type { AppSidebarProps } from "./AppSidebar";

interface SidebarPanelRendererProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  props: AppSidebarProps;
  favoriteLayerIds: Set<string>;
  favoriteMigrashIds: Set<string>;
  handleToggleLayerFavorite: (id: string, name: string) => void;
  handleToggleMigrashFavorite: (id: string, label: string) => void;
}

export function SidebarPanelRenderer({
  activeTab,
  setActiveTab,
  props,
  favoriteLayerIds,
  favoriteMigrashIds,
  handleToggleLayerFavorite,
  handleToggleMigrashFavorite,
}: SidebarPanelRendererProps) {
  switch (activeTab) {
    case "layers":
      return (
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
}
