"""
Build comprehensive migrash-helka mapping from all available data sources:
1. First Playwright run (helkot 14-46 with data)
2. fetch_webpage confirmations (helkot 58, 64)
3. Confirmed "not found" parcels
4. SOAP API migrash labels for all gushim
"""
import json
import re
from pathlib import Path

OUTPUT_DIR = Path("data")

# ==== Source 1: Playwright scrape data ====
with open("data/complot_kfar_chabad/migrash_data_gush_7188.json", encoding="utf-8") as f:
    pw_data = json.load(f)

mapping = []
not_found = []

for k, v in pw_data.items():
    helka = int(k)
    migrash = v.get("migrash")
    yeud = v.get("yeud", "")
    shetach = v.get("shetach", "")
    
    if not migrash or migrash == "(אין מגרש)" or "תוכנית" in str(migrash):
        not_found.append(helka)
        continue
    
    # Clean migrash value (remove plan reference if embedded)
    migrash_str = str(migrash).strip()
    plan = ""
    
    # Parse "103 (מתוכנית גז/12/525)" format
    m = re.match(r'(\d+(?:\+\d+)?)\s*(?:\(מתוכנית\s*([^)]+)\))?', migrash_str)
    if m:
        migrash_str = m.group(1)
        plan = m.group(2) or ""
    
    # Clean yeud (remove plan ref)
    yeud_clean = re.sub(r'\s*\(מתוכנית\s*[^)]+\)', '', str(yeud)).strip() if yeud else ""
    
    # Clean shetach
    shetach_clean = re.sub(r'[^\d]', '', str(shetach)) if shetach else ""
    
    # Extract plan from yeud if not found elsewhere
    if not plan and yeud:
        m2 = re.search(r'\(מתוכנית\s*([^)]+)\)', str(yeud))
        if m2:
            plan = m2.group(1)
    
    mapping.append({
        "gush": 7188,
        "helka": helka,
        "migrash": migrash_str,
        "plan": plan,
        "yeud": yeud_clean,
        "shetach_sqm": int(shetach_clean) if shetach_clean else None,
        "source": "playwright",
    })

# ==== Source 2: fetch_webpage confirmations ====
fetch_data = [
    {"gush": 7188, "helka": 58, "migrash": "124", "plan": "גז/12/525", "yeud": "מגורים א", "shetach_sqm": 994, "source": "fetch_webpage"},
    {"gush": 7188, "helka": 64, "migrash": "152", "plan": "גז/12/525", "yeud": "מגורים א", "shetach_sqm": 610, "source": "fetch_webpage"},
]

# Add fetch_data if not already in mapping
existing_helkot = {m["helka"] for m in mapping}
for fd in fetch_data:
    if fd["helka"] not in existing_helkot:
        mapping.append(fd)
        print(f"  Added helka {fd['helka']} -> migrash {fd['migrash']} (from fetch_webpage)")

# Sort by helka
mapping.sort(key=lambda x: (x["gush"], x["helka"]))

# ==== Confirmed not found ====
mapped_helkot = {m["helka"] for m in mapping}
# Start with parcels that were explicitly "not found" in the Playwright run + fetch_webpage
confirmed_not_found_base = [47, 48, 49, 51, 52, 53, 57, 69, 71, 76, 79, 80, 81, 82, 83, 84, 89, 93, 100]
# Add from Playwright data (migrash=None entries), but exclude ones we have data for
confirmed_not_found = sorted(set(not_found + confirmed_not_found_base) - mapped_helkot)

# ==== All parcels for gush 7188 from cadastre ====
with open("data/cadastre/parcels_kfar_chabad.geojson", encoding="utf-8") as f:
    cadastre = json.load(f)

all_helkot_7188 = sorted({f["properties"]["PARCEL"] for f in cadastre["features"] if f["properties"]["GUSH_NUM"] == 7188})
not_found_set = set(confirmed_not_found)
unchecked = sorted(set(all_helkot_7188) - mapped_helkot - not_found_set)

# ==== Save mapping ====
output = {
    "metadata": {
        "description": "Helka to Migrash mapping for Kfar Chabad parcels from Complot (sdan.complot.co.il)",
        "sources": [
            "Playwright headless browser scraping of sdan.complot.co.il/gush2/",
            "fetch_webpage tool for individual parcel verification"
        ],
        "primary_plan": "גז/12/525 - קביעת יעודי קרקע כפר חב\"ד (approved 05/07/1987)",
        "gush": 7188,
        "total_parcels_in_cadastre": len(all_helkot_7188),
        "parcels_with_migrash": len(mapping),
        "parcels_not_found": len(confirmed_not_found),
        "parcels_unchecked": len(unchecked),
        "note": "Some parcels could not be checked due to XPA backend rate limiting. These may have migrash data in the Complot system."
    },
    "mapping": mapping,
    "not_found_helkot": confirmed_not_found,
    "unchecked_helkot": unchecked,
}

mapping_path = OUTPUT_DIR / "migrash_helka_mapping.json"
with open(mapping_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

# ==== Also save SOAP migrash labels for all gushim ====
soap_path = Path("data/complot_kfar_chabad/all_migrashim_by_gush.json")
if soap_path.exists():
    with open(soap_path, encoding="utf-8") as f:
        soap_data = json.load(f)
    
    output["other_gushim_migrash_labels"] = {}
    for gush_str, items in sorted(soap_data.items(), key=lambda x: int(x[0])):
        labels = [i["label"].strip() for i in items if i["label"].strip()]
        if labels:
            output["other_gushim_migrash_labels"][gush_str] = labels
    
    # Save enhanced version
    with open(mapping_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

# ==== Print Summary ====
print(f"\n{'='*60}")
print(f"MIGRASH-HELKA MAPPING SUMMARY")
print(f"{'='*60}")
print(f"Gush 7188: {len(all_helkot_7188)} total parcels")
print(f"  With migrash data: {len(mapping)}")
print(f"  Confirmed not found: {len(confirmed_not_found)}")
print(f"  Unchecked: {len(unchecked)}")
print()
print("Parcels with migrash data:")
for m in mapping:
    plan_str = f" (תוכנית {m['plan']})" if m['plan'] else ""
    area_str = f", {m['shetach_sqm']} מ\"ר" if m.get('shetach_sqm') else ""
    print(f"  חלקה {m['helka']:>3} → מגרש {m['migrash']:>3}{plan_str}  [{m['yeud']}{area_str}]")

print(f"\nNot found helkot: {confirmed_not_found}")
print(f"Unchecked helkot: {unchecked}")

# Other gushim with migrash data
gushim_with_data = sum(1 for g, items in soap_data.items() 
                       if any(i["label"].strip() for i in items))
print(f"\nOther gushim with SOAP migrash labels: {gushim_with_data}")
print(f"Saved to: {mapping_path}")
