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
  data_gov_il: "נתוני ממשל (data.gov.il)",
  cbs: "למ\"ס (CBS)",
  docs: "מסמכי תוכניות",
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

// GIS national layers display names
const GIS_LAYER_MAP: Record<string, string> = {
  arcgis_defibrillators_view: "דפיברילטורים",
  drainage_projects: "פרויקטי ניקוז",
  functional_areas: "אזורים פונקציונליים",
  gas_fuel_pipes: "צנרת דלק/גז",
  gas_pipelines: "קווי גז",
  gas_stations: "תחנות דלק",
  gas_survey_area: "אזור סקר גז",
  gvulot_district: "גבולות מחוזות",
  gvulot_local_councils: "גבולות מועצות מקומיות",
  gvulot_municipal: "גבולות מוניציפליים",
  gvulot_planning_areas: "אזורי תכנון",
  gvulot_sub_districts: "גבולות נפות",
  raw_materials: "חומרי גלם",
  road_compilation_detailed: "כבישים - מפורט",
  road_compilation_interchanges: "מחלפים",
  road_compilation_roads: "כבישים - ראשיים",
  shimour_points: "נקודות שימור",
  shimour_polygons: "אזורי שימור",
  tama1_electricity: "תמ\"א 1 - חשמל",
  tama1_flood: "תמ\"א 1 - הצפות",
  tama1_forest: "תמ\"א 1 - יערות",
  tama1_gas_pipeline: "תמ\"א 1 - צנרת גז",
  tama1_nature: "תמ\"א 1 - טבע",
  tama1_quarry: "תמ\"א 1 - מחצבות",
  tama1_roads: "תמ\"א 1 - כבישים",
  tama1_stream: "תמ\"א 1 - נחלים",
  tama1_train: "תמ\"א 1 - רכבת",
  tama1_waste: "תמ\"א 1 - פסולת",
  tama1_water_pipe: "תמ\"א 1 - צנרת מים",
  tama1_water_protect: "תמ\"א 1 - הגנת מים",
  tama1_water_storage: "תמ\"א 1 - אגירת מים",
  tama35_conservation: "תמ\"א 35 - שימור",
  tama35_eco_corridor: "תמ\"א 35 - מסדרון אקולוגי",
  tama35_env_electricity: "תמ\"א 35 - חשמל",
  tama35_env_landscape: "תמ\"א 35 - נוף",
  tama35_env_noise: "תמ\"א 35 - רעש",
  tama35_env_recharge: "תמ\"א 35 - חידור מים",
  tama35_env_security: "תמ\"א 35 - ביטחון",
  tama35_env_water_protect: "תמ\"א 35 - הגנת מים",
  tama35_forests: "תמ\"א 35 - יערות",
  tama35_landscape: "תמ\"א 35 - נוף",
  tama35_nature_reserves: "תמ\"א 35 - שמורות טבע",
  tama35_roads: "תמ\"א 35 - כבישים",
  tama35_textures: "תמ\"א 35 - מרקמים",
  tama35_train: "תמ\"א 35 - רכבת",
  tmm321_birds_natbag: "תמ\"מ 3/21 - עופות נתב\"ג",
  tmm321_electricity: "תמ\"מ 3/21 - חשמל",
  tmm321_fire_area: "תמ\"מ 3/21 - אזורי שרפה",
  tmm321_gas: "תמ\"מ 3/21 - גז",
  tmm321_height_limit: "תמ\"מ 3/21 - מגבלות גובה",
  tmm321_heritage: "תמ\"מ 3/21 - מורשת",
  tmm321_interchanges: "תמ\"מ 3/21 - מחלפים",
  tmm321_land_use: "תמ\"מ 3/21 - ייעודי קרקע",
  tmm321_municipal_border: "תמ\"מ 3/21 - גבול מוניציפלי",
  tmm321_nature: "תמ\"מ 3/21 - טבע",
  tmm321_noise_natbag: "תמ\"מ 3/21 - רעש נתב\"ג",
  tmm321_plan_border: "תמ\"מ 3/21 - גבול תוכנית",
  tmm321_rail: "תמ\"מ 3/21 - מסילה",
  tmm321_roads: "תמ\"מ 3/21 - כבישים",
  tmm321_scenic_road: "תמ\"מ 3/21 - דרך נופית",
  tmm321_sewage: "תמ\"מ 3/21 - ביוב",
  tmm321_stations: "תמ\"מ 3/21 - תחנות",
  tmm321_streams: "תמ\"מ 3/21 - נחלים",
  tmm321_transport_center: "תמ\"מ 3/21 - מרכזי תחבורה",
  tmm321_valued_area: "תמ\"מ 3/21 - אזורים יקרי ערך",
  tmm321_waste: "תמ\"מ 3/21 - פסולת",
  tmm321_water: "תמ\"מ 3/21 - מים",
  tmm_merkaz_layer1_גבול_שינויי_תמ_מים: "תמ\"מ מרכז - שינויי מים",
  tmm_merkaz_layer2_גבול_מחוז: "תמ\"מ מרכז - גבול מחוז",
  tmm_merkaz_layer3_אזורים_לבירור: "תמ\"מ מרכז - אזורים לבירור",
  tmm_merkaz_layer8_מגבלות_פוליגון: "תמ\"מ מרכז - מגבלות",
  tmm_merkaz_layer10_סימבולים: "תמ\"מ מרכז - סמלים",
  tmm_merkaz_layer11_קווים: "תמ\"מ מרכז - קווים",
  tmm_merkaz_layer12_יעודי_קרקע: "תמ\"מ מרכז - ייעודי קרקע",
  tmm_merkaz_layer13_לייבל_ישובים: "תמ\"מ מרכז - שמות ישובים",
  train_compilation: "מסילות רכבת",
  ttl_blue_lines: "קווים כחולים (תת\"ל)",
  vatmal_compounds: "מתחמי ותמ\"ל",
  xplan_land_use: "XPlan - ייעודי קרקע",
  xplan_lines: "XPlan - קווים",
  xplan_points: "XPlan - נקודות",
  xplan_polygons: "XPlan - פוליגונים",
  // Root-level files
  plan_boundaries: "גבולות תוכניות",
  taba_kfar_chabad: "תב\"ע כפר חב\"ד",
  yeudei_karka_merkaz: "ייעודי קרקע מרכז",
  export_20260221_222808: "ייצוא 21.02.2026",
  yeudei_karka_govmap_2017: "ייעודי קרקע GovMap 2017",
};

function getDisplayName(fileName: string): string {
  const baseName = fileName.replace(/\.(geojson|json|csv)$/i, "");
  if (GISNET_LAYER_MAP[baseName]) return GISNET_LAYER_MAP[baseName];
  if (GIS_LAYER_MAP[baseName]) return GIS_LAYER_MAP[baseName];
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
