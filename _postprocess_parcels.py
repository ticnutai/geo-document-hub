"""Post-process downloaded GIS-NET parcel data for quality."""
import json
import os
import sys
import io
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

DIR = "data/gisnet_layers"

# 1. Fix L8: rename THICKNESS to GUSH_NUM
print("1. Fixing L8 field names...")
d8 = json.load(open(f"{DIR}/L8_P7_גושים.geojson", "r", encoding="utf-8"))
for f in d8["features"]:
    props = f["properties"]
    if "THICKNESS" in props:
        props["GUSH_NUM"] = props.pop("THICKNESS")
with open(f"{DIR}/L8_P7_גושים.geojson", "w", encoding="utf-8") as fp:
    json.dump(d8, fp, ensure_ascii=False)
print(f"   Fixed {len(d8['features'])} features: THICKNESS -> GUSH_NUM")

# 2. Filter L21 to Kfar Chabad wider area
print("\n2. Filtering L21 to Kfar Chabad area...")
d21 = json.load(open(f"{DIR}/L21_P13_מספרי_מגרשים.geojson", "r", encoding="utf-8"))
total = len(d21["features"])

kc_features = []
for f in d21["features"]:
    coords = f["geometry"]["coordinates"]
    lon, lat = coords[0], coords[1]
    # Wider Kfar Chabad area (covers all related plans)
    if 34.84 <= lon <= 34.98 and 31.91 <= lat <= 32.03:
        kc_features.append(f)

d21_filtered = {"type": "FeatureCollection", "name": "מספרי_מגרשים", "features": kc_features}
with open(f"{DIR}/L21_P13_מספרי_מגרשים.geojson", "w", encoding="utf-8") as fp:
    json.dump(d21_filtered, fp, ensure_ascii=False)
sz = os.path.getsize(f"{DIR}/L21_P13_מספרי_מגרשים.geojson")
print(f"   Total: {total} -> Filtered: {len(kc_features)} features ({sz:,} bytes)")

# Show TABA distribution
tabas = Counter()
for f in kc_features:
    t = f["properties"].get("TABA", "")
    tabas[t] += 1
top = tabas.most_common(15)
print("   Top TABAs in KC area:")
for t, c in top:
    print(f"     {t}: {c} migrashim")

# 3. Full inventory of all parcel/plot layers
print("\n3. Final inventory of parcel/plot layers:")
layers = [
    ("L8_P7_גושים.geojson", "גושים (GIS-NET blocks)"),
    ("L9_P7_חלקות.geojson", "חלקות (GIS-NET parcels)"),
    ("L20_P13_גבולות_מגרש_תבע.geojson", "גבולות מגרש תב\"ע (plot boundaries)"),
    ("L21_P13_מספרי_מגרשים.geojson", "מספרי מגרשים (plot number labels)"),
    ("L25_P13_חלקות_מקור.geojson", "חלקות מקור (source parcels)"),
]
for fname, desc in layers:
    path = f"{DIR}/{fname}"
    if os.path.exists(path):
        d = json.load(open(path, "r", encoding="utf-8"))
        n = len(d["features"])
        sz = os.path.getsize(path)
        props = sorted(d["features"][0]["properties"].keys()) if n > 0 else []
        print(f"   {fname}")
        print(f"     {desc}")
        print(f"     {n} features, {sz:,} bytes")
        print(f"     Fields: {props}")
    else:
        print(f"   {fname} — NOT FOUND")

# Also show cadastre data
print("\n4. Government cadastre (comparison):")
for fname in ["blocks_kfar_chabad.geojson", "parcels_kfar_chabad.geojson"]:
    path = f"data/cadastre/{fname}"
    if os.path.exists(path):
        d = json.load(open(path, "r", encoding="utf-8"))
        n = len(d["features"])
        sz = os.path.getsize(path)
        print(f"   {fname}: {n} features, {sz:,} bytes")

print("\nDone!")
