/**
 * Data Catalog - indexes all GeoJSON files from the repo's data/ directory.
 * Uses Vite's import.meta.glob for lazy loading.
 */

// Lazy-load all .geojson files in the data/ directory
const geojsonModules = import.meta.glob<string>('/data/**/*.geojson', {
  query: '?raw',
  import: 'default',
});

// Also index JSON data files (non-geojson)
const jsonModules = import.meta.glob<string>('/data/**/*.json', {
  query: '?raw',
  import: 'default',
});

// CSV files
const csvModules = import.meta.glob<string>('/data/**/*.csv', {
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

// GISnet Hebrew layer name mapping
const GISNET_LAYER_MAP: Record<string, string> = {
  "L1_P0_ישובים": "ישובים",
  "L3_P0_כתובות": "כתובות",
  "L4_P0_גבולות_יישובים_2024": "גבולות ישובים 2024",
  "L5_P0_תחום_שיפוט_מועצה_2024": "תחום שיפוט מועצה 2024",
  "L6_P0_רחובות": "רחובות",
  "L8_P7_גושים": "גושים",
  "L9_P7_חלקות": "חלקות",
  "L11_P10_היתרי_בנייה": "היתרי בנייה",
  "L12_P10_עברות_בניה_שטחים_פתוחים": "עברות בנייה - שטחים פתוחים",
  "L14_P13_התראות_פוליגונלי": "התראות (פוליגון)",
  "L15_P13_התראות_קווי": "התראות (קוויות)",
  "L16_P13_התראות_נקודתי": "התראות (נקודות)",
  "L17_P13_רוזטות_טקסט": "רוזטות (טקסט)",
  "L18_P13_רוזטות_קווי": "רוזטות (קווים)",
  "L19_P13_אינדקס_תוכניות": "אינדקס תוכניות",
  "L20_P13_גבולות_מגרש_תבע": "גבולות מגרש תב\"ע",
  "L21_P13_מספרי_מגרשים": "מספרי מגרשים",
  "L22_P13_ייעודי_קרקע_בשקיפות": "ייעודי קרקע (שקיפות)",
  "L23_P13_ייעודי_קרקע": "ייעודי קרקע",
  "L24_P13_אינדקס_תוכניות_קווי": "אינדקס תוכניות (קוויות)",
  "L25_P13_חלקות_מקור": "חלקות מקור",
  "L27_P26_מפות_הכרזה": "מפות הכרזה",
  "L28_P26_אתרי_רשות_העתיקות": "אתרי רשות העתיקות",
  "L30_P29_שימושי_מבנים": "שימושי מבנים",
  "L31_P29_תחנות_אוטובוס": "תחנות אוטובוס",
  "L32_P29_גני_ילדים": "גני ילדים",
  "L33_P29_בתי_ספר": "בתי ספר",
  "L34_P29_פינוי_אשפה": "פינוי אשפה",
  "L35_P29_גזם": "גזם",
  "L36_P29_גנים": "גנים ציבוריים",
  "L37_P29_מוסדות_מנהלה": "מוסדות מנהלה",
  "L38_P29_בתי_כנסת_ומקוואות": "בתי כנסת ומקוואות",
  "L39_P29_מסחר_וחנויות": "מסחר וחנויות",
  "L40_P29_מוסדות_תרבות_ורווחה": "מוסדות תרבות ורווחה",
  "L41_P29_כולל": "כולל (בית מדרש)",
  "L42_P29_מעונות": "מעונות",
  "L43_P29_מוסדות_רפואה": "מוסדות רפואה",
  "L44_P29_מוסדות_ציבור": "מוסדות ציבור",
  "L45_P29_תחבורה": "תחבורה",
  "L46_P29_מתקני_ספורט_ונופש": "מתקני ספורט ונופש",
  "L48_P47_נק_גובה": "נקודות גובה",
  "L49_P47_קווי_גובה": "קווי גובה",
  "L50_P47_זרימות_מים": "זרימות מים",
  "L51_P47_כבישים": "כבישים",
  "L52_P47_דרכי_עפר": "דרכי עפר",
  "L53_P47_מבנים": "מבנים",
  "L55_P54_סקר_מיגון": "סקר מיגון",
  "L57_P56_אנטנות_סלולר": "אנטנות סלולר",
  "L197_P196_תוכניות_בינוי": "תוכניות בינוי",
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
