"""Research MAVAT API endpoints for plan documents."""
import urllib.request
import urllib.error
import json
import ssl
import re

# Disable SSL verification for research
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def fetch_url(url, max_chars=3000):
    """Fetch a URL and return status code and content."""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        resp = urllib.request.urlopen(req, timeout=15, context=ctx)
        content = resp.read().decode('utf-8', errors='replace')
        status = resp.status
        return status, content[:max_chars]
    except urllib.error.HTTPError as e:
        return e.code, f"HTTPError: {e.reason}"
    except urllib.error.URLError as e:
        return 0, f"URLError: {e.reason}"
    except Exception as e:
        return -1, f"Error: {str(e)}"

# Step 1: Get the raw HTML of the plan page
print("=" * 80)
print("STEP 1: Fetching plan page HTML to find JS files and API calls")
print("=" * 80)
status, html = fetch_url("https://mavat.iplan.gov.il/SV4/1/4000426053/310", max_chars=50000)
print(f"Status: {status}, Length: {len(html)}")

# Find all script tags
scripts = re.findall(r'<script[^>]*(?:src=["\']([^"\']+)["\'])?[^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE)
print(f"\nFound {len(scripts)} script tags:")
for i, (src, inline) in enumerate(scripts):
    if src:
        print(f"  [{i}] External: {src}")
    else:
        snippet = inline.strip()[:200]
        if snippet:
            print(f"  [{i}] Inline ({len(inline)} chars): {snippet}...")

# Find API-related strings in HTML
print("\n--- API-related strings in HTML ---")
api_patterns = re.findall(r'(?:api|rest|fetch|axios|XMLHttpRequest|\.get\(|\.post\(|endpoint|document|attachment|file)[^"\'<>\s]{0,200}', html, re.IGNORECASE)
for p in set(api_patterns):
    print(f"  {p[:150]}")

# Find URLs in HTML
print("\n--- URLs containing 'api' or 'rest' in HTML ---")
urls_in_html = re.findall(r'["\']([^"\']*(?:api|rest|document|attachment|file)[^"\']*)["\']', html, re.IGNORECASE)
for u in set(urls_in_html):
    if len(u) < 300:
        print(f"  {u}")

print("\n" + "=" * 80)
print("STEP 2: Checking /rest/ directory listing")
print("=" * 80)
status, content = fetch_url("https://mavat.iplan.gov.il/rest/", max_chars=5000)
print(f"Status: {status}")
print(content)

print("\n" + "=" * 80)
print("STEP 3: Checking /rest/packages.config for API clues")
print("=" * 80)
status, content = fetch_url("https://mavat.iplan.gov.il/rest/packages.config", max_chars=5000)
print(f"Status: {status}")
print(content)
