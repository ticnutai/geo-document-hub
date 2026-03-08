import { useState } from "react";
import { Layers, FileText, PenTool, Search, Map, Github, Database, Building2, Grid3X3, Landmark, BarChart3, Plane, MapPinned, Ruler } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { GeoLayer, GISDocument, SidebarTab } from "@/types/gis";
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
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  layers: GeoLayer[];
  categories: string[];
  documents: GISDocument[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleVisibility: (id: string) => void;
  onSetOpacity: (id: string, opacity: number) => void;
  onRemoveLayer: (id: string) => void;
  onRemoveDocument: (id: string) => void;
  onUploadClick: () => void;
  onGitHubClick: () => void;
  onLocationSelect: (lat: number, lng: number, name: string) => void;
  onLayerAdd: (layer: GeoLayer) => void;
  onWaybackSelect: (releaseId: string | null) => void;
  activeWaybackId: string | null;
  measureActive: boolean;
  onMeasureToggle: () => void;
}

const tabs: { id: SidebarTab; label: string; icon: any }[] = [
  { id: "layers", label: "שכבות", icon: Layers },
  { id: "catalog", label: "קטלוג", icon: Database },
  { id: "plans", label: "תוכניות", icon: Building2 },
  { id: "migrashim", label: "מגרשים", icon: Grid3X3 },
  { id: "blocks", label: "גושים", icon: Landmark },
  { id: "complot", label: "קומפלוט", icon: MapPinned },
  { id: "aerial", label: "צילומי אוויר", icon: Plane },
  { id: "stats", label: "סטטיסטיקות", icon: BarChart3 },
  { id: "documents", label: "מסמכים", icon: FileText },
  { id: "draw", label: "ציור", icon: PenTool },
  { id: "search", label: "חיפוש", icon: Search },
];

export default function AppSidebar(props: AppSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("layers");
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" side="right" className="border-r-0 border-l">
      <SidebarHeader className="border-b border-border/50 p-3">
        {!collapsed && (
          <div className="flex items-center gap-2" dir="rtl">
            <Map className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">GIS Pro</span>
          </div>
        )}
        {collapsed && <Map className="h-5 w-5 text-primary mx-auto" />}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {tabs.map((tab) => (
                <SidebarMenuItem key={tab.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(tab.id)}
                    isActive={activeTab === tab.id}
                    tooltip={tab.label}
                  >
                    <tab.icon className="h-4 w-4" />
                    {!collapsed && <span>{tab.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <SidebarGroup>
            <SidebarGroupContent>
              {activeTab === "layers" && (
                <>
                  <div className="px-1 mb-2 flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2 text-xs"
                      onClick={props.onGitHubClick}
                    >
                      <Github className="h-3.5 w-3.5" />
                      GitHub
                    </Button>
                    <Button
                      variant={props.measureActive ? "default" : "outline"}
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={props.onMeasureToggle}
                    >
                      <Ruler className="h-3.5 w-3.5" />
                      מדידה
                    </Button>
                  </div>
                  <LayerPanel
                    layers={props.layers}
                    categories={props.categories}
                    onToggleVisibility={props.onToggleVisibility}
                    onSetOpacity={props.onSetOpacity}
                    onRemoveLayer={props.onRemoveLayer}
                  />
                </>
              )}
              {activeTab === "catalog" && (
                <DataCatalog onLayerAdd={props.onLayerAdd} />
              )}
              {activeTab === "plans" && <PlansPanel onLayerAdd={props.onLayerAdd} />}
              {activeTab === "migrashim" && <MigrashimPanel />}
              {activeTab === "blocks" && <BlocksPanel />}
              {activeTab === "complot" && <ComplotPanel />}
              {activeTab === "aerial" && (
                <AerialPanel
                  onReleaseSelect={props.onWaybackSelect}
                  activeReleaseId={props.activeWaybackId}
                />
              )}
              {activeTab === "stats" && <StatsPanel />}
              {activeTab === "documents" && (
                <DocumentPanel
                  documents={props.documents}
                  searchQuery={props.searchQuery}
                  onSearchChange={props.onSearchChange}
                  onRemove={props.onRemoveDocument}
                  onUploadClick={props.onUploadClick}
                />
              )}
              {activeTab === "draw" && <DrawTools onModeChange={() => {}} />}
              {activeTab === "search" && (
                <GlobalSearch onLocationSelect={props.onLocationSelect} />
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
