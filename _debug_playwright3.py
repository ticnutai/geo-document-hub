"""Debug: check JS errors and network requests in Playwright."""
from playwright.sync_api import sync_playwright

URL = "https://sdan.complot.co.il/gush2/#gush/7188/64"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Capture console messages
    console_msgs = []
    page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}"))
    
    # Capture network requests to handasi
    api_calls = []
    def on_response(response):
        if 'handasi' in response.url or 'magicscripts' in response.url or 'complot' in response.url:
            api_calls.append({
                "url": response.url[:150],
                "status": response.status,
            })
    page.on("response", on_response)
    
    # Capture page errors
    page_errors = []
    page.on("pageerror", lambda err: page_errors.append(str(err)))
    
    print("Loading page...")
    page.goto(URL, timeout=60000, wait_until='networkidle')
    page.wait_for_timeout(5000)
    
    print(f"\n=== JS CONSOLE ({len(console_msgs)} messages) ===")
    for msg in console_msgs[-30:]:
        print(f"  {msg[:200]}")
    
    print(f"\n=== PAGE ERRORS ({len(page_errors)} errors) ===")
    for err in page_errors:
        print(f"  {err[:200]}")
    
    print(f"\n=== NETWORK REQUESTS ({len(api_calls)} to handasi/complot) ===")
    for call in api_calls:
        print(f"  [{call['status']}] {call['url']}")
    
    # Check if scripts loaded
    print("\n=== SCRIPT CHECK ===")
    has_backbone = page.evaluate("typeof Backbone !== 'undefined'")
    has_jquery = page.evaluate("typeof $ !== 'undefined' || typeof jQuery !== 'undefined'")
    has_site_id = page.evaluate("typeof site_id !== 'undefined' ? site_id : 'undefined'")
    print(f"  Backbone: {has_backbone}")
    print(f"  jQuery: {has_jquery}")
    print(f"  site_id: {has_site_id}")
    
    # Check MainContainerHandasa content
    container_html = page.evaluate("document.getElementById('MainContainerHandasa')?.innerHTML?.length || 0")
    print(f"\n  MainContainerHandasa innerHTML length: {container_html}")
    
    if container_html > 0:
        inner = page.evaluate("document.getElementById('MainContainerHandasa').innerHTML.substring(0, 500)")
        print(f"  Content: {inner}")
    
    browser.close()
