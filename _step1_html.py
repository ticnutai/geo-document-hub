"""Step 1: Fetch raw HTML of MAVAT plan page to find JS bundles and API URLs."""
import urllib.request
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

url = "https://mavat.iplan.gov.il/SV4/1/4000426053/310"
req = urllib.request.Request(url, headers=HEADERS)
resp = urllib.request.urlopen(req, timeout=20, context=ctx)
html = resp.read().decode('utf-8', errors='replace')

with open('_mavat_page.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"Status: {resp.status}, Length: {len(html)}")

# Find script tags
scripts = re.findall(r'<script[^>]*(?:src=["\']([^"\']+)["\'])?[^>]*>', html, re.IGNORECASE)
print("\nScript tags found:")
for s in scripts:
    if s:
        print(f"  SRC: {s}")

# Find API/rest URLs in the HTML
print("\nURLs containing api/rest/document/attachment/file:")
url_matches = re.findall(r'["\']([^"\']*(?:api|rest|document|attachment|files?|download)[^"\']*)["\']', html, re.IGNORECASE)
for u in sorted(set(url_matches)):
    if len(u) < 300:
        print(f"  {u}")

# Find inline script content
inline_scripts = re.findall(r'<script[^>]*>([\s\S]*?)</script>', html, re.IGNORECASE)
print(f"\n{len(inline_scripts)} inline script blocks found")
for i, s in enumerate(inline_scripts):
    s = s.strip()
    if s and len(s) > 10:
        print(f"\n--- Inline script {i} ({len(s)} chars) ---")
        print(s[:500])
