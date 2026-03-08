"""Try different TabaNow URL patterns to find where plans are listed"""
import urllib.request, re, json, sys
from urllib.parse import quote, unquote
from pathlib import Path

results = []
def log(msg):
    results.append(str(msg))
    print(msg, flush=True)

ua = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def fetch(url):
    req = urllib.request.Request(url, headers=ua)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode('utf-8'), resp.status
    except Exception as e:
        return None, str(e)

# Try different URL patterns for TabaNow
urls_to_try = [
    'https://www.tabanow.co.il/',
    'https://www.tabanow.co.il/sitemap.xml',
    'https://www.tabanow.co.il/robots.txt',
]

for url in urls_to_try:
    html, status = fetch(url)
    log(f'{url} -> status={status}, len={len(html) if html else 0}')
    if html and url.endswith('.txt'):
        log(html[:2000])
    elif html and url.endswith('.xml'):
        log(html[:3000])

# Try the main page
html, status = fetch('https://www.tabanow.co.il/')
if html:
    Path('_tabanow_main.html').write_text(html, encoding='utf-8')
    log(f'Main page saved, {len(html)} bytes')
    # Look for navigation links
    all_links = set(re.findall(r'href="([^"]*)"', html))
    log(f'Links on main page: {len(all_links)}')
    for l in sorted(all_links):
        log(f'  {unquote(l)}')

# Now try fetching a few plans directly to verify the URL pattern
# For שדות דן plans:
test_plans = [
    ('שדות דן', 'גז/12/525'),
    ('שדות דן', 'גז/18/525'),
    ('שדות דן', 'משמ/96/גז'),
    ('שדות דן', 'תמל/1087'),
    ('שדות דן', 'גז/7/392'),
]

log('\n--- Testing plan URLs ---')
for committee, plan in test_plans:
    url = f'https://www.tabanow.co.il/%D7%AA%D7%91%D7%A2/{quote(committee)}/{quote(plan, safe="")}'
    html, status = fetch(url)
    if html:
        title = re.search(r'<title>(.*?)</title>', html)
        t = title.group(1) if title else '?'
        log(f'OK {plan} -> {status}, {len(html)} bytes, title={t}')
    else:
        log(f'FAIL {plan} -> {status}')
    # Also try without encoding the plan name
    url2 = f'https://www.tabanow.co.il/תבע/{committee}/{plan}'
    html2, status2 = fetch(url2)
    if html2 and status2 != status:
        log(f'  Alt URL: {status2}, {len(html2)} bytes')

Path('_tabanow_discovery2.txt').write_text('\n'.join(results), encoding='utf-8')
log('\nDone!')
