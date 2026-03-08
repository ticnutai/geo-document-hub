"""Detailed Playwright debug of Complot SPA loading."""
from playwright.sync_api import sync_playwright
import json

SITE_ID = 31
TEST_PLAN = '425-0449702'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Capture ALL network requests
    all_requests = []
    all_responses = []
    
    def on_request(request):
        all_requests.append({'url': request.url, 'method': request.method})
    
    def on_response(response):
        all_responses.append({
            'url': response.url, 
            'status': response.status,
            'content_type': response.headers.get('content-type', ''),
        })
    
    page.on('request', on_request)
    page.on('response', on_response)
    
    # Navigate to binyan page
    url = f'https://sdan.complot.co.il/binyan/'
    print(f"1. Navigating to {url}")
    page.goto(url, timeout=60000, wait_until='networkidle')
    page.wait_for_timeout(3000)
    
    print(f"\n2. Requests made: {len(all_requests)}")
    
    # Show requests to handasi or magicscripts
    for r in all_requests:
        if 'handasi' in r['url'] or 'magic' in r['url']:
            print(f"  {r['method']} {r['url'][:150]}")
    
    # Check JavaScript globals
    print("\n3. Checking JS globals...")
    js_result = page.evaluate("""() => {
        return {
            xpaBaseURL: typeof xpaBaseURL !== 'undefined' ? xpaBaseURL : 'UNDEFINED',
            siteBaseURL: typeof siteBaseURL !== 'undefined' ? siteBaseURL : 'UNDEFINED',
            wsBaseURL: typeof wsBaseURL !== 'undefined' ? wsBaseURL : 'UNDEFINED',
            siteIdFn: typeof getSiteId !== 'undefined' ? getSiteId.toString().substring(0, 200) : 'UNDEFINED',
            siteIdValue: typeof getSiteId !== 'undefined' ? getSiteId() : 'UNDEFINED',
            locationHref: window.location.href,
            locationSearch: window.location.search,
            backboneHistory: typeof Backbone !== 'undefined' && Backbone.history ? 'active' : 'not active'
        }
    }""")
    for k, v in js_result.items():
        print(f"  {k}: {v}")
    
    # Now navigate via hash to trigger Backbone route
    print(f"\n4. Navigating via hash to #taba/{TEST_PLAN}")
    all_requests.clear()
    all_responses.clear()
    
    page.evaluate(f"window.location.hash = 'taba/{TEST_PLAN}'")
    page.wait_for_timeout(5000)
    
    print(f"\n5. Requests after hash change: {len(all_requests)}")
    for r in all_requests:
        if 'handasi' in r['url'] or 'magic' in r['url'] or 'mgrqispi' in r['url'] or 'Complot' in r['url']:
            print(f"  {r['method']} {r['url'][:200]}")
    
    # Show ALL requests that aren't static assets
    for r in all_requests:
        if not any(ext in r['url'] for ext in ['.css', '.js', '.png', '.jpg', '.gif', '.woff', '.ico']):
            print(f"  {r['method']} {r['url'][:200]}")
    
    # Check container content
    container = page.query_selector('#MainContainerHandasa')
    if container:
        inner = container.inner_html()
        print(f"\n6. Container HTML ({len(inner)} chars):")
        print(inner[:3000] if inner.strip() else "(empty)")
    
    # Check console errors
    print("\n7. Checking for JS errors...")
    
    # Try manually calling the API via browser's fetch
    print("\n8. Testing direct API call from browser...")
    api_url = f"magicscripts/mgrqispi.dll?appname=cixpa&prgname=GetTabaFile&siteid=31&n={TEST_PLAN}&arguments=siteid,n"
    fetch_result = page.evaluate(f"""async () => {{
        try {{
            const resp = await fetch('{api_url}');
            const text = await resp.text();
            return {{status: resp.status, len: text.length, preview: text.substring(0, 500)}};
        }} catch(e) {{
            return {{error: e.toString()}};
        }}
    }}""")
    print(f"  Fetch result: {json.dumps(fetch_result, ensure_ascii=False)[:500]}")
    
    browser.close()
    print("\nDone!")
