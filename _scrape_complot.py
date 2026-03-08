"""Discover Complot API endpoints and scrape migrash data for all parcels."""
import urllib.request, ssl, re, json, time, sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    resp = urllib.request.urlopen(req, context=ctx, timeout=20)
    return resp.read().decode('utf-8')

# Step 1: Get the main page and find JS files
print("=== Step 1: Fetching main page ===")
html = fetch('https://sdan.complot.co.il/gush2/')
scripts = re.findall(r'src="([^"]+)"', html)
print(f"Found {len(scripts)} script tags:")
for s in scripts:
    print(f"  {s}")

# Look for inline JS with API patterns
api_urls = re.findall(r'["\'](/[^"\']*(?:api|gush|helka|parcel|migrash|chelka)[^"\']*)["\']', html, re.I)
print(f"\nInline API patterns: {api_urls}")

# Step 2: Fetch main JS bundle
print("\n=== Step 2: Checking JS bundles for API calls ===")
for script_url in scripts:
    if script_url.endswith('.js') and ('bundle' in script_url or 'main' in script_url or 'app' in script_url or 'chunk' in script_url):
        full_url = script_url if script_url.startswith('http') else f'https://sdan.complot.co.il{script_url}'
        print(f"\nFetching: {full_url}")
        try:
            js_content = fetch(full_url)
            print(f"  Size: {len(js_content)} bytes")
            
            # Look for API endpoints
            apis = re.findall(r'["\']([^"\']*(?:api|gush|helka|chelka|migrash|parcel|GetInfo|getInfo|unified)[^"\']*)["\']', js_content, re.I)
            if apis:
                print(f"  API endpoints found:")
                for a in set(apis):
                    if len(a) < 200:
                        print(f"    {a}")
        except Exception as e:
            print(f"  Error: {e}")

# Step 3: Try common Complot API patterns
print("\n=== Step 3: Testing common Complot API patterns ===")
test_urls = [
    'https://sdan.complot.co.il/api/gush/7188/64',
    'https://sdan.complot.co.il/gush2/api/gush/7188/64',
    'https://sdan.complot.co.il/gush2/GetInfo?gush=7188&chelka=64',
    'https://sdan.complot.co.il/api/GetInfo?gush=7188&chelka=64',
    'https://sdan.complot.co.il/gush2/api/GetInfo?gush=7188&chelka=64',
    'https://sdan.complot.co.il/api/gush2/7188/64',
    'https://sdan.complot.co.il/gush2/data/7188/64',
]

for url in test_urls:
    try:
        data = fetch(url)
        ct = 'json' if data.strip().startswith('{') or data.strip().startswith('[') else 'html'
        print(f"  {url}")
        print(f"    Type: {ct}, Size: {len(data)}")
        if ct == 'json':
            print(f"    DATA: {data[:500]}")
    except urllib.error.HTTPError as e:
        print(f"  {url} -> HTTP {e.code}")
    except Exception as e:
        print(f"  {url} -> {e}")

print("\nDone with discovery.")
