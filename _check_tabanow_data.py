import json, os
p = 'data/tabanow_all_plans.json'
d = json.load(open(p, 'r', encoding='utf-8'))
print(f'File: {os.path.getsize(p)/1024:.0f} KB')
print(f'Plans: {len(d["plans"])}')
print(f'Stats: {d["stats"]}')

plans = d['plans']
mg_plans = [(n, len(p['migrashim'])) for n, p in plans.items() if p['migrashim']]
mg_plans.sort(key=lambda x: -x[1])
print(f'\nPlans with migrashim: {len(mg_plans)}')
print('Top 20:')
for n, c in mg_plans[:20]:
    print(f'  {n}: {c} migrashim')

# Check general info fields
fields = set()
for plan in plans.values():
    fields.update(plan.get('general', {}).keys())
print(f'\nGeneral info fields ({len(fields)}):')
for f in sorted(fields):
    print(f'  {f}')

# Check gush/helka
gh_plans = [(n, len(p['gush_helka'])) for n, p in plans.items() if p['gush_helka']]
gh_plans.sort(key=lambda x: -x[1])
print(f'\nPlans with gush/helka: {len(gh_plans)}')
for n, c in gh_plans[:10]:
    print(f'  {n}: {c} gush mappings')

# Unique yeud types
yeud_types = set()
for plan in plans.values():
    for mg in plan.get('migrashim', []):
        y = mg.get('yeud', '')
        if y:
            yeud_types.add(y)
print(f'\nUnique yeud types: {len(yeud_types)}')
for y in sorted(yeud_types):
    print(f'  {y}')
