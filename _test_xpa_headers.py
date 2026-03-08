"""Try XPA API with proper headers mimicking the SPA's AJAX request."""
import requests

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Ch-Ua": '"Chromium";v="136", "Not.A/Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
})

# Step 1: Load the SPA page to get cookies
print("1) Loading SPA page...")
resp = session.get("https://sdan.complot.co.il/gush2/", timeout=30)
print(f"   SPA status: {resp.status_code}, cookies: {list(session.cookies.keys())}")

# Step 2: Try XPA API with Referer from SPA
print("\n2) Calling XPA API with proper Referer...")
session.headers.update({
    "Referer": "https://sdan.complot.co.il/gush2/",
    "Origin": "https://sdan.complot.co.il",
    "X-Requested-With": "XMLHttpRequest",
})

url = "https://handasi.complot.co.il/magicscripts/mgrqispi.dll"
params = {
    "appname": "cixpa",
    "prgname": "GetGushFile", 
    "siteid": "31",
    "g": "7188",
    "h": "64",
    "arguments": "siteid,g,h"
}

resp2 = session.get(url, params=params, timeout=30)
print(f"   API status: {resp2.status_code}")
print(f"   Has מגרש: {'מגרש' in resp2.text}")
print(f"   Has מצטערים: {'מצטערים' in resp2.text}")
print(f"   Content length: {len(resp2.text)}")
if 'מגרש' in resp2.text:
    print(f"   Content: {resp2.text[:500]}")
else:
    print(f"   Content: {resp2.text[:300]}")

# Step 3: Try helka 14
print("\n3) Trying helka 14...")
params["h"] = "14"
resp3 = session.get(url, params=params, timeout=30)
print(f"   Has מגרש: {'מגרש' in resp3.text}")
print(f"   Has מצטערים: {'מצטערים' in resp3.text}")
if 'מגרש' in resp3.text:
    print(f"   YES! {resp3.text[:500]}")

# Step 4: Try with cloudscraper if available
try:
    import cloudscraper
    print("\n4) Trying with cloudscraper...")
    scraper = cloudscraper.create_scraper()
    scraper.headers.update({
        "Referer": "https://sdan.complot.co.il/gush2/",
        "Origin": "https://sdan.complot.co.il",
    })
    # First load SPA
    r = scraper.get("https://sdan.complot.co.il/gush2/")
    print(f"   SPA: {r.status_code}")
    # Then call XPA
    params["h"] = "64"
    r2 = scraper.get(url, params=params)
    print(f"   API: {r2.status_code}")
    print(f"   Has מגרש: {'מגרש' in r2.text}")
    if 'מגרש' in r2.text:
        print(f"   DATA: {r2.text[:500]}")
except ImportError:
    print("\n4) cloudscraper not installed, skipping")
