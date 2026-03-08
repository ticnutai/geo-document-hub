import os, json

# MMG directories
mmg = 'data/mmg'
if os.path.isdir(mmg):
    print("=== MMG directories ===")
    for d in sorted(os.listdir(mmg)):
        p = os.path.join(mmg, d)
        if os.path.isdir(p):
            files = os.listdir(p)
            gj = [f for f in files if f.endswith('.geojson')]
            print(f"  {d}: {len(gj)} geojson files: {gj}")
        elif d.endswith('.json'):
            with open(p, 'r', encoding='utf-8') as fh:
                data = json.load(fh)
            print(f"  {d}: {len(data)} entries")

# Check docs directories for SHP zips
docs = 'data/docs'
if os.path.isdir(docs):
    print("\n=== Docs directories with ZIP files ===")
    count = 0
    for d in sorted(os.listdir(docs)):
        p = os.path.join(docs, d)
        if os.path.isdir(p):
            zips = [f for f in os.listdir(p) if f.endswith('.zip')]
            if zips:
                count += 1
                print(f"  {d}: {zips}")
    print(f"Total docs dirs with zips: {count}")

# Summary of all_plans_by_block
print("\n=== all_plans_by_block summary ===")
with open('data/all_plans_by_block.json', 'r', encoding='utf-8') as f:
    apb = json.load(f)
plans = apb.get('plans', {})
old_plans = {k:v for k,v in plans.items() if not v.get('PL_NUMBER','').startswith('425-')}
new_plans = {k:v for k,v in plans.items() if v.get('PL_NUMBER','').startswith('425-')}
print(f"Total plans: {len(plans)}")
print(f"Modern (425-*): {len(new_plans)}")
print(f"Old format: {len(old_plans)}")
print("\nOld format plan numbers and MP_IDs:")
for k, v in sorted(old_plans.items(), key=lambda x: x[1].get('PL_NUMBER','')):
    print(f"  {v.get('PL_NUMBER',''):25s}  MP_ID={v.get('MP_ID','N/A'):15s}  Station={v.get('STATION_DESC','')}")
