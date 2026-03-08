import json

apb = json.load(open('data/all_plans_by_block.json', 'r', encoding='utf-8'))
plans = apb['plans']
old = [v for v in plans.values() if not str(v.get('PL_NUMBER', '')).startswith('425-')]
old.sort(key=lambda x: str(x.get('PL_NUMBER', '')))

print(f"Old-format plans: {len(old)}")
print(f"{'PL_NUMBER':30s} {'MP_ID':15s} STATION_DESC")
print("-" * 80)
for v in old:
    print(f"  {str(v.get('PL_NUMBER','')):28s} {str(v.get('MP_ID','N/A')):15s} {v.get('STATION_DESC','')}")

# Check if any old plans have docs directories
import os
print(f"\nOld plans with docs directories:")
for v in old:
    num = str(v.get('PL_NUMBER', ''))
    # Try various normalizations
    for d in os.listdir('data/docs') if os.path.isdir('data/docs') else []:
        if num.replace(' ', '') in d.replace(' ', '') or d.replace(' ', '') in num.replace(' ', ''):
            print(f"  {num} -> data/docs/{d}")
