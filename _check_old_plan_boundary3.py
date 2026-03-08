"""Check other layers and services for old plan data."""
import ssl, requests, json
from requests.adapters import HTTPAdapter
from urllib3.util.ssl_ import create_urllib3_context
import urllib3
urllib3.disable_warnings()

class A(HTTPAdapter):
    def init_poolmanager(self, *a, **kw):
        ctx = create_urllib3_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        ctx.set_ciphers('DEFAULT:@SECLEVEL=1')
        kw['ssl_context'] = ctx
        super().init_poolmanager(*a, **kw)

s = requests.Session()
s.mount('https://ags.iplan.gov.il', A())
s.verify = False

base = 'https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic'

# 1. Check Xplan Layer 3 (polygonal entities) for old plans
print("=== Xplan Layer 3 fields ===")
r = s.get(f'{base}/Xplan/MapServer/3', params={'f':'json'}, timeout=30)
d = r.json()
for f in d.get('fields', []):
    print(f"  {f['name']:35s} {f['type']}")

print("\n=== Xplan Layer 3: plan_county_name LIKE '%חב_ד%' ===")
q = f'{base}/Xplan/MapServer/3/query'
r2 = s.get(q, params={
    'where': "plan_county_name LIKE '%חב_ד%'",
    'outFields': 'pl_number,mp_id',
    'returnGeometry': 'false',
    'resultRecordCount': '30',
    'f': 'json'
}, timeout=30)
d2 = r2.json()
if d2.get('features'):
    for feat in d2['features']:
        print(f"  {feat['attributes']}")
else:
    print('  No features')

# 2. List ALL MapServer services
print("\n=== All PlanningPublic services ===")
r3 = s.get(f'{base}', params={'f':'json'}, timeout=30)
d3 = r3.json()
for svc in d3.get('services', []):
    print(f"  {svc['name']} ({svc['type']})")

# 3. Check TMM services
for svc_name in ['TMM3', 'TMM21', 'gvulot', 'TAMA1', 'TAMA35']:
    full = f'{base}/{svc_name}/MapServer'
    try:
        r = s.get(full, params={'f':'json'}, timeout=15)
        d = r.json()
        layers = d.get('layers', [])
        print(f"\n=== {svc_name}: {len(layers)} layers ===")
        for l in layers:
            print(f"  ID={l['id']}: {l['name']}")
    except Exception as e:
        print(f"\n=== {svc_name}: error - {e} ===")

# 4. Check the all_plans_by_block MP_IDs vs Xplan mp_ids
print("\n=== MP_ID comparison ===")
with open('data/all_plans_by_block.json', 'r', encoding='utf-8') as f:
    apb = json.load(f)
plans = apb.get('plans', {})
mp_ids = []
for pid, pdata in plans.items():
    mp = pdata.get('MP_ID')
    if mp:
        mp_ids.append(int(mp))
mp_ids.sort()
print(f"all_plans_by_block MP_ID range: {min(mp_ids)} - {max(mp_ids)}")
print(f"all_plans_by_block sample MP_IDs: {mp_ids[:5]} ... {mp_ids[-5:]}")
print(f"Xplan Layer 1 sample MP_IDs: 4005189510, 4005360672, 4005264672 (10-digit)")

# 5. Check if modern plans in all_plans_by_block match Xplan mp_ids
print("\n=== Cross-check: 425-* plans in all_plans_by_block vs Xplan ===")
for pid, pdata in list(plans.items())[:40]:
    num = pdata.get('PL_NUMBER','')
    mp = pdata.get('MP_ID')
    if '425-' in num:
        # Check if this mp_id exists in Xplan
        r = s.get(f'{base}/Xplan/MapServer/1/query', params={
            'where': f"pl_number = '{num}'",
            'outFields': 'pl_number,mp_id',
            'returnGeometry': 'false',
            'f': 'json'
        }, timeout=15)
        d = r.json()
        xplan_mp = None
        if d.get('features'):
            xplan_mp = d['features'][0]['attributes'].get('mp_id')
        print(f"  {num}: block_mp_id={mp}, xplan_mp_id={xplan_mp}")
