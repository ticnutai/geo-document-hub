/**
 * Zoning/Land-use data loader and color mapping
 * Loads ייעודי קרקע layer and provides color-by-yeud functionality
 */

const zoningModule = import.meta.glob<string>('/data/gisnet_layers/L23_P13_ייעודי_קרקע.geojson', {
  query: '?raw',
  import: 'default',
});

let zoningCache: GeoJSON.FeatureCollection | null = null;

export async function loadZoningLayer(): Promise<GeoJSON.FeatureCollection> {
  if (zoningCache) return zoningCache;
  const loader = Object.values(zoningModule)[0];
  if (!loader) return { type: "FeatureCollection", features: [] };
  const raw = await loader();
  zoningCache = JSON.parse(raw);
  return zoningCache!;
}

// Color mapping by Yeud_Code category
const YEUD_COLORS: Record<number, string> = {
  // מגורים (Residential)
  5100: "#f59e0b", // מגורים כללי
  5101: "#f59e0b",
  5102: "#f59e0b",
  5103: "#f59e0b",
  5104: "#f59e0b",
  5105: "#f59e0b",
  5106: "#f59e0b",
  5107: "#f59e0b",
  5108: "#f59e0b",
  5109: "#f59e0b", // מגורי משתכנים
  5110: "#f59e0b",
  5111: "#f59e0b",
  5112: "#f59e0b",
  5113: "#d97706", // מגורים בנחלות

  // חקלאי (Agricultural)
  5120: "#22c55e",
  5121: "#22c55e",
  5122: "#22c55e",
  5123: "#22c55e",
  5124: "#22c55e",
  5125: "#16a34a", // חקלאי משקי

  // מסחרי (Commercial)
  5200: "#3b82f6",
  5201: "#3b82f6",
  5202: "#3b82f6",

  // תעשייה (Industrial)
  5300: "#8b5cf6",
  5301: "#8b5cf6",

  // ציבורי (Public)
  5400: "#ec4899",
  5401: "#ec4899",
  5402: "#ec4899",

  // שטחים פתוחים (Open spaces)
  5500: "#10b981",
  5501: "#10b981",

  // תחבורה / דרכים (Transportation)
  5600: "#6b7280",
  5601: "#6b7280",
};

// Yeud description to category
const YEUD_DESC_COLORS: Record<string, string> = {
  "מגורים": "#f59e0b",
  "חקלאי": "#16a34a",
  "מסחרי": "#3b82f6",
  "תעשייה": "#8b5cf6",
  "ציבורי": "#ec4899",
  "שטח פתוח": "#10b981",
  "דרך": "#6b7280",
  "תחבורה": "#6b7280",
  "ספורט": "#06b6d4",
  "תיירות": "#f97316",
};

export function getYeudColor(yeudCode?: number, yeudDesc?: string): string {
  if (yeudCode && YEUD_COLORS[yeudCode]) return YEUD_COLORS[yeudCode];
  
  // Fallback: match by description keywords
  if (yeudDesc) {
    const desc = yeudDesc.toLowerCase();
    for (const [keyword, color] of Object.entries(YEUD_DESC_COLORS)) {
      if (desc.includes(keyword)) return color;
    }
  }
  
  return "#94a3b8"; // default gray
}

export interface ZoningFeatureSummary {
  migrash: string;
  tabaYeud: string;
  yeudDesc: string;
  yeudCode: number;
  tabaMigra: string;
  helkaArea: number;
  toSite: string;
  internet: string;
  feature: GeoJSON.Feature;
}

export function extractZoningSummaries(data: GeoJSON.FeatureCollection): ZoningFeatureSummary[] {
  return data.features.map((f) => {
    const p = f.properties || {};
    return {
      migrash: String(p.Migrash || ""),
      tabaYeud: String(p.Taba_Yeud || ""),
      yeudDesc: String(p.Yeud_Desc || ""),
      yeudCode: Number(p.Yeud_Code || 0),
      tabaMigra: String(p.Taba_Migra || ""),
      helkaArea: Number(p.Helka_Area || 0),
      toSite: String(p.ToSite || ""),
      internet: String(p.internet || ""),
      feature: f,
    };
  });
}

// Get unique yeud types for filtering
export function getUniqueYeudTypes(summaries: ZoningFeatureSummary[]): string[] {
  const set = new Set(summaries.map((s) => s.yeudDesc).filter(Boolean));
  return Array.from(set).sort((a, b) => a.localeCompare(b, "he"));
}
