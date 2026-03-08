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
        ctx.set_ciphers("DEFAULT:@SECLEVEL=1")
        kw["ssl_context"] = ctx
        return super().init_poolmanager(*a, **kw)

s = requests.Session()
s.mount("https://ags.iplan.gov.il", A())
s.verify = False

url = "https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer/1/query"

# Try LIKE search
r = s.get(url, params={"where": "plan_county_name LIKE '%חב_ד%'", "returnCountOnly": "true", "f": "json"}, timeout=60)
print("LIKE count:", r.json())

# Get distinct names with חב
r = s.get(url, params={
    "where": "plan_county_name LIKE '%חב%'",
    "outFields": "plan_county_name",
    "returnGeometry": "false",
    "f": "json",
    "resultRecordCount": 10,
    "returnDistinctValues": "true"
}, timeout=60)
data = r.json()
if "features" in data:
    names = [f["attributes"]["plan_county_name"] for f in data["features"]]
    print("Matching names:", names)
else:
    print("Response:", json.dumps(data, ensure_ascii=False)[:500])
