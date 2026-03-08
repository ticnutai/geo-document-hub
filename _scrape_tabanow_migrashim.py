"""Scrape migrash (parcel subdivision) data from tabanow.co.il for plan גז/12/525"""
import json, re, urllib.request
from pathlib import Path

DATA = Path("data")

# The tabanow page is rendered on the server side, so we can use simple HTTP
url = "https://www.tabanow.co.il/%D7%AA%D7%91%D7%A2/%D7%A9%D7%93%D7%95%D7%AA%20%D7%93%D7%9F/%D7%92%D7%96/12/525"

print("Fetching tabanow page for plan גז/12/525...")
req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
})
with urllib.request.urlopen(req, timeout=30) as resp:
    html = resp.read().decode("utf-8")
print(f"Got {len(html)} bytes")

# Parse migrash table - it has columns: מגרש, ייעוד, שטח (דונם), מגורים (מ"ר), יח"ד, לא מגורים (מ"ר)
# Find the table after the heading "מגרשים"
migrash_section = html.split('מגרשים</h3>')
if len(migrash_section) < 2:
    migrash_section = html.split('מגרשים</')
if len(migrash_section) < 2:
    print("Could not find migrash section")
    # Try finding table with migrash header
    idx = html.find('>מגרש<')
    if idx > 0:
        migrash_section = ['', html[idx-2000:]]
    else:
        exit(1)

table_html = migrash_section[-1]  
# Find first <table after the heading
table_start = table_html.find('<table')
if table_start < 0:
    print("No table found after migrash heading")
    exit(1)
    
table_end = table_html.find('</table>', table_start)
table_html = table_html[table_start:table_end+8]

# Parse rows
row_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL)
cell_pattern = re.compile(r'<td[^>]*>(.*?)</td>', re.DOTALL)
tag_strip = re.compile(r'<[^>]+>')

migrashim = []
for row_match in row_pattern.finditer(table_html):
    row_html = row_match.group(1)
    cells = cell_pattern.findall(row_html)
    if len(cells) < 3:
        continue
    vals = [tag_strip.sub('', c).strip() for c in cells]
    migrash_num = vals[0]
    yeud = vals[1]
    shetach_dunam = vals[2] if len(vals) > 2 else ''
    megurim_sqm = vals[3] if len(vals) > 3 else ''
    yehidot = vals[4] if len(vals) > 4 else ''
    lo_megurim = vals[5] if len(vals) > 5 else ''
    
    if not migrash_num:
        continue
    
    try:
        sd = float(shetach_dunam.replace(',','')) if shetach_dunam else 0
    except:
        sd = 0
    try:
        ms = int(megurim_sqm.replace(',','')) if megurim_sqm else 0
    except:
        ms = 0
    try:
        yd = int(yehidot.replace(',','')) if yehidot else 0
    except:
        yd = 0
    try:
        lm = int(lo_megurim.replace(',','')) if lo_megurim else 0
    except:
        lm = 0
    
    migrashim.append({
        "migrash": migrash_num,
        "yeud": yeud,
        "shetach_dunam": sd,
        "shetach_sqm": round(sd * 1000),
        "megurim_sqm": ms,
        "yehidot_diur": yd,
        "lo_megurim_sqm": lm,
        "plan": "גז/12/525",
        "source": "tabanow"
    })

print(f"\nExtracted {len(migrashim)} migrashim from tabanow")
print(f"Yeud types: {set(m['yeud'] for m in migrashim)}")

# Save raw tabanow data
out_file = DATA / "tabanow_migrashim_gz12_525.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump({"plan": "גז/12/525", "source": "tabanow", "count": len(migrashim), "migrashim": migrashim}, f, ensure_ascii=False, indent=2)
print(f"Saved to {out_file}")

# Now merge into migrash_helka_mapping.json
# The existing mapping links migrash to gush/helka
# The tabanow data has migrash details but NO gush/helka mapping
# So we need to ADD these migrashim to the mapping WITHOUT gush/helka (they'll be linked by migrash number)

# Let's also check which migrashim we already have mapped to gush/helka
mapping_file = DATA / "migrash_helka_mapping.json"
with open(mapping_file, "r", encoding="utf-8") as f:
    existing = json.load(f)

existing_migrashim = set()
for m in existing.get("mapping", []):
    if m.get("plan") == "גז/12/525":
        existing_migrashim.add(m.get("migrash"))

tabanow_migrashim = set(m["migrash"] for m in migrashim)
print(f"\nExisting mapped migrashim: {len(existing_migrashim)}")
print(f"Tabanow migrashim: {len(tabanow_migrashim)}")
print(f"New in tabanow: {len(tabanow_migrashim - existing_migrashim)}")
print(f"In both: {len(tabanow_migrashim & existing_migrashim)}")

# Update existing entries with richer tabanow data
tabanow_lookup = {m["migrash"]: m for m in migrashim}
updated = 0
for m in existing["mapping"]:
    if m.get("plan") == "גז/12/525" and m.get("migrash") in tabanow_lookup:
        tb = tabanow_lookup[m["migrash"]]
        if not m.get("yeud") or m["yeud"] == "מגורים א":
            m["yeud"] = tb["yeud"]
        if tb.get("shetach_dunam"):
            m["shetach_dunam"] = tb["shetach_dunam"]
        if tb.get("shetach_sqm") and (not m.get("shetach_sqm") or abs(m["shetach_sqm"] - tb["shetach_sqm"]) > 100):
            m["shetach_sqm"] = tb["shetach_sqm"]
        if tb.get("megurim_sqm"):
            m["megurim_sqm"] = tb["megurim_sqm"]
        if tb.get("yehidot_diur"):
            m["yehidot_diur"] = tb["yehidot_diur"]
        updated += 1

print(f"Updated {updated} existing entries with tabanow data")

# Save updated mapping
with open(mapping_file, "w", encoding="utf-8") as f:
    json.dump(existing, f, ensure_ascii=False, indent=2)
print(f"Updated {mapping_file}")

# Print some stats
for ytype in sorted(set(m["yeud"] for m in migrashim)):
    count = sum(1 for m in migrashim if m["yeud"] == ytype)
    print(f"  {ytype}: {count}")
