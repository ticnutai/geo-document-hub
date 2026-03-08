import json, glob

all_blocks = {}
for f in glob.glob('data/docs/*/_plan_data.json'):
    with open(f, 'r', encoding='utf-8') as fp:
        data = json.load(fp)
    
    pd = data.get('planDetails', {})
    plan_num = pd.get('PL_NUMBER', '') or f.split('\\')[-2]
    
    blocks = data.get('rsBlocks', [])
    for b in blocks:
        block_str = b.get('BLOCKS', '')
        pw = b.get('PARCELS_WHOLE', '')
        pp = b.get('PARCELS_PARTIAL', '')
        print(f'Plan {plan_num}: BLOCKS="{block_str}" WHOLE="{pw}" PARTIAL="{pp}"')
        if block_str:
            all_blocks.setdefault(block_str, []).append(plan_num)

print(f'\nAll unique block values: {sorted(all_blocks.keys())}')
print(f'Total unique blocks: {len(all_blocks)}')
for bk in sorted(all_blocks.keys()):
    print(f'  Block {bk}: {len(all_blocks[bk])} plans')
