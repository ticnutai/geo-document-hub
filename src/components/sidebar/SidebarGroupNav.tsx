import { useState } from "react";
import {
  Map, Layers, Database, Plane,
  ClipboardList, Building2, Grid3X3, Landmark, MapPinned,
  Wrench, PenTool, Ruler, Search, Github,
  BarChart3, FileText, Star, TrendingUp,
  ChevronDown, ChevronLeft,
  FolderPlus, Folder, X,
} from "lucide-react";
import type { SidebarTab } from "@/types/gis";
import { Button } from "@/components/ui/button";

export interface TabGroup {
  id: string;
  label: string;
  icon: any;
  tabs: { id: SidebarTab; label: string; icon: any }[];
}

export const TAB_GROUPS: TabGroup[] = [
  {
    id: "map",
    label: "מפה ושכבות",
    icon: Map,
    tabs: [
      { id: "layers", label: "שכבות", icon: Layers },
      { id: "catalog", label: "קטלוג נתונים", icon: Database },
      { id: "aerial", label: "צילומי אוויר", icon: Plane },
    ],
  },
  {
    id: "planning",
    label: "תכנון",
    icon: ClipboardList,
    tabs: [
      { id: "plans", label: "תוכניות", icon: Building2 },
      { id: "migrashim", label: "מגרשים", icon: Grid3X3 },
      { id: "blocks", label: "גושים", icon: Landmark },
      { id: "complot", label: "קומפלוט", icon: MapPinned },
      { id: "analysis", label: "ניתוח", icon: TrendingUp },
    ],
  },
  {
    id: "tools",
    label: "כלים",
    icon: Wrench,
    tabs: [
      { id: "draw", label: "ציור", icon: PenTool },
      { id: "search", label: "חיפוש", icon: Search },
      { id: "github", label: "GitHub", icon: Github },
    ],
  },
  {
    id: "info",
    label: "מידע",
    icon: BarChart3,
    tabs: [
      { id: "stats", label: "סטטיסטיקות", icon: BarChart3 },
      { id: "documents", label: "מסמכים", icon: FileText },
      { id: "favorites" as SidebarTab, label: "מועדפים", icon: Star },
    ],
  },
];

export interface UserFolder {
  id: string;
  name: string;
  layerIds: string[];
  planNames: string[];
}

interface SidebarGroupNavProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  measureActive?: boolean;
  onMeasureToggle?: () => void;
  folders: UserFolder[];
  onFolderAdd: (name: string) => void;
  onFolderRemove: (id: string) => void;
  activeFolderId: string | null;
  onFolderSelect: (id: string | null) => void;
  favoritesCount?: number;
  onGitHubClick?: () => void;
}

export default function SidebarGroupNav({
  activeTab, onTabChange, measureActive, onMeasureToggle,
  folders, onFolderAdd, onFolderRemove, activeFolderId, onFolderSelect,
  favoritesCount = 0, onGitHubClick
}: SidebarGroupNavProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => {
    for (const g of TAB_GROUPS) {
      if (g.tabs.some((t) => t.id === activeTab)) return g.id;
    }
    return "map";
  });
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleGroupToggle = (groupId: string) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
    } else {
      setExpandedGroup(groupId);
      const group = TAB_GROUPS.find((g) => g.id === groupId)!;
      if (!group.tabs.some((t) => t.id === activeTab)) {
        onTabChange(group.tabs[0].id);
      }
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onFolderAdd(newFolderName.trim());
      setNewFolderName("");
      setShowFolderInput(false);
    }
  };

  return (
    <div className="space-y-1" dir="rtl">
      {/* User folders section */}
      {folders.length > 0 && (
        <div className="space-y-0.5 mb-2">
          <div className="flex items-center gap-1.5 px-2 py-1">
            <Folder className="h-3.5 w-3.5 text-ring" />
            <span className="text-[10px] font-bold text-foreground/60 tracking-wide">תיקיות שלי</span>
          </div>
          {folders.map((folder) => (
            <div key={folder.id} className="flex items-center gap-1">
              <button
                onClick={() => onFolderSelect(activeFolderId === folder.id ? null : folder.id)}
                className={`flex flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all duration-150 ${
                  activeFolderId === folder.id
                    ? "bg-accent border border-ring/40 text-foreground font-medium"
                    : "text-foreground/70 hover:bg-accent/50"
                }`}
              >
                <Folder className="h-3.5 w-3.5 text-ring shrink-0" />
                <span className="flex-1 text-right truncate">{folder.name}</span>
                <span className="text-[9px] text-muted-foreground">
                  {folder.layerIds.length + folder.planNames.length}
                </span>
              </button>
              <button
                onClick={() => onFolderRemove(folder.id)}
                className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add folder */}
      {showFolderInput ? (
        <div className="flex items-center gap-1 px-2 mb-2">
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            placeholder="שם התיקייה..."
            className="flex-1 rounded-md border border-ring/50 bg-background px-2 py-1 text-[11px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleCreateFolder}>
            צור
          </Button>
          <button onClick={() => setShowFolderInput(false)} className="p-0.5 text-muted-foreground">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowFolderInput(true)}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[10px] text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all mb-1"
        >
          <FolderPlus className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-right">תיקייה חדשה</span>
        </button>
      )}

      {/* Divider */}
      <div className="h-px bg-border mx-2 my-1" />

      {/* Tab groups */}
      {TAB_GROUPS.map((group) => {
        const isExpanded = expandedGroup === group.id;
        const hasActiveTab = group.tabs.some((t) => t.id === activeTab);
        const GroupIcon = group.icon;

        return (
          <div key={group.id}>
            <button
              onClick={() => handleGroupToggle(group.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-200 ${
                hasActiveTab
                  ? "bg-accent border border-ring/30 text-primary"
                  : "text-foreground/60 hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <GroupIcon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-right">{group.label}</span>
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 opacity-50" />
              ) : (
                <ChevronLeft className="h-3 w-3 opacity-50" />
              )}
            </button>

            {isExpanded && (
              <div className="mr-3 mt-0.5 space-y-0.5 animate-fade-in border-r-2 border-ring/20 pr-2">
                {group.tabs.map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        if (tab.id === 'github' && onGitHubClick) {
                          onGitHubClick();
                        } else {
                          onTabChange(tab.id);
                        }
                      }}
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[11px] transition-all duration-150 ${
                        isActive
                          ? "bg-primary text-primary-foreground font-medium shadow-sm"
                          : "text-foreground/50 hover:bg-accent/60 hover:text-foreground"
                      }`}
                    >
                      <TabIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 text-right">{tab.label}</span>
                      {tab.id === "favorites" && favoritesCount > 0 && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                          isActive ? "bg-primary-foreground/20" : "bg-ring/20 text-ring"
                        }`}>
                          {favoritesCount}
                        </span>
                      )}
                    </button>
                  );
                })}

                {group.id === "tools" && onMeasureToggle && (
                  <button
                    onClick={onMeasureToggle}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[11px] transition-all duration-150 ${
                      measureActive
                        ? "bg-primary text-primary-foreground font-medium shadow-sm"
                        : "text-foreground/50 hover:bg-accent/60 hover:text-foreground"
                    }`}
                  >
                    <Ruler className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 text-right">מדידה</span>
                    {measureActive && (
                      <span className="text-[9px] bg-primary-foreground/20 px-1.5 py-0.5 rounded-full">
                        פעיל
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
