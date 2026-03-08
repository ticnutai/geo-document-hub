import json

d = json.load(open('data/all_plans_by_block.json', 'r', encoding='utf-8'))
plans = d['plans']
new_plans = d['new_plan_numbers']

print(f"New plans: {len(new_plans)}")
zero_mp = []
for pn in sorted(new_plans):
    mp_id = plans[pn].get("MP_ID", "N/A")
    print(f"  {pn}: MP_ID={mp_id}")
    if not mp_id or mp_id == 0 or mp_id == "0":
        zero_mp.append(pn)

if zero_mp:
    print(f"\nPlans with no MP_ID: {zero_mp}")
else:
    print("\nAll plans have valid MP_IDs")
