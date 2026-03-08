"""Check if old plan boundaries exist in iPlan Xplan MapServer."""
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

url = 'https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer/1/query'

# 1. Check fields available
print("=== Available fields ===")
r0 = s.get(url.replace('/query',''), params={'f':'json'}, timeout=30)
fields = r0.json().get('fields', [])
for f in fields[:20]:
    print(f"  {f['name']:30s} ({f['type']})")

# 2. Exact match by pl_number  
print("\n=== Exact match: pl_number = 'גז/ 525/ 12' ===")
r = s.get(url, params={
    'where': "pl_number = 'גז/ 525/ 12'",
    'returnCountOnly': 'true', 'f': 'json'
}, timeout=30)
print('Count:', r.json())

# 3. Match by mp_id
print("\n=== Match by mp_id = 4063057 ===")
r2 = s.get(url, params={
    'where': 'mp_id = 4063057',
    'outFields': 'pl_number,mp_id,objectid',
    'returnGeometry': 'true',
    'outSR': '4326',
    'f': 'json'
}, timeout=30)
d2 = r2.json()
if d2.get('features'):
    for feat in d2['features']:
        geom = feat.get('geometry', {})
        has_rings = 'rings' in geom
        print(f"  Found: {feat['attributes']}, has_rings={has_rings}")
        if has_rings:
            ring = geom['rings'][0]
            print(f"  First/last coords: {ring[0]} ... {ring[-1]}")
            print(f"  Total ring points: {len(ring)}")
else:
    print('  No features found')
    if d2.get('error'):
        print('  Error:', d2['error'])

# 4. LIKE search for 525
print("\n=== LIKE search: pl_number LIKE '%525%' (first 10) ===")
r3 = s.get(url, params={
    'where': "pl_number LIKE '%525%'",
    'outFields': 'pl_number,mp_id',
    'returnGeometry': 'false',
    'f': 'json',
    'resultRecordCount': '10'
}, timeout=30)
d3 = r3.json()
if d3.get('features'):
    for feat in d3['features']:
        print(f"  {feat['attributes']}")
else:
    print('  No features')

# 5. Count all plans
print("\n=== Total plans in layer 1 ===")
r4 = s.get(url, params={'where': '1=1', 'returnCountOnly': 'true', 'f': 'json'}, timeout=30)
print('Total:', r4.json())
