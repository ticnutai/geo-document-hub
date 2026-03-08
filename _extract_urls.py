"""Extract plan URLs and IDs from the GeoJSON file."""
import json

with open("data/taba_kfar_chabad.geojson", "r", encoding="utf-8") as f:
    data = json.load(f)

for feat in data["features"]:
    p = feat["properties"]
    print(f"mp_id={p.get('mp_id')}  pl_id={p.get('pl_id')}  num={p.get('pl_number')}  url={p.get('pl_url')}")
