"""Discover all Kfar Chabad plans on TabaNow"""
import urllib.request, sys, re, json
from pathlib import Path

sys.stdout = open(sys.stdout.fileno(), 'w', encoding='utf-8', closefd=False)

DATA = Path("data")

# Try the yishuv page for Kfar Chabad
url = 'https://www.tabanow.co.il/%D7%99%D7%99%D7%A9%D7%95%D7%91/%D7%9B%D7%A4%D7%A8%20%D7%97%D7%91%D7%93'
req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read().decode('utf-8')
    print(f'Got {len(html)} bytes from yishuv page')
    
    # Look for plan links - any href containing תבע
    links = re.findall(r'href="([^"]*)"', html)
    plan_links = [l for l in links if '/תבע/' in l or '%D7%AA%D7%91%D7%A2' in l.lower()]
    print(f'Found {len(plan_links)} plan links')
    for l in plan_links[:80]:
        print(f'  {l}')
    
    # Also look for plan names in the body
    plans = re.findall(r'(?:גז|משמ|תמל|על|מח|גמ)/[\d\w/א-ת]{2,30}', html)
    unique_plans = sorted(set(plans))
    print(f'\nFound {len(unique_plans)} unique plan name patterns')
    for p in unique_plans[:50]:
        print(f'  {p}')
    
    # Check if page title/header gives info
    title = re.search(r'<title>(.*?)</title>', html)
    if title:
        print(f'\nPage title: {title.group(1)}')
    
    # Look for any API/data endpoints  
    apis = re.findall(r'(?:api|fetch|ajax|endpoint|url)["\s:=]+["\']([^"\']+)["\']', html, re.I)
    if apis:
        print(f'\nPossible API endpoints:')
        for a in apis[:10]:
            print(f'  {a}')
    
    # Save HTML for inspection
    with open('_tabanow_yishuv_page.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'\nSaved HTML to _tabanow_yishuv_page.html')
    
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
