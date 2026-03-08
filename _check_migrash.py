import json

with open('data/complot_kfar_chabad/migrash_data_gush_7188.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

with_m = {k: v for k, v in d.items() if v.get('migrash')}
without_m = {k: v for k, v in d.items() if not v.get('migrash')}

print(f'Total: {len(d)} parcels')
print(f'With migrash: {len(with_m)}')
print(f'Without migrash: {len(without_m)}')
print(f'Missing helkot: {sorted([int(k) for k in without_m])}')
print()
print("Helka -> Migrash mapping:")
for k in sorted(with_m.keys(), key=int):
    v = with_m[k]
    print(f'  Helka {k:>3} -> {v["migrash"]}')
