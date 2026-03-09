/**
 * Generic loader for gisnet GeoJSON layers stored under /data/gisnet_layers/
 */

const cache: Record<string, GeoJSON.FeatureCollection> = {};

export async function loadGisnetLayer(fileName: string): Promise<GeoJSON.FeatureCollection> {
  if (cache[fileName]) return cache[fileName];
  const url = `/data/gisnet_layers/${encodeURIComponent(fileName)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Gisnet layer not found: ${fileName} (${res.status})`);
      return { type: "FeatureCollection", features: [] };
    }
    const parsed = (await res.json()) as GeoJSON.FeatureCollection;
    cache[fileName] = parsed;
    return parsed;
  } catch (e) {
    console.warn(`Failed to load gisnet layer: ${fileName}`, e);
    return { type: "FeatureCollection", features: [] };
  }
}

// Pre-defined layer file names
export const GISNET_LAYERS = {
  buildingPermits: "L11_P10_היתרי_בנייה.geojson",
  buildingViolations: "L12_P10_עברות_בניה_שטחים_פתוחים.geojson",
  alertsPoly: "L14_P13_התראות_פוליגונלי.geojson",
  alertsLine: "L15_P13_התראות_קווי.geojson",
  alertsPoint: "L16_P13_התראות_נקודתי.geojson",
  buildingPlans: "L197_P196_תוכניות_בינוי.geojson",
  planIndex: "L19_P13_אינדקס_תוכניות.geojson",
  zoningBorders: "L20_P13_גבולות_מגרש_תבע.geojson",
  plotNumbers: "L21_P13_מספרי_מגרשים.geojson",
  zoning: "L23_P13_ייעודי_קרקע.geojson",
  declarationMaps: "L27_P26_מפות_הכרזה.geojson",
  antiquities: "L28_P26_אתרי_רשות_העתיקות.geojson",
  buildingUsage: "L30_P29_שימושי_מבנים.geojson",
  busStops: "L31_P29_תחנות_אוטובוס.geojson",
  kindergartens: "L32_P29_גני_ילדים.geojson",
  schools: "L33_P29_בתי_ספר.geojson",
  gardens: "L36_P29_גנים.geojson",
  administration: "L37_P29_מוסדות_מנהלה.geojson",
  synagogues: "L38_P29_בתי_כנסת_ומקוואות.geojson",
  commerce: "L39_P29_מסחר_וחנויות.geojson",
  culture: "L40_P29_מוסדות_תרבות_ורווחה.geojson",
  kolel: "L41_P29_כולל.geojson",
  daycares: "L42_P29_מעונות.geojson",
  medical: "L43_P29_מוסדות_רפואה.geojson",
  publicInst: "L44_P29_מוסדות_ציבור.geojson",
  transport: "L45_P29_תחבורה.geojson",
  sports: "L46_P29_מתקני_ספורט_ונופש.geojson",
  buildings: "L53_P47_מבנים.geojson",
  shelterSurvey: "L55_P54_סקר_מיגון.geojson",
  cellAntennas: "L57_P56_אנטנות_סלולר.geojson",
} as const;
