/**
 * Data Catalog - indexes all GeoJSON files from the repo's data/ directory.
 * Uses Vite's import.meta.glob for lazy loading.
 */

// Lazy-load all .geojson files in the data/ directory
const geojsonModules = import.meta.glob<string>('/data/**/*.geojson', {
  query: '?raw',
  import: 'default',
});

export interface CatalogEntry {
  path: string;
  fileName: string;
  category: string;
  subCategory?: string; // e.g. plan ID for MMG
  displayName: string;
  loader: () => Promise<string>;
}

const CATEGORY_MAP: Record<string, string> = {
  cadastre: "קדסטר",
  gis_layers: "שכבות GIS ארציות",
  gisnet_layers: "שכבות GISnet מקומיות",
  mmg: "תוכניות מתאר (MMG)",
  uploads: "העלאות",
  complot_kfar_chabad: "קומפלוט כפר חב\"ד",
};

const LAYER_NAME_MAP: Record<string, string> = {
  MVT_ARC: "קווים",
  MVT_GVUL: "גבול תכנית",
  MVT_LABEL: "תוויות",
  MVT_PLAN: "תחום תכנית",
  MVT_PLAN_NUM: "מספר תכנית",
  MVT_POL: "פוליגונים",
  MVT_PRINT_FRAME: "מסגרת הדפסה",
  MVT_SYMBOL: "סמלים",
  MVT_GUSH: "גושים",
  MVT_GUSH_NUM: "מספרי גושים",
  MVT_PARCEL: "חלקות",
  MVT_PARCEL_NUM: "מספרי חלקות",
  MVT_ROZETA: "רוזטות",
  MVT_SURVEY_LINE: "קווי מדידה",
  MVT_SURVEY_PNT: "נקודות מדידה",
  MVT_SURVEY_POL: "פוליגוני מדידה",
};

function getDisplayName(fileName: string): string {
  const baseName = fileName.replace(/\.(geojson|json)$/i, "");
  return LAYER_NAME_MAP[baseName] || baseName.replace(/_/g, " ");
}

function parsePath(fullPath: string): { category: string; subCategory?: string; fileName: string } {
  // Path format: /data/{category}/{optional-sub}/{file}.geojson
  const parts = fullPath.replace(/^\/data\//, "").split("/");

  if (parts.length === 1) {
    return { category: "כללי", fileName: parts[0] };
  }

  const dirName = parts[0];
  const category = CATEGORY_MAP[dirName] || dirName;
  const fileName = parts[parts.length - 1];

  if (parts.length >= 3) {
    // Has subcategory (e.g. mmg/plan-id/file.geojson)
    const subCategory = parts.slice(1, -1).join("/");
    return { category, subCategory, fileName };
  }

  return { category, fileName };
}

function buildCatalog(): CatalogEntry[] {
  const entries: CatalogEntry[] = [];

  for (const [path, loader] of Object.entries(geojsonModules)) {
    // Skip non-geojson or index files
    if (path.endsWith("_index.json") || path.endsWith("_summary.json")) continue;

    const { category, subCategory, fileName } = parsePath(path);
    entries.push({
      path,
      fileName,
      category,
      subCategory,
      displayName: getDisplayName(fileName),
      loader: loader as () => Promise<string>,
    });
  }

  // Sort by category, then subcategory, then name
  entries.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category, "he");
    if (a.subCategory !== b.subCategory) return (a.subCategory || "").localeCompare(b.subCategory || "", "he");
    return a.displayName.localeCompare(b.displayName, "he");
  });

  return entries;
}

export const catalog = buildCatalog();

export interface CatalogCategory {
  name: string;
  subCategories: Map<string, CatalogEntry[]>; // "" key = no subcategory
  totalCount: number;
}

export function getCategorized(): CatalogCategory[] {
  const catMap = new Map<string, Map<string, CatalogEntry[]>>();

  for (const entry of catalog) {
    if (!catMap.has(entry.category)) {
      catMap.set(entry.category, new Map());
    }
    const subMap = catMap.get(entry.category)!;
    const subKey = entry.subCategory || "";
    if (!subMap.has(subKey)) {
      subMap.set(subKey, []);
    }
    subMap.get(subKey)!.push(entry);
  }

  return Array.from(catMap.entries()).map(([name, subCategories]) => ({
    name,
    subCategories,
    totalCount: Array.from(subCategories.values()).reduce((sum, arr) => sum + arr.length, 0),
  }));
}
