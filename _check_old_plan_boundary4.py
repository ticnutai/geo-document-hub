"""Check plan_index and entities services for old plans."""
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

# 1. plan_index layers
print("=== plan_index MapServer layers ===")
r = s.get(f'{base}/plan_index/MapServer', params={'f':'json'}, timeout=30)
d = r.json()
for l in d.get('layers', []):
    print(f"  ID={l['id']}: {l['name']}")

# 2. Check plan_index layers for old plans
for lid in range(min(5, len(d.get('layers',[])))):
    print(f"\n=== plan_index Layer {lid} fields ===")
    r2 = s.get(f'{base}/plan_index/MapServer/{lid}', params={'f':'json'}, timeout=30)
    d2 = r2.json()
    for f in d2.get('fields', [])[:10]:
        print(f"  {f['name']:35s} {f['type']}")
    # Try querying for old plan
    q = f'{base}/plan_index/MapServer/{lid}/query'
    try:
        r3 = s.get(q, params={
            'where': "pl_number LIKE '%גז%'",
            'outFields': '*',
            'returnGeometry': 'false',
            'resultRecordCount': '5',
            'f': 'json'
        }, timeout=15)
        d3 = r3.json()
        if d3.get('features'):
            print(f"  Found {len(d3['features'])} features with גז!")
            for feat in d3['features'][:3]:
                print(f"    {feat['attributes']}")
        else:
            # Try without Hebrew
            r4 = s.get(q, params={
                'where': '1=1',
                'outFields': 'pl_number',
                'returnGeometry': 'false',
                'resultRecordCount': '3',
                'f': 'json'
            }, timeout=15)
            d4 = r4.json()
            if d4.get('features'):
                sample = [f['attributes'].get('pl_number') for f in d4['features']]
                print(f"  No גז features, sample pl_numbers: {sample}")
            elif d4.get('error'):
                # No pl_number field, try generic
                r5 = s.get(q, params={
                    'where': '1=1',
                    'outFields': '*',
                    'returnGeometry': 'false',
                    'resultRecordCount': '2',
                    'f': 'json'
                }, timeout=15)
                d5 = r5.json()
                if d5.get('features'):
                    print(f"  Sample: {d5['features'][0]['attributes']}")
    except Exception as e:
        print(f"  Error: {e}")

# 3. entities service
print("\n=== entities MapServer layers ===")
r = s.get(f'{base}/entities/MapServer', params={'f':'json'}, timeout=30)
d = r.json()
for l in d.get('layers', []):
    print(f"  ID={l['id']}: {l['name']}")

# 4. Check entities for old plans
if d.get('layers'):
    for lid in [l['id'] for l in d['layers'][:3]]:
        q = f'{base}/entities/MapServer/{lid}/query'
        r = s.get(q, params={
            'where': "pl_number LIKE '%גז%'",
            'outFields': 'pl_number,mp_id',
            'returnGeometry': 'false',
            'resultRecordCount': '5',
            'f': 'json'
        }, timeout=15)
        d2 = r.json()
        if d2.get('features'):
            print(f"\n  entities Layer {lid}: Found {len(d2['features'])} with גז!")
            for feat in d2['features'][:3]:
                print(f"    {feat['attributes']}")
        else:
            print(f"  entities Layer {lid}: No גז features")

# 5. Check Xplan_6991 - might be old plans
print("\n=== Xplan_6991 MapServer ===")
r = s.get(f'{base}/Xplan_6991/MapServer', params={'f':'json'}, timeout=30)
d = r.json()
for l in d.get('layers', []):
    print(f"  ID={l['id']}: {l['name']}")
# Search old plan in Xplan_6991 layers
for lid in [l['id'] for l in d.get('layers', [])[:5]]:
    q = f'{base}/Xplan_6991/MapServer/{lid}/query'
    try:
        r = s.get(q, params={
            'where': "pl_number LIKE '%525%12%'",
            'outFields': 'pl_number,mp_id',
            'returnGeometry': 'false',
            'resultRecordCount': '5',
            'f': 'json'
        }, timeout=15)
        d2 = r.json()
        if d2.get('features'):
            print(f"  Xplan_6991 Layer {lid}: {[f['attributes'] for f in d2['features']]}")
    except:
        pass

# 6. Check mmg directory status
import os
mmg_dir = 'data/mmg'
if os.path.isdir(mmg_dir):
    print(f"\n=== MMG directories ===")
    for subdir in sorted(os.listdir(mmg_dir)):
        subpath = os.path.join(mmg_dir, subdir)
        if os.path.isdir(subpath):
            files = os.listdir(subpath)
            geojsons = [f for f in files if f.endswith('.geojson')]
            print(f"  {subdir}: {len(files)} files, {len(geojsons)} geojson ({', '.join(geojsons[:3])})")
        elif subdir.endswith('.json'):
            with open(subpath, 'r', encoding='utf-8') as fh:
                data = json.load(fh)
                print(f"  {subdir}: {len(data)} entries")
