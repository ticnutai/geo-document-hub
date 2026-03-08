"""Fetch MAVAT plan page HTML and save analysis to file."""
import urllib.request
import ssl
import re
import sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

output_lines = []
def log(msg=""):
    output_lines.append(str(msg))

def fetch_url(url, max_chars=50000):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        resp = urllib.request.urlopen(req, timeout=20, context=ctx)
        content = resp.read().decode('utf-8', errors='replace')
        return resp.status, content[:max_chars], resp.url
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode('utf-8', errors='replace')[:2000]
        except:
            pass
        return e.code, f"HTTPError: {e.reason}\n{body}", url
    except urllib.error.URLError as e:
        return 0, f"URLError: {e.reason}", url
    except Exception as e:
        return -1, f"Error: {str(e)}", url

# ---- STEP 1: Main page HTML ----
log("=" * 80)
log("STEP 1: Fetching plan page HTML")
log("=" * 80)
status, html, final_url = fetch_url("https://mavat.iplan.gov.il/SV4/1/4000426053/310")
log(f"Status: {status}, Length: {len(html)}, Final URL: {final_url}")

with open('_mavat_page.html', 'w', encoding='utf-8') as f:
    f.write(html)

# Find script src tags
scripts_src = re.findall(r'<script[^>]*src=["\']([^"\']+)["\'][^>]*>', html, re.IGNORECASE)
log(f"\nExternal script tags ({len(scripts_src)}):")
for s in scripts_src:
    log(f"  {s}")

# Find link tags (CSS, etc.)
links = re.findall(r'<link[^>]*href=["\']([^"\']+)["\'][^>]*>', html, re.IGNORECASE)
log(f"\nLink tags ({len(links)}):")
for l in links:
    log(f"  {l}")

# Find any URLs in HTML containing api/rest/document/attachment
log("\nURLs in HTML containing api|rest|document|attachment|file|download:")
url_matches = re.findall(r'["\'](https?://[^"\']*(?:api|rest|document|attachment|files?|download)[^"\']*)["\']', html, re.IGNORECASE)
for u in sorted(set(url_matches)):
    if len(u) < 300:
        log(f"  {u}")

# Also find relative URLs
log("\nRelative URLs containing api|rest|document|attachment|file:")
rel_url_matches = re.findall(r'["\'](/[^"\']*(?:api|rest|document|attachment|files?|download)[^"\']*)["\']', html, re.IGNORECASE)
for u in sorted(set(rel_url_matches)):
    if len(u) < 300:
        log(f"  {u}")

# Find inline scripts
inline_scripts = re.findall(r'<script(?:\s[^>]*)?>([^<]+)</script>', html, re.IGNORECASE)
log(f"\nInline scripts ({len(inline_scripts)}):")
for i, s in enumerate(inline_scripts):
    s = s.strip()
    if s and len(s) > 5:
        log(f"\n--- Inline script {i} ({len(s)} chars) ---")
        log(s[:1000])

# Search for JSON data in HTML
log("\n\nSearching for embedded JSON/config objects...")
json_patterns = re.findall(r'(?:window\.|var |let |const )(\w+)\s*=\s*(\{[^;]{20,2000})', html, re.IGNORECASE)
for name, data in json_patterns:
    log(f"\n  Variable: {name}")
    log(f"  Value: {data[:500]}")

# Search for environment/config
log("\n\nSearching for 'environment' or 'config' or 'apiUrl' patterns...")
config_patterns = re.findall(r'(?:environment|config|apiUrl|baseUrl|apiBase|serverUrl|API_URL)["\s:=]+["\']?([^"\';\s,}{]+)', html, re.IGNORECASE)
for p in set(config_patterns):
    log(f"  {p}")

# ---- STEP 2: /rest/ directory ----
log("\n" + "=" * 80)
log("STEP 2: /rest/ directory listing")
log("=" * 80)
status, content, _ = fetch_url("https://mavat.iplan.gov.il/rest/")
log(f"Status: {status}")
log(content[:3000])

# ---- STEP 3: /rest/packages.config ----
log("\n" + "=" * 80)
log("STEP 3: /rest/packages.config")
log("=" * 80)
status, content, _ = fetch_url("https://mavat.iplan.gov.il/rest/packages.config")
log(f"Status: {status}")
log(content[:3000])

# ---- STEP 4: Try various API endpoints ---- 
log("\n" + "=" * 80)
log("STEP 4: Testing API endpoints")
log("=" * 80)

test_urls = [
    "https://mavat.iplan.gov.il/rest/api/SV4/1/",
    "https://mavat.iplan.gov.il/rest/api/SV4/1/4000426053/310",
    "https://mavat.iplan.gov.il/rest/api/SV4/1/4000426053/310/",
    "https://mavat.iplan.gov.il/rest/api/Attachments/4000426053",
    "https://mavat.iplan.gov.il/rest/api/Attacments/4000426053",
    "https://mavat.iplan.gov.il/rest/api/sv4plandetails?mid=4000426053",
    "https://mavat.iplan.gov.il/rest/api/SV4/1/?mid=4000426053",
]

for url in test_urls:
    status, content, final = fetch_url(url, max_chars=2000)
    log(f"\n  URL: {url}")
    log(f"  Status: {status}, Final: {final}")
    log(f"  Content ({len(content)} chars): {content[:500]}")

# Write output
with open('_mavat_research_results.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines))

print("DONE - results written to _mavat_research_results.txt")
