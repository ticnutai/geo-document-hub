import { useState } from "react";
import {
  Map, Layers, Database, Plane,
  ClipboardList, Building2, Grid3X3, Landmark, MapPinned,
  Wrench, PenTool, Ruler, Search,
  BarChart3, FileText,
  ChevronDown, ChevronLeft,
} from "lucide-react";
import type { SidebarTab } from "@/types/gis";

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
    ],
  },
  {
    id: "tools",
    label: "כלים",
    icon: Wrench,
    tabs: [
      { id: "draw", label: "ציור", icon: PenTool },
      { id: "search", label: "חיפוש", icon: Search },
    ],
  },
  {
    id: "info",
    label: "מידע",
    icon: BarChart3,
    tabs: [
      { id: "stats", label: "סטטיסטיקות", icon: BarChart3 },
      { id: "documents", label: "מסמכים", icon: FileText },
    ],
  },
];

interface SidebarGroupNavProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  measureActive?: boolean;
  onMeasureToggle?: () => void;
}

export default function SidebarGroupNav({ activeTab, onTabChange, measureActive, onMeasureToggle }: SidebarGroupNavProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => {
    for (const g of TAB_GROUPS) {
      if (g.tabs.some((t) => t.id === activeTab)) return g.id;
    }
    return "map";
  });

  const handleGroupToggle = (groupId: string) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
    } else {
      setExpandedGroup(groupId);
      // Auto-select first tab in group if current tab is not in this group
      const group = TAB_GROUPS.find((g) => g.id === groupId)!;
      if (!group.tabs.some((t) => t.id === activeTab)) {
        onTabChange(group.tabs[0].id);
      }
    }
  };

  return (
    <div className="space-y-0.5">
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
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
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
              <div className="mr-2 mt-0.5 space-y-0.5 animate-fade-in">
                {group.tabs.map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[11px] transition-all duration-150 ${
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      }`}
                    >
                      <TabIcon className="h-3.5 w-3.5 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}

                {/* Measure toggle inside tools group */}
                {group.id === "tools" && onMeasureToggle && (
                  <button
                    onClick={onMeasureToggle}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[11px] transition-all duration-150 ${
                      measureActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    }`}
                  >
                    <Ruler className="h-3.5 w-3.5 shrink-0" />
                    <span>מדידה</span>
                    {measureActive && (
                      <span className="mr-auto text-[9px] bg-sidebar-primary-foreground/20 px-1.5 py-0.5 rounded-full">
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
