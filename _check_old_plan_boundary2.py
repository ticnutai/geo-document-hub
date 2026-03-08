"""Check more fields and layers for old plan data."""
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

# 1. List ALL fields in layer 1
print("=== ALL fields in Layer 1 ===")
url1 = 'https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer/1'
r = s.get(url1, params={'f':'json'}, timeout=30)
d = r.json()
for f in d.get('fields', []):
    print(f"  {f['name']:35s} {f['type']}")

# 2. Check if mp_id around 4063057 exists at all
print("\n=== Search mp_id range 4000000-5000000, count ===")
url_q = url1 + '/query'
r2 = s.get(url_q, params={
    'where': 'mp_id >= 4000000 AND mp_id <= 5000000',
    'returnCountOnly': 'true', 'f': 'json'
}, timeout=30)
print('Count:', r2.json())

# 3. Try pl_number LIKE 'גז%'
print("\n=== pl_number LIKE 'גז%' ===")
r3 = s.get(url_q, params={
    'where': "pl_number LIKE 'גז%'",
    'outFields': 'pl_number,mp_id',
    'returnGeometry': 'false',
    'resultRecordCount': '20',
    'f': 'json'
}, timeout=30)
d3 = r3.json()
if d3.get('features'):
    for feat in d3['features']:
        print(f"  {feat['attributes']}")
else:
    print('  No features')
    if d3.get('error'):
        print('  Error:', d3['error'])

# 4. Try pl_number containing Hebrew chars for old format
print("\n=== pl_number containing any Hebrew ===")
r4 = s.get(url_q, params={
    'where': "pl_number LIKE '%/ 525/%'",
    'outFields': 'pl_number,mp_id',
    'returnGeometry': 'false',
    'resultRecordCount': '20',
    'f': 'json'
}, timeout=30)
d4 = r4.json()
if d4.get('features'):
    for feat in d4['features']:
        print(f"  {feat['attributes']}")
else:
    print('  No features')

# 5. Check for existing kfar chabad plans by county name
print("\n=== plan_county_name LIKE '%חב_ד%' count + samples ===")
r5 = s.get(url_q, params={
    'where': "plan_county_name LIKE '%חב_ד%'",
    'outFields': 'pl_number,mp_id,plan_county_name,station_desc',
    'returnGeometry': 'false',
    'f': 'json'
}, timeout=30)
d5 = r5.json()
print(f"Found: {len(d5.get('features', []))} features")
for feat in d5.get('features', [])[:30]:
    print(f"  {feat['attributes']}")

# 6. List all layers in Xplan MapServer
print("\n=== ALL Xplan MapServer layers ===")
url_base = 'https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer'
r6 = s.get(url_base, params={'f':'json'}, timeout=30)
d6 = r6.json()
for layer in d6.get('layers', []):
    print(f"  ID={layer['id']}: {layer['name']}")
