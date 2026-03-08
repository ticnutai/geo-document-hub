"""Read and display existing migrash data."""
import json

with open("data/complot_kfar_chabad/migrash_data_gush_7188.json", encoding="utf-8") as f:
    d = json.load(f)

for k in sorted(d.keys(), key=int):
    v = d[k]
    m = v.get("migrash", "")
    y = v.get("yeud", "")
    s = v.get("shetach", "")
    has_data = bool(m and m != "(אין מגרש)" and "תוכנית" not in str(m))
    status = "DATA" if has_data else "EMPTY"
    print(f"  Helka {k:>3}: migrash={str(m):>30}  yeud={str(y):>20}  shetach={str(s):>10}  [{status}]")

total = len(d)
with_data = sum(1 for v in d.values() if v.get("migrash") and v["migrash"] != "(אין מגרש)" and "תוכנית" not in str(v.get("migrash", "")))
print(f"\nTotal: {total}, With migrash data: {with_data}")
