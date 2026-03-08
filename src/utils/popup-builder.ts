/**
 * Builds beautiful, RTL-aligned, Hebrew-translated popups for GeoJSON features
 */

const FIELD_TRANSLATIONS: Record<string, string> = {
  // Cadastre fields
  LOT_NUM: "גוש",
  PARCEL_NUM: "חלקה",
  GUSH_NUM: "גוש",
  HELKA_NUM: "חלקה",
  OBJECTID: "מזהה",
  OBJECTID1: "מזהה",
  
  // Plan fields
  Migrash: "מגרש",
  migrash: "מגרש",
  MIGRASH: "מגרש",
  TabaYeud: "ייעוד (תב\"ע)",
  YeudDesc: "תיאור ייעוד",
  TabaMigra: "תב\"ע מגרש",
  bikoret: "ביקורת",
  HelkaArea: "שטח חלקה (מ״ר)",
  GushHelka: "גוש-חלקה",
  ToSite: "קישור לאתר",
  
  // Common GIS fields
  Shape_Area: "שטח",
  Shape_Leng: "היקף",
  SHAPE_Area: "שטח",
  SHAPE_Leng: "היקף",
  area: "שטח",
  perimeter: "היקף",
  name: "שם",
  NAME: "שם",
  type: "סוג",
  TYPE: "סוג",
  status: "סטטוס",
  STATUS: "סטטוס",
  description: "תיאור",
  
  // Plan metadata
  plan_number: "מספר תוכנית",
  plan_name: "שם תוכנית",
  plan_status: "סטטוס תוכנית",
};

// Fields to hide (internal/technical)
const HIDDEN_FIELDS = new Set([
  "OBJECTID", "OBJECTID1", "FID", "fid", "id", "ID",
  "Shape_Area", "Shape_Leng", "SHAPE_Area", "SHAPE_Leng",
]);

// Fields that contain URLs
const URL_FIELDS = new Set(["ToSite", "GushHelka"]);

function translateField(key: string): string {
  return FIELD_TRANSLATIONS[key] || key;
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  
  const strVal = String(value);
  
  // Format URLs as clickable links
  if (URL_FIELDS.has(key) || strVal.startsWith("http")) {
    return `<a href="${strVal}" target="_blank" rel="noopener" 
      style="color: hsl(220 60% 40%); text-decoration: underline; word-break: break-all; font-size: 10px;">
      🔗 פתח קישור
    </a>`;
  }
  
  // Format area values
  if (key === "HelkaArea" || key === "area") {
    const num = Number(value);
    if (!isNaN(num)) {
      return `${num.toLocaleString("he-IL")} מ״ר`;
    }
  }
  
  return strVal;
}

export function buildFeaturePopupHTML(properties: Record<string, unknown>): string {
  if (!properties) return "";
  
  const entries = Object.entries(properties)
    .filter(([k, v]) => v !== null && v !== undefined && v !== "" && !HIDDEN_FIELDS.has(k))
    .map(([k, v]) => ({
      label: translateField(k),
      value: formatValue(k, v),
      isUrl: URL_FIELDS.has(k) || String(v).startsWith("http"),
      priority: getPriority(k),
    }))
    .filter(e => e.value)
    .sort((a, b) => a.priority - b.priority);
  
  if (entries.length === 0) return "";
  
  // Build header from key fields
  const gush = properties.LOT_NUM ?? properties.GUSH_NUM ?? properties.gush;
  const helka = properties.PARCEL_NUM ?? properties.HELKA_NUM ?? properties.helka;
  const migrash = properties.Migrash ?? properties.migrash ?? properties.MIGRASH;
  
  let header = "";
  if (gush && helka) {
    header = `<div class="popup-header">גוש ${gush} · חלקה ${helka}</div>`;
  } else if (gush) {
    header = `<div class="popup-header">גוש ${gush}</div>`;
  } else if (migrash) {
    header = `<div class="popup-header">מגרש ${migrash}</div>`;
  }
  
  const rows = entries
    .filter(e => !e.isUrl || entries.length <= 8) // Hide URLs if too many fields
    .slice(0, 12)
    .map(e => `
      <div class="popup-row">
        <span class="popup-label">${e.label}</span>
        <span class="popup-value">${e.value}</span>
      </div>
    `)
    .join("");
  
  // Link row at bottom
  const links = entries.filter(e => e.isUrl);
  const linkRow = links.length > 0 ? `
    <div class="popup-links">
      ${links.map(l => l.value).join(" ")}
    </div>
  ` : "";
  
  return `<div class="gis-popup" dir="rtl">${header}<div class="popup-body">${rows}</div>${linkRow}</div>`;
}

function getPriority(key: string): number {
  const order: Record<string, number> = {
    LOT_NUM: 1, GUSH_NUM: 1, gush: 1,
    PARCEL_NUM: 2, HELKA_NUM: 2, helka: 2,
    Migrash: 3, migrash: 3, MIGRASH: 3,
    TabaYeud: 4, YeudDesc: 5,
    HelkaArea: 6,
    bikoret: 7,
    TabaMigra: 8,
    plan_number: 9, plan_name: 10,
  };
  return order[key] ?? 50;
}
