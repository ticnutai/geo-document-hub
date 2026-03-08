import json, re

# Check blocks_parcels_by_plan.json for plan gz/525/12
with open('data/blocks_parcels_by_plan.json', encoding='utf-8') as f:
    bp = json.load(f)

def flex(s):
    return re.sub(r'[\s/_\-]+', '', s)

target = flex('גז/525/12')
results = []
for gush, entries in bp.items():
    for e in entries:
        if flex(e.get('plan', '')) == target:
            results.append((gush, e))

print(f'Found {len(results)} block entries for gz/525/12:')
for g, e in results:
    print(f'  Gush {g}: whole=[{e.get("parcels_whole","")}], partial=[{e.get("parcels_partial","")}]')

# Also check how many parcels we have geometry for in _parcels_by_gush
with open('data/cadastre/parcels_kfar_chabad.geojson', encoding='utf-8') as f:
    pdata = json.load(f)

gush_set = set(g for g, _ in results)
print(f'\nGush blocks involved: {sorted(gush_set)}')
for g in sorted(gush_set):
    count = sum(1 for feat in pdata['features'] if str(int(feat['properties'].get('GUSH_NUM', 0))) == g)
    print(f'  Gush {g}: {count} parcels in cadastre GeoJSON')

# Check migrash data
with open('data/migrash_helka_mapping.json', encoding='utf-8') as f:
    md = json.load(f)
print(f'\nMigrash mapping: {len(md.get("mapping",[]))} entries, gush={md.get("metadata",{}).get("gush")}')
print(f'Other gushim migrash labels: {len(md.get("other_gushim_migrash_labels",{}))} gushim')
