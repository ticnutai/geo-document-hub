/**
 * Generates and opens a printable planning information sheet from feature properties
 */

const FIELD_LABELS: Record<string, string> = {
  LOT_NUM: "גוש", PARCEL_NUM: "חלקה", GUSH_NUM: "גוש", HELKA_NUM: "חלקה",
  GUSH_SUFFI: "סיומת גוש", CALC_AREA: "שטח מחושב (מ״ר)", LEGAL_AREA: "שטח רשום (מ״ר)",
  Migrash: "מגרש", migrash: "מגרש", MIGRASH: "מגרש",
  TabaYeud: 'ייעוד (תב"ע)', Taba_Yeud: 'תב"ע ייעוד', YeudDesc: "תיאור ייעוד",
  Yeud_Desc: "תיאור ייעוד", Yeud_Code: "קוד ייעוד",
  TabaMigra: 'תב"ע מגרש', Taba_Migra: 'תב"ע מגרש',
  bikoret: "ביקורת", HelkaArea: "שטח חלקה (מ״ר)", Helka_Area: "שטח חלקה (מ״ר)",
  GushHelka: "גוש-חלקה", ToSite: "קישור לאתר", internet: "קישור למידע",
  PLAN_NAME: "שם תוכנית", MAVAT_NAME: "שם מאבט",
  Descriptio: "תיאור", yeshuv: "ישוב", subtype: "תת-סוג", phone: "טלפון",
  yeud: "ייעוד", mamad: "ממ״ד", helka: "חלקה", gush: "גוש",
  name: "שם", NAME: "שם", type: "סוג", status: "סטטוס", STATUS: "סטטוס",
  description: "תיאור", LABEL: "תווית", ADDRESS: "כתובת",
  SHAPE_AREA: "שטח (מ״ר)", SHAPE_LEN: "היקף (מ׳)",
  REMARKS: "הערות", DATE_DEC: "תאריך החלטה", STAGE: "שלב",
  plan_number: "מספר תוכנית", plan_name: "שם תוכנית", plan_status: "סטטוס תוכנית",
  "גוש": "גוש", "חלקה": "חלקה", "שם": "שם", "ישוב": "ישוב", "כתובת": "כתובת",
  "סטטוס": "סטטוס", "הערות": "הערות",
};

const SKIP_FIELDS = new Set([
  "OBJECTID", "OBJECTID1", "OBJECTID_1", "FID", "fid", "id", "ID",
  "LAYER_ID", "GROUP_ID", "DEFQ", "AGAM_ID", "VER_ID",
  "TYPE_CODE", "Type_Code", "SOURCE_COD", "IS_ANALITY",
  "FONT_SIZE", "ROTATION", "BLOCKNAME", "PAGE_SIZE",
  "SCENARIO", "PL_CHANGE", "PLACE_NO",
  "TAGNAME1", "TAGNAME2", "TAGNAME3",
  "VALUE1", "VALUE2", "VALUE3", "DATA_DATE", "MAVAT_CODE",
  "X", "Y",
]);

function getTitle(props: Record<string, unknown>): string {
  const gush = props.LOT_NUM ?? props.GUSH_NUM ?? props.gush ?? props["גוש"];
  const helka = props.PARCEL_NUM ?? props.HELKA_NUM ?? props.helka ?? props["חלקה"];
  const migrash = props.Migrash ?? props.migrash ?? props.MIGRASH;
  if (gush && helka) return `גוש ${gush} · חלקה ${helka}`;
  if (migrash) return `מגרש ${migrash}`;
  return String(props.Descriptio ?? props["שם"] ?? props.NAME ?? props.name ?? "ישות");
}

export function generatePlanningSheet(properties: Record<string, unknown>) {
  const title = getTitle(properties);
  const date = new Date().toLocaleDateString("he-IL");

  const rows = Object.entries(properties)
    .filter(([k, v]) => v !== null && v !== undefined && v !== "" && !SKIP_FIELDS.has(k))
    .filter(([, v]) => !(typeof v === "number" && v === 0))
    .map(([k, v]) => {
      const label = FIELD_LABELS[k] || k;
      let val = String(v).trim();
      if (!val) return null;
      // Format URLs
      if (val.startsWith("http")) {
        val = `<a href="${val}" target="_blank" style="color:#1a56db">${val}</a>`;
      }
      // Format areas
      if ((k.includes("Area") || k.includes("AREA")) && !isNaN(Number(v)) && Number(v) > 0) {
        val = `${Number(v).toLocaleString("he-IL", { maximumFractionDigits: 1 })} מ״ר`;
      }
      return { label, val };
    })
    .filter(Boolean) as { label: string; val: string }[];

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<title>דף מידע תכנוני - ${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
    padding: 40px; 
    color: #1a1a2e; 
    background: #fff;
    max-width: 800px;
    margin: 0 auto;
  }
  .header { 
    background: linear-gradient(135deg, #1e3a5f, #2a5298); 
    color: white; 
    padding: 24px 32px; 
    border-radius: 12px; 
    margin-bottom: 24px; 
  }
  .header h1 { font-size: 22px; margin-bottom: 4px; }
  .header .sub { font-size: 12px; opacity: 0.8; }
  .meta { 
    display: flex; justify-content: space-between; 
    font-size: 11px; color: #666; 
    margin-bottom: 16px; padding: 0 4px; 
  }
  table { 
    width: 100%; 
    border-collapse: collapse; 
    border: 1px solid #e0e0e0; 
    border-radius: 8px; 
    overflow: hidden; 
  }
  th, td { 
    padding: 10px 16px; 
    text-align: right; 
    font-size: 13px; 
    border-bottom: 1px solid #eee; 
  }
  th { 
    background: #f0f4f8; 
    font-weight: 600; 
    color: #1e3a5f; 
    width: 160px; 
  }
  tr:nth-child(even) { background: #fafbfc; }
  tr:last-child th, tr:last-child td { border-bottom: none; }
  a { color: #1a56db; text-decoration: underline; }
  .footer { 
    margin-top: 24px; 
    padding-top: 16px; 
    border-top: 1px solid #eee; 
    font-size: 10px; 
    color: #999; 
    text-align: center; 
  }
  .actions { 
    margin-top: 20px; 
    text-align: center; 
  }
  .actions button {
    background: #1e3a5f;
    color: white;
    border: none;
    padding: 10px 28px;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
  }
  .actions button:hover { background: #2a5298; }
  @media print { 
    .actions { display: none; }
    body { padding: 20px; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>📋 דף מידע תכנוני</h1>
    <div class="sub">${title}</div>
  </div>
  <div class="meta">
    <span>תאריך הפקה: ${date}</span>
    <span>GIS Pro | מערכת מידע גיאוגרפי</span>
  </div>
  <table>
    ${rows.map(r => `<tr><th>${r.label}</th><td>${r.val}</td></tr>`).join("")}
  </table>
  <div class="actions">
    <button onclick="window.print()">🖨️ הדפס / שמור כ-PDF</button>
  </div>
  <div class="footer">
    הופק אוטומטית ממערכת GIS Pro · המידע להתרשמות בלבד ואינו מהווה תחליף לבדיקה מול הרשויות
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
