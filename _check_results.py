import json
with open('data/all_plans_by_block.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
print(f"Total unique plans: {data['total_unique_plans']}")
print(f"New plans: {data['new_plans_count']}")
print(f"Existing: {data['existing_plans_count']}")
print(f"Blocks with data: {list(data['block_plan_map'].keys())}")
for b in ['6260','6261','6262']:
    if b in data['block_plan_map']:
        print(f"Block {b}: {len(data['block_plan_map'][b])} plans")
    else:
        print(f"Block {b}: MISSING")
print(f"\nNew plan numbers: {data.get('new_plan_numbers', [])}")
