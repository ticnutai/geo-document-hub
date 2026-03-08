"""Discover all available iPlan ArcGIS services and layers."""
import requests, json, ssl, urllib3
from requests.adapters import HTTPAdapter
from urllib3.util.ssl_ import create_urllib3_context
urllib3.disable_warnings()

class A(HTTPAdapter):
    def init_poolmanager(self, *a, **kw):
        ctx = create_urllib3_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        ctx.set_ciphers("DEFAULT:@SECLEVEL=1")
        kw["ssl_context"] = ctx
        super().init_poolmanager(*a, **kw)

s = requests.Session()
s.mount("https://ags.iplan.gov.il", A())
s.verify = False

# 1. List all services
print("=" * 60)
print("ALL iPlan ArcGIS SERVICES")
print("=" * 60)
r = s.get("https://ags.iplan.gov.il/arcgisiplan/rest/services?f=json", timeout=30)
data = r.json()
services = []
for folder in data.get("folders", []):
    print(f"FOLDER: {folder}")
    try:
        r2 = s.get(f"https://ags.iplan.gov.il/arcgisiplan/rest/services/{folder}?f=json", timeout=30)
        for svc in r2.json().get("services", []):
            services.append(svc)
            print(f"  {svc.get('name')} ({svc.get('type')})")
    except:
        pass

for svc in data.get("services", []):
    services.append(svc)
    print(f"{svc.get('name')} ({svc.get('type')})")

# 2. List layers for key MapServers
print("\n" + "=" * 60)
print("LAYERS IN KEY SERVICES")
print("=" * 60)

interesting = [
    "PlanningPublic/Xplan",
    "PlanningPublic/compilation_tmm_merkaz",
]

# Also check all PlanningPublic services
for svc in services:
    name = svc.get("name", "")
    stype = svc.get("type", "")
    if "Planning" in name or "planning" in name:
        if name not in interesting:
            interesting.append(name)

for name in interesting:
    print(f"\n--- {name} ---")
    try:
        r = s.get(f"https://ags.iplan.gov.il/arcgisiplan/rest/services/{name}/MapServer?f=json", timeout=30)
        data = r.json()
        for layer in data.get("layers", []):
            print(f"  Layer {layer['id']}: {layer['name']}")
    except Exception as e:
        print(f"  Error: {e}")

# 3. Check GovMap / services8.arcgis.com
print("\n" + "=" * 60)
print("ArcGIS Online (services8.arcgis.com)")
print("=" * 60)
for name in ["חלקות", "שכבת_גושים"]:
    url = f"https://services8.arcgis.com/JcXY3lLZni6BK4El/arcgis/rest/services/{name}/FeatureServer?f=json"
    try:
        r = requests.get(url, timeout=30)
        data = r.json()
        for layer in data.get("layers", []):
            print(f"  {name} - Layer {layer['id']}: {layer['name']}")
    except Exception as e:
        print(f"  {name} - Error: {e}")

# 4. Check data.gov.il for planning APIs
print("\n" + "=" * 60)
print("data.gov.il Planning datasets")
print("=" * 60)
try:
    r = requests.get("https://data.gov.il/api/3/action/package_search?q=תכנון+בניה&rows=20", timeout=30)
    data = r.json()
    for result in data.get("result", {}).get("results", []):
        title = result.get("title", "")
        org = result.get("organization", {}).get("title", "")
        print(f"  {title} [{org}]")
        for res in result.get("resources", [])[:2]:
            print(f"    -> {res.get('name', '')} ({res.get('format', '')}) {res.get('url', '')[:80]}")
except Exception as e:
    print(f"  Error: {e}")

# 5. Check MAVAT additional data from existing plan_data.json
print("\n" + "=" * 60)
print("MAVAT plan_data.json KEYS (available data)")
print("=" * 60)
import os
sample_dir = "data/docs/425-0449702"
if os.path.exists(os.path.join(sample_dir, "_plan_data.json")):
    with open(os.path.join(sample_dir, "_plan_data.json"), "r", encoding="utf-8") as f:
        pd = json.load(f)
    for key in sorted(pd.keys()):
        val = pd[key]
        if isinstance(val, list):
            print(f"  {key}: list[{len(val)}]")
        elif isinstance(val, dict):
            print(f"  {key}: dict with keys: {list(val.keys())[:10]}")
        else:
            print(f"  {key}: {type(val).__name__} = {str(val)[:80]}")
