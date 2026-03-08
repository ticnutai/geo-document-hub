/**
 * Builds beautiful, RTL-aligned, Hebrew-translated popups for GeoJSON features
 */

const FIELD_TRANSLATIONS: Record<string, string> = {
  // Cadastre fields
  LOT_NUM: "גוש",
  PARCEL_NUM: "חלקה",
  GUSH_NUM: "גוש",
  HELKA_NUM: "חלקה",
  GUSH_SUFFI: "סיומת גוש",
  CALC_AREA: "שטח מחושב (מ״ר)",
  LEGAL_AREA: "שטח רשום (מ״ר)",
  STATUS_NAM: "שם סטטוס",
  IS_ANALITY: "אנליטי",

  // Plan / Zoning fields
  Migrash: "מגרש",
  migrash: "מגרש",
  MIGRASH: "מגרש",
  TabaYeud: 'ייעוד (תב"ע)',
  Taba_Yeud: 'תב"ע ייעוד',
  YeudDesc: "תיאור ייעוד",
  Yeud_Desc: "תיאור ייעוד",
  Yeud_Code: "קוד ייעוד",
  TabaMigra: 'תב"ע מגרש',
  Taba_Migra: 'תב"ע מגרש',
  bikoret: "ביקורת",
  HelkaArea: "שטח חלקה (מ״ר)",
  Helka_Area: "שטח חלקה (מ״ר)",
  GushHelka: "גוש-חלקה",
  ToSite: "קישור לאתר",
  internet: "קישור למידע",
  PLAN_NAME: "שם תוכנית",
  MAVAT_NAME: "שם מאבט",
  MAVAT_CODE: "קוד מאבט",

  // GISNet layer fields
  Descriptio: "תיאור",
  yeshuv: "ישוב",
  subtype: "תת-סוג",
  phone: "טלפון",
  layer_n: "שכבה",
  yeud: "ייעוד",
  mamad: "ממ״ד",
  helka: "חלקה",
  gush: "גוש",

  // Municipal / Administrative fields
  Muni_Heb: "רשות מקומית",
  Muni_H: "רשות מקומית",
  MUNI_HEB: "רשות מקומית",
  Sug_Muni: "סוג רשות",
  SUG_MUNI: "סוג רשות",
  Vaad_Heb: "ועד מקומי",
  VAAD_HEB: "ועד מקומי",
  Machoz: "מחוז",
  MACHOZ: "מחוז",
  Nafa: "נפה",
  NAFA: "נפה",
  Nafa1: "נפה",
  Moatza: "מועצה אזורית",
  MOATZA: "מועצה אזורית",
  Shem_Yeshu: "שם ישוב",
  SHEM_YESHU: "שם ישוב",
  Cod_Yeshuv: "קוד ישוב",
  Semel_Yesh: "סמל ישוב",
  SEMEL_YESH: "סמל ישוב",
  Cod_Moatza: "קוד מועצה",
  COD_MOATZA: "קוד מועצה",
  Cod_Nafa: "קוד נפה",
  COD_NAFA: "קוד נפה",
  Pop_Total: "אוכלוסייה",
  Shape_STAr: "שטח (מ״ר)",
  Shape_STLe: "היקף (מ׳)",
  OBJECTID_12: "מזהה",
  Shem_Moatz: "שם מועצה",

  // Hebrew field names (already in Hebrew but need mapping)
  "מס_": "מספר",
  "מס__הג": "מספר הגנה",
  "שם": "שם",
  "ישוב": "ישוב",
  "כתובת": "כתובת",
  "גוש": "גוש",
  "חלקה": "חלקה",
  "סטטוס": "סטטוס",
  "הערות": "הערות",

  // Common GIS fields
  Shape_Area: "שטח",
  Shape_Leng: "היקף",
  SHAPE_Area: "שטח",
  SHAPE_Leng: "היקף",
  SHAPE_AREA: "שטח (מ״ר)",
  SHAPE_LEN: "היקף (מ׳)",
  area: "שטח",
  perimeter: "היקף",
  name: "שם",
  NAME: "שם",
  type: "סוג",
  TYPE: "סוג",
  status: "סטטוס",
  STATUS: "סטטוס",
  description: "תיאור",
  LABEL: "תווית",
  ADDRESS: "כתובת",
  LENGTH: "אורך",
  WIDTH: "רוחב",
  REMARKS: "הערות",
  DATE_DEC: "תאריך החלטה",
  STAGE: "שלב",
  SCALE: "קנ״מ",
  PAGE: "עמוד",
  PAGES: "עמודים",

  // Plan metadata
  plan_number: "מספר תוכנית",
  plan_name: "שם תוכנית",
  plan_status: "סטטוס תוכנית",
};

// Fields to hide (internal/technical)
const HIDDEN_FIELDS = new Set([
  "OBJECTID", "OBJECTID1", "OBJECTID_1", "FID", "fid", "id", "ID",
  "Shape_Area", "Shape_Leng", "SHAPE_Area", "SHAPE_Leng",
  "LAYER_ID", "GROUP_ID", "DEFQ", "AGAM_ID", "VER_ID",
  "TYPE_CODE", "Type_Code", "SOURCE_COD", "IS_ANALITY",
  "FONT_SIZE", "ROTATION", "BLOCKNAME", "PAGE_SIZE",
  "SCENARIO", "PL_CHANGE", "PLACE_NO",
  "TAGNAME1", "TAGNAME2", "TAGNAME3",
  "VALUE1", "VALUE2", "VALUE3",
  "DATA_DATE", "MAVAT_CODE",
  "X", "Y",
]);

// Fields that contain URLs
const URL_FIELDS = new Set(["ToSite", "GushHelka", "internet"]);

function translateField(key: string): string {
  return FIELD_TRANSLATIONS[key] || key;
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  const strVal = String(value).trim();
  if (!strVal) return "";

  // Format URLs as clickable links
  if (URL_FIELDS.has(key) || strVal.startsWith("http")) {
    return `<a href="${strVal}" target="_blank" rel="noopener" 
      style="color: hsl(220 60% 40%); text-decoration: underline; word-break: break-all; font-size: 10px;">
      🔗 פתח קישור
    </a>`;
  }

  // Format area values
  if (key === "HelkaArea" || key === "Helka_Area" || key === "area" || key === "CALC_AREA" || key === "LEGAL_AREA" || key === "SHAPE_AREA") {
    const num = Number(value);
    if (!isNaN(num) && num > 0) {
      return `${num.toLocaleString("he-IL", { maximumFractionDigits: 1 })} מ״ר`;
    }
  }

  // Format length values
  if (key === "SHAPE_LEN" || key === "LENGTH") {
    const num = Number(value);
    if (!isNaN(num) && num > 0) {
      return `${num.toLocaleString("he-IL", { maximumFractionDigits: 1 })} מ׳`;
    }
  }

  // Skip zero/empty numeric values for technical fields
  if (typeof value === "number" && value === 0) return "";

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
  const gush = properties.LOT_NUM ?? properties.GUSH_NUM ?? properties.gush ?? properties["גוש"];
  const helka = properties.PARCEL_NUM ?? properties.HELKA_NUM ?? properties.helka ?? properties["חלקה"];
  const migrash = properties.Migrash ?? properties.migrash ?? properties.MIGRASH;
  const desc = properties.Descriptio ?? properties["שם"];

  let header = "";
  if (gush && helka) {
    header = `<div class="popup-header">גוש ${gush} · חלקה ${helka}</div>`;
  } else if (gush) {
    header = `<div class="popup-header">גוש ${gush}</div>`;
  } else if (migrash) {
    header = `<div class="popup-header">מגרש ${migrash}</div>`;
  } else if (desc) {
    header = `<div class="popup-header">${String(desc)}</div>`;
  }

  const rows = entries
    .filter(e => !e.isUrl || entries.length <= 8)
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

  // Add planning sheet download button with inline onclick that stores data globally
  const dataKey = `_gis_feat_${Date.now()}`;
  (window as any)[dataKey] = properties;
  const downloadBtn = `
    <div style="margin-top:6px;text-align:center;">
      <button onclick="(function(){var p=window['${dataKey}'];if(p&&window.__gisPlanningSheet){window.__gisPlanningSheet(p)}})()" 
        style="background:linear-gradient(135deg,#1e3a5f,#2a5298);color:#fff;border:none;padding:5px 14px;border-radius:6px;font-size:11px;cursor:pointer;font-family:inherit;">
        📋 הורד דף מידע תכנוני
      </button>
    </div>`;

  return `<div class="gis-popup" dir="rtl">${header}<div class="popup-body">${rows}</div>${linkRow}${downloadBtn}</div>`;
}

function getPriority(key: string): number {
  const order: Record<string, number> = {
    LOT_NUM: 1, GUSH_NUM: 1, gush: 1, "גוש": 1,
    PARCEL_NUM: 2, HELKA_NUM: 2, helka: 2, "חלקה": 2,
    Migrash: 3, migrash: 3, MIGRASH: 3,
    Yeud_Desc: 4, YeudDesc: 4, TabaYeud: 4, Taba_Yeud: 4.5,
    Descriptio: 5, "שם": 5,
    yeshuv: 6, "ישוב": 6,
    Yeud_Code: 6.5,
    TabaMigra: 7, Taba_Migra: 7,
    HelkaArea: 8, Helka_Area: 8, CALC_AREA: 8,
    "כתובת": 9, ADDRESS: 9,
    subtype: 10,
    mamad: 11,
    bikoret: 12,
    phone: 14,
    PLAN_NAME: 15, plan_number: 15, plan_name: 16,
    MAVAT_NAME: 17,
    LABEL: 18,
    REMARKS: 19, "הערות": 19,
    internet: 20, ToSite: 20,
  };
  return order[key] ?? 50;
}
