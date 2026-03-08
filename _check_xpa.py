"""Check raw HTML from XPA API to fix parsing."""
import requests

API_BASE = "https://handasi.complot.co.il/magicscripts/mgrqispi.dll"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://sdan.complot.co.il/gush2/",
}

r = requests.get(API_BASE, params={
    "appname": "cixpa",
    "prgname": "GetGushFile",
    "siteid": 31,
    "g": 7188,
    "h": 64,
    "arguments": "siteid,g,h",
}, headers=HEADERS, timeout=30)

print(f"Status: {r.status_code}")
print(f"Content-Type: {r.headers.get('Content-Type')}")
print(f"Length: {len(r.text)}")
print("\n--- RAW HTML ---")
print(r.text[:5000])

# Save full HTML
with open('_xpa_sample.html', 'w', encoding='utf-8') as f:
    f.write(r.text)
print(f"\nSaved full HTML to _xpa_sample.html ({len(r.text)} bytes)")
