import { useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Folder,
  FileJson,
  Loader2,
  Plus,
  Database,
} from "lucide-react";
import { getCategorized, type CatalogEntry, type CatalogCategory } from "@/data/data-catalog";
import type { GeoLayer } from "@/types/gis";
import { ScrollArea } from "@/components/ui/scroll-area";

const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#34495e"];
let colorIdx = 0;
const nextColor = () => COLORS[colorIdx++ % COLORS.length];

interface DataCatalogProps {
  onLayerAdd: (layer: GeoLayer) => void;
}

export default function DataCatalog({ onLayerAdd }: DataCatalogProps) {
  const categories = getCategorized();
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const toggleCat = (name: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleSub = (key: string) => {
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const loadEntry = useCallback(async (entry: CatalogEntry) => {
    setLoadingPath(entry.path);
    try {
      const raw = await entry.loader();
      const data = JSON.parse(raw);

      // Wrap non-FeatureCollection data
      const geoData =
        data.type === "FeatureCollection"
          ? data
          : {
              type: "FeatureCollection",
              features: [
                data.type === "Feature"
                  ? data
                  : { type: "Feature", geometry: data, properties: {} },
              ],
            };

      const layer: GeoLayer = {
        id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: entry.subCategory
          ? `${entry.subCategory} - ${entry.displayName}`
          : entry.displayName,
        type: "geojson",
        visible: true,
        opacity: 0.8,
        color: nextColor(),
        category: entry.category,
        data: geoData,
      };

      onLayerAdd(layer);
    } catch (err) {
      console.error("Failed to load GeoJSON:", entry.path, err);
    } finally {
      setLoadingPath(null);
    }
  }, [onLayerAdd]);

  const filterEntries = (entries: CatalogEntry[]) => {
    if (!searchFilter.trim()) return entries;
    const q = searchFilter.toLowerCase();
    return entries.filter(
      (e) =>
        e.displayName.toLowerCase().includes(q) ||
        e.fileName.toLowerCase().includes(q) ||
        (e.subCategory && e.subCategory.toLowerCase().includes(q))
    );
  };

  const filteredCategories = categories
    .map((cat) => {
      const filteredSubs = new Map<string, CatalogEntry[]>();
      let total = 0;
      for (const [subKey, entries] of cat.subCategories) {
        const filtered = filterEntries(entries);
        if (filtered.length > 0) {
          filteredSubs.set(subKey, filtered);
          total += filtered.length;
        }
      }
      return { ...cat, subCategories: filteredSubs, totalCount: total };
    })
    .filter((cat) => cat.totalCount > 0);

  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex items-center gap-2 px-1">
        <Database className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold">קטלוג נתונים</span>
        <span className="text-[10px] text-muted-foreground mr-auto">
          {categories.reduce((s, c) => s + c.totalCount, 0)} קבצים
        </span>
      </div>

      <input
        type="text"
        placeholder="חיפוש שכבה..."
        value={searchFilter}
        onChange={(e) => setSearchFilter(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-0.5 pr-2">
          {filteredCategories.map((cat) => (
            <CategoryNode
              key={cat.name}
              category={cat}
              expanded={expandedCats.has(cat.name) || !!searchFilter}
              onToggle={() => toggleCat(cat.name)}
              expandedSubs={expandedSubs}
              onToggleSub={toggleSub}
              onLoad={loadEntry}
              loadingPath={loadingPath}
              searchActive={!!searchFilter}
            />
          ))}

          {filteredCategories.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              לא נמצאו שכבות
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function CategoryNode({
  category,
  expanded,
  onToggle,
  expandedSubs,
  onToggleSub,
  onLoad,
  loadingPath,
  searchActive,
}: {
  category: CatalogCategory;
  expanded: boolean;
  onToggle: () => void;
  expandedSubs: Set<string>;
  onToggleSub: (key: string) => void;
  onLoad: (entry: CatalogEntry) => void;
  loadingPath: string | null;
  searchActive: boolean;
}) {
  const hasSubCategories = Array.from(category.subCategories.keys()).some((k) => k !== "");

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-accent/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <Folder className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="flex-1 text-right truncate">{category.name}</span>
        <span className="text-[10px] text-muted-foreground">{category.totalCount}</span>
      </button>

      {expanded && (
        <div className="mr-3 border-r border-border/40 pr-2 space-y-0.5">
          {Array.from(category.subCategories.entries()).map(([subKey, entries]) => {
            if (subKey === "") {
              // Direct entries (no subcategory)
              return entries.map((entry) => (
                <EntryRow
                  key={entry.path}
                  entry={entry}
                  loading={loadingPath === entry.path}
                  onLoad={onLoad}
                />
              ));
            }

            // Subcategory group
            const subExpanded = expandedSubs.has(subKey) || searchActive;
            return (
              <div key={subKey}>
                <button
                  onClick={() => onToggleSub(subKey)}
                  className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] hover:bg-accent/30 transition-colors"
                >
                  {subExpanded ? (
                    <ChevronDown className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronLeft className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                  )}
                  <Folder className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-right truncate" dir="auto">
                    {subKey}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{entries.length}</span>
                </button>
                {subExpanded && (
                  <div className="mr-3 border-r border-border/30 pr-1.5 space-y-0.5">
                    {entries.map((entry) => (
                      <EntryRow
                        key={entry.path}
                        entry={entry}
                        loading={loadingPath === entry.path}
                        onLoad={onLoad}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  loading,
  onLoad,
}: {
  entry: CatalogEntry;
  loading: boolean;
  onLoad: (entry: CatalogEntry) => void;
}) {
  return (
    <button
      onClick={() => onLoad(entry)}
      disabled={loading}
      className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] hover:bg-accent/50 transition-colors disabled:opacity-50"
    >
      <FileJson className="h-3 w-3 text-green-500 shrink-0" />
      <span className="flex-1 text-right truncate">{entry.displayName}</span>
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
      ) : (
        <Plus className="h-3 w-3 text-primary shrink-0" />
      )}
    </button>
  );
}
