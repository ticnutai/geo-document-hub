"""Examine TabaNow HTML structure to build parsers"""
import urllib.request, re, json
from urllib.parse import quote, unquote
from pathlib import Path

ua = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
url = f'https://www.tabanow.co.il/{quote("תבע/שדות דן/גז/18/525", safe="/")}'
req = urllib.request.Request(url, headers=ua)
with urllib.request.urlopen(req, timeout=30) as resp:
    html = resp.read().decode('utf-8')

Path('_tabanow_sample_page.html').write_text(html, encoding='utf-8')

# Find all section headings (h2, h3, h4)
headings = re.findall(r'<h[23456][^>]*>(.*?)</h[23456]>', html, re.DOTALL)
print("Headings found:")
for h in headings:
    clean = re.sub(r'<[^>]+>', '', h).strip()
    if clean:
        print(f"  {clean}")

# Find all links that go to other plans
# Look for links with /תבע/ in encoded form
links = re.findall(r'href="([^"]*%D7%AA%D7%91%D7%A2[^"]*)"', html)
if not links:
    links = re.findall(r'href="([^"]*תבע[^"]*)"', html)
print(f"\nPlan links: {len(links)}")
for l in links[:30]:
    print(f"  {unquote(l)}")

# Find all tables
tables = re.findall(r'<table[^>]*>.*?</table>', html, re.DOTALL)
print(f"\nTables found: {len(tables)}")
for i, t in enumerate(tables):
    # Get first few header cells
    headers = re.findall(r'<th[^>]*>(.*?)</th>', t, re.DOTALL)
    headers = [re.sub(r'<[^>]+>', '', h).strip() for h in headers]
    rows = len(re.findall(r'<tr', t))
    print(f"  Table {i}: {rows} rows, headers: {headers[:8]}")

# Look for key sections  
sections = ['כללי', 'מסמכים', 'מטרת התוכנית', 'שטחים', 'מגרשים', 'תהליך אישור', 'גושים וחלקות', 'תוכניות']
for s in sections:
    count = html.count(s)
    print(f"\n'{s}' appears {count} times")
    # Find nearby context
    idx = html.find(s)
    if idx > 0:
        snippet = html[max(0,idx-100):idx+200]
        snippet = re.sub(r'<[^>]+>', ' ', snippet)
        snippet = re.sub(r'\s+', ' ', snippet).strip()
        print(f"  Context: ...{snippet[:200]}...")

# Extract general info section (key-value pairs)
print("\n\n--- GENERAL INFO PATTERNS ---")
# Look for dl/dt/dd patterns or label-value patterns
dts = re.findall(r'<dt[^>]*>(.*?)</dt>\s*<dd[^>]*>(.*?)</dd>', html, re.DOTALL)
for dt, dd in dts[:20]:
    key = re.sub(r'<[^>]+>', '', dt).strip()
    val = re.sub(r'<[^>]+>', '', dd).strip()
    print(f"  {key}: {val}")

# Check for card/panel structures
cards = re.findall(r'class="[^"]*card[^"]*"', html)
print(f"\nCard elements: {len(cards)}")

panels = re.findall(r'class="[^"]*panel[^"]*"', html)
print(f"Panel elements: {len(panels)}")
