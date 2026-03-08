"""Test fetching multiple plans from TabaNow"""
import urllib.request, re, json, sys, time
from urllib.parse import quote
from pathlib import Path

results = []
def log(msg):
    results.append(str(msg))

ua = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def make_tabanow_url(committee, plan):
    """Build TabaNow URL - keep / as path separator"""
    base = 'https://www.tabanow.co.il/'
    # Encode each part separately, keeping slashes
    path = quote(f'תבע/{committee}/{plan}', safe='/')
    return base + path

def fetch(url):
    req = urllib.request.Request(url, headers=ua)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode('utf-8'), resp.status
    except Exception as e:
        return None, str(e)

# Test plans that we know exist
test_plans = [
    'גז/12/525',
    'גז/18/525',
    'גז/27/525/א',
    'משמ/96/גז',
    'משמ/62/גז',
    'משמ/63/גז',
    'משמ/61/גז',
    'משמ/53/גז',
    'משמ/60/גז',
    'גז/7/392',
    'גז/מק/24/391',
    'תמל/1087',
    'גמ/548',
    'גז/624',
    'גז/13/391',
    'גז/17/475',
    'גז/14/392',
    'גז/10/391',
    'גז/5/342',
    'על/גז/מק/18/487א',
]

committee = 'שדות דן'
found = []
not_found = []

for plan in test_plans:
    url = make_tabanow_url(committee, plan)
    html, status = fetch(url)
    if html and isinstance(status, int) and status == 200:
        title = re.search(r'<title>(.*?)</title>', html)
        t = title.group(1).strip() if title else '?'
        # Check if it's a real plan page (has migrash section or plan details)
        has_migrashim = 'מגרשים' in html
        has_details = 'כללי' in html
        log(f'OK  {plan} -> {len(html)} bytes, migrashim={has_migrashim}, title={t[:60]}')
        found.append(plan)
    else:
        log(f'ERR {plan} -> {status}')
        not_found.append(plan)
    time.sleep(0.5)

# For plans not found under שדות דן, try without committee or with different committees
alt_committees = ['ועדה מחוזית מרכז', 'ותמל', 'ועדה ארצית']
for plan in not_found[:]:
    for alt in alt_committees:
        url = make_tabanow_url(alt, plan)
        html, status = fetch(url)
        if html and isinstance(status, int) and status == 200:
            title = re.search(r'<title>(.*?)</title>', html)
            t = title.group(1).strip() if title else '?'
            log(f'OK  {plan} (under {alt}) -> {len(html)} bytes, title={t[:60]}')
            found.append(plan)
            not_found.remove(plan)
            break
        time.sleep(0.3)

log(f'\nSummary: {len(found)} found, {len(not_found)} not found')
log(f'Not found: {not_found}')

# For found plans, get the related plans from the first one to discover more
url = make_tabanow_url(committee, 'גז/12/525')
html, _ = fetch(url)
if html:
    # Find related plans section
    related_section = html.split('תוכניות')
    log(f'\nSections with תוכניות: {len(related_section)-1}')
    
    # Extract plan links
    plan_links = re.findall(r'/תבע/([^"<]+)', html)
    unique_links = sorted(set(plan_links))
    log(f'Plan links on גז/12/525 page: {len(unique_links)}')
    for link in unique_links:
        log(f'  {link}')

out = Path('_tabanow_test_results.txt')
out.write_text('\n'.join(results), encoding='utf-8')
print(f'Done - {len(found)} found, {len(not_found)} not found. See _tabanow_test_results.txt')
