import json, glob, os

DATA = 'data'

# 1. Check migrash data for gush 6261
with open(f'{DATA}/migrash_helka_mapping.json','r',encoding='utf-8') as f:
    data = json.load(f)
m = [x for x in data.get('mapping',[]) if x.get('gush')==6261]
print(f'=== Migrashim in gush 6261: {len(m)} ===')
for x in m[:15]:
    print(f'  helka={x["helka"]} migrash={x["migrash"]} plan={x["plan"]} yeud={x["yeud"]}')

h27 = [x for x in m if x.get('helka')==27]
print(f'\n=== Migrashim for gush 6261 helka 27: {len(h27)} ===')
for x in h27: print(f'  {x}')

# 2. Search in all_plans_by_block.json
with open(f'{DATA}/all_plans_by_block.json','r',encoding='utf-8') as f:
    plans_by_block = json.load(f)

print(f'\n=== Plans for block 6261 ===')
if '6261' in plans_by_block:
    for p in plans_by_block['6261'][:30]:
        num = p.get('pl_number','') or p.get('number','')
        name = p.get('pl_name','') or p.get('name','')
        print(f"  {num} - {name}")

# 3. Search for "696" plans
print(f'\n=== Plans with 696 in any block ===')
for blk, plist in plans_by_block.items():
    for p in plist:
        num = p.get('pl_number','') or p.get('number','')
        if '696' in num:
            print(f"  block {blk}: {num} - {p.get('pl_name','') or p.get('name','')}")

# 4. Search for "תשרצ" plans
print(f'\n=== Plans with תשרצ ===')
for blk, plist in plans_by_block.items():
    for p in plist:
        num = p.get('pl_number','') or p.get('number','')
        name = p.get('pl_name','') or p.get('name','')
        if 'תשרצ' in num or 'תשרצ' in name:
            print(f"  block {blk}: {num} - {name}")

# 5. Check blocks_parcels_by_plan.json
with open(f'{DATA}/blocks_parcels_by_plan.json','r',encoding='utf-8') as f:
    bp_plan = json.load(f)
print(f'\n=== Plans in blocks_parcels_by_plan with 696 ===')
for pnum, info in bp_plan.items():
    if '696' in pnum:
        print(f"  {pnum} -> blocks: {list(info.keys()) if isinstance(info, dict) else 'N/A'}")

# 6. Check what plans have gush 6261 helka 27
print(f'\n=== Plans with gush 6261 helka 27 ===')
for pnum, blocks_data in bp_plan.items():
    if isinstance(blocks_data, dict) and '6261' in blocks_data:
        bd = blocks_data['6261']
        parcels = bd.get('parcels','') if isinstance(bd,dict) else ''
        if '27' in str(parcels).split(','):
            print(f"  {pnum} - parcels: {parcels}")

# 7. Check taba geojson for 696
with open(f'{DATA}/taba_kfar_chabad.geojson','r',encoding='utf-8') as f:
    taba = json.load(f)
print(f'\n=== Taba plans with 696 ===')
for feat in taba.get('features',[]):
    props = feat.get('properties',{})
    num = props.get('pl_number','')
    if '696' in num:
        print(f"  {num} - {props.get('pl_name','')}")
