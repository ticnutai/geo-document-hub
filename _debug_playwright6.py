"""Debug: Check cookies and try waiting longer for CF challenge."""
from playwright.sync_api import sync_playwright
import time

URL = "https://sdan.complot.co.il/gush2/"

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=["--disable-blink-features=AutomationControlled"]
    )
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        viewport={"width": 1920, "height": 1080},
        locale="he-IL",
    )
    page = context.new_page()
    
    # Hide webdriver
    page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => false });")
    
    print("1) Loading SPA base page...")
    page.goto(URL, timeout=60000, wait_until='networkidle')
    
    # Check cookies
    cookies = context.cookies()
    print(f"\n2) Cookies ({len(cookies)}):")
    for c in cookies:
        print(f"   {c['name']} = {c['value'][:50]}... (domain={c['domain']})")
    
    # Wait longer
    print("\n3) Waiting 10 seconds for CF challenge...")
    page.wait_for_timeout(10000)
    
    cookies2 = context.cookies()
    new_cookies = [c for c in cookies2 if c not in cookies]
    if new_cookies:
        print(f"   New cookies after wait:")
        for c in new_cookies:
            print(f"   {c['name']} = {c['value'][:50]}...")
    
    # Now navigate with hash
    print("\n4) Setting hash to gush/7188/14...")
    
    api_responses = []
    def on_response(response):
        if 'GetGushFile' in response.url or 'magicscripts' in response.url:
            try:
                body = response.text()
                api_responses.append({"url": response.url, "body": body, "status": response.status})
            except:
                pass
        if 'challenge' in response.url.lower():
            print(f"   CF: [{response.status}] {response.url[:100]}")
    page.on("response", on_response)
    
    page.evaluate("window.location.hash = 'gush/7188/14'")
    page.wait_for_timeout(5000)
    
    container = page.query_selector('#MainContainerHandasa')
    if container:
        text = container.inner_text()
        has_migrash = 'מגרש' in text
        has_error = 'מצטערים' in text
        print(f"   Container: {'MIGRASH!' if has_migrash else 'ERROR' if has_error else 'empty'}")
        if has_migrash:
            print(f"   Text: {text[:300]}")
    
    for resp in api_responses:
        print(f"   API [{resp['status']}]: {'MIGRASH' if 'מגרש' in resp['body'] else 'error'} ({len(resp['body'])} bytes)")
        # Print request headers if possible
        if 'מגרש' not in resp['body']:
            print(f"   Body: {resp['body'][:200]}")
    
    # Try helka 14 with direct page.goto to the full URL
    print("\n5) Trying page.goto with full hash URL...")
    page2 = context.new_page()
    page2.goto("https://sdan.complot.co.il/gush2/#gush/7188/14", timeout=60000, wait_until='networkidle')
    page2.wait_for_timeout(5000)
    
    container2 = page2.query_selector('#MainContainerHandasa')
    if container2:
        text2 = container2.inner_text()
        print(f"   Container: {'MIGRASH!' if 'מגרש' in text2 else 'ERROR' if 'מצטערים' in text2 else 'empty'}")
        if 'מגרש' in text2:
            print(f"   {text2[:300]}")
    
    browser.close()
