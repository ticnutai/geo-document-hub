import { useState } from "react";
import { Layers, FileText, PenTool, Search, Map, Github } from "lucide-react";
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
import SearchLocation from "@/components/map/SearchLocation";
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
}

const tabs: { id: SidebarTab; label: string; icon: any }[] = [
  { id: "layers", label: "שכבות", icon: Layers },
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
                  <div className="px-1 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs"
                      onClick={props.onGitHubClick}
                    >
                      <Github className="h-3.5 w-3.5" />
                      טען GeoJSON מ-GitHub
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
                <SearchLocation onLocationSelect={props.onLocationSelect} />
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
