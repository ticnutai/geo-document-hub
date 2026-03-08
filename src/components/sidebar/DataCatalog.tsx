import { useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Folder,
  FileJson,
  Loader2,
  Plus,
  Database,
  CheckSquare,
  Square,
  Download,
} from "lucide-react";
import { getCategorized, type CatalogEntry, type CatalogCategory } from "@/data/data-catalog";
import type { GeoLayer } from "@/types/gis";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

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

  const toggleSelect = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const selectAllInCategory = (entries: CatalogEntry[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = entries.every((e) => next.has(e.path));
      if (allSelected) {
        entries.forEach((e) => next.delete(e.path));
      } else {
        entries.forEach((e) => next.add(e.path));
      }
      return next;
    });
  };

  const loadEntry = useCallback(
    async (entry: CatalogEntry) => {
      setLoadingPath(entry.path);
      try {
        const raw = await entry.loader();
        const data = JSON.parse(raw);
        const geoData =
          data.type === "FeatureCollection"
            ? data
            : {
                type: "FeatureCollection",
                features: [
                  data.type === "Feature" ? data : { type: "Feature", geometry: data, properties: {} },
                ],
              };
        const layer: GeoLayer = {
          id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: entry.subCategory ? `${entry.subCategory} - ${entry.displayName}` : entry.displayName,
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
    },
    [onLayerAdd]
  );

  const loadSelected = useCallback(async () => {
    const allEntries = categories.flatMap((cat) =>
      Array.from(cat.subCategories.values()).flat()
    );
    const toLoad = allEntries.filter((e) => selected.has(e.path));
    if (toLoad.length === 0) return;

    setBatchLoading(true);
    setBatchProgress(0);
    for (let i = 0; i < toLoad.length; i++) {
      await loadEntry(toLoad[i]);
      setBatchProgress(((i + 1) / toLoad.length) * 100);
    }
    setBatchLoading(false);
    setSelected(new Set());
  }, [selected, categories, loadEntry]);

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

      {/* Batch actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-1 px-1">
          <Button
            size="sm"
            className="flex-1 gap-1 text-[10px] h-7"
            onClick={loadSelected}
            disabled={batchLoading}
          >
            <Download className="h-3 w-3" />
            טען {selected.size} נבחרים
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-[10px] h-7"
            onClick={() => setSelected(new Set())}
          >
            נקה
          </Button>
        </div>
      )}

      {batchLoading && (
        <div className="px-1 space-y-1">
          <Progress value={batchProgress} className="h-1.5" />
          <p className="text-[9px] text-muted-foreground text-center">{Math.round(batchProgress)}%</p>
        </div>
      )}

      <ScrollArea className="h-[calc(100vh-320px)]">
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
              selected={selected}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAllInCategory}
            />
          ))}

          {filteredCategories.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">לא נמצאו שכבות</p>
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
  selected,
  onToggleSelect,
  onSelectAll,
}: {
  category: CatalogCategory;
  expanded: boolean;
  onToggle: () => void;
  expandedSubs: Set<string>;
  onToggleSub: (key: string) => void;
  onLoad: (entry: CatalogEntry) => void;
  loadingPath: string | null;
  searchActive: boolean;
  selected: Set<string>;
  onToggleSelect: (path: string) => void;
  onSelectAll: (entries: CatalogEntry[]) => void;
}) {
  const allEntries = Array.from(category.subCategories.values()).flat();

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-accent/50 transition-colors"
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
          <button
            onClick={() => onSelectAll(allEntries)}
            className="p-1 hover:bg-accent/50 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="בחר הכל"
          >
            {allEntries.every((e) => selected.has(e.path)) ? (
              <CheckSquare className="h-3 w-3 text-primary" />
            ) : (
              <Square className="h-3 w-3" />
            )}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mr-3 border-r border-border/40 pr-2 space-y-0.5">
          {Array.from(category.subCategories.entries()).map(([subKey, entries]) => {
            if (subKey === "") {
              return entries.map((entry) => (
                <EntryRow
                  key={entry.path}
                  entry={entry}
                  loading={loadingPath === entry.path}
                  onLoad={onLoad}
                  isSelected={selected.has(entry.path)}
                  onToggleSelect={onToggleSelect}
                />
              ));
            }

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
                        isSelected={selected.has(entry.path)}
                        onToggleSelect={onToggleSelect}
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
  isSelected,
  onToggleSelect,
}: {
  entry: CatalogEntry;
  loading: boolean;
  onLoad: (entry: CatalogEntry) => void;
  isSelected: boolean;
  onToggleSelect: (path: string) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onToggleSelect(entry.path)}
        className="p-0.5 hover:bg-accent/30 rounded transition-colors"
      >
        {isSelected ? (
          <CheckSquare className="h-3 w-3 text-primary" />
        ) : (
          <Square className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
      <button
        onClick={() => onLoad(entry)}
        disabled={loading}
        className="flex flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] hover:bg-accent/50 transition-colors disabled:opacity-50"
      >
        <FileJson className="h-3 w-3 text-green-500 shrink-0" />
        <span className="flex-1 text-right truncate">{entry.displayName}</span>
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
        ) : (
          <Plus className="h-3 w-3 text-primary shrink-0" />
        )}
      </button>
    </div>
  );
}
