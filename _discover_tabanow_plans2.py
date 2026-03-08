"""Discover all Kfar Chabad plans on TabaNow - outputs to file"""
import urllib.request, re, json
from pathlib import Path

DATA = Path("data")
OUT = Path("_tabanow_discovery.txt")

results = []

def log(msg):
    results.append(msg)
    print(msg)

# Try the yishuv page for Kfar Chabad
url = 'https://www.tabanow.co.il/%D7%99%D7%99%D7%A9%D7%95%D7%91/%D7%9B%D7%A4%D7%A8%20%D7%97%D7%91%D7%93'
req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read().decode('utf-8')
        status = resp.status
    log(f'Got {len(html)} bytes, status={status}')
    
    # Save HTML
    Path('_tabanow_yishuv_page.html').write_text(html, encoding='utf-8')
    log('Saved HTML')
    
    # Find all href links
    all_links = re.findall(r'href="([^"]*)"', html)
    log(f'Total links: {len(all_links)}')
    
    # Filter plan links
    plan_links = [l for l in all_links if '/תבע/' in l]
    log(f'Plan links with /תבע/: {len(plan_links)}')
    for l in plan_links[:100]:
        log(f'  {l}')
    
    # URL-decoded plan links
    from urllib.parse import unquote
    decoded_plan_links = [l for l in all_links if unquote(l).find('/תבע/') >= 0]
    log(f'Plan links (url-decoded check): {len(decoded_plan_links)}')
    for l in decoded_plan_links[:100]:
        log(f'  {unquote(l)}')
    
    # Look for plan name patterns
    plans = re.findall(r'[\u05d0-\u05ea]+/[\d\w/\u05d0-\u05ea]{2,30}', html)
    unique_plans = sorted(set(plans))
    log(f'Plan name patterns: {len(unique_plans)}')
    for p in unique_plans[:50]:
        log(f'  {p}')
        
except Exception as e:
    log(f'Error fetching yishuv page: {e}')
    import traceback
    results.append(traceback.format_exc())

# Also try committee page
url2 = 'https://www.tabanow.co.il/%D7%95%D7%A2%D7%93%D7%94/%D7%A9%D7%93%D7%95%D7%AA%20%D7%93%D7%9F'
req2 = urllib.request.Request(url2, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})
try:
    with urllib.request.urlopen(req2, timeout=30) as resp2:
        html2 = resp2.read().decode('utf-8')
    log(f'\nCommittee page: {len(html2)} bytes')
    Path('_tabanow_vaada_page.html').write_text(html2, encoding='utf-8')
except Exception as e:
    log(f'Error fetching committee page: {e}')

OUT.write_text('\n'.join(results), encoding='utf-8')
print('Done - output written to', OUT)
