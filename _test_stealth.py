"""Test Playwright with stealth plugin to bypass bot detection."""
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

URL = "https://sdan.complot.co.il/gush2/#gush/7188/14"

with sync_playwright() as p:
    s = Stealth()
    s.hook_playwright_context(p)
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    api_responses = []
    def on_response(response):
        if 'GetGushFile' in response.url:
            try:
                api_responses.append(response.text())
            except:
                pass
    page.on("response", on_response)
    
    print("Loading with stealth...")
    page.goto(URL, timeout=60000, wait_until='networkidle')
    page.wait_for_timeout(5000)
    
    container = page.query_selector('#MainContainerHandasa')
    if container:
        text = container.inner_text()
        has_migrash = 'מגרש' in text
        has_error = 'מצטערים' in text
        print(f"Container: {'MIGRASH!' if has_migrash else 'ERROR' if has_error else 'empty/other'} ({len(text)} chars)")
        if has_migrash:
            print(f"Data: {text[:400]}")
    else:
        print("Container NOT FOUND")
    
    for r in api_responses:
        print(f"API: {'MIGRASH!' if 'מגרש' in r else 'error'} ({len(r)} bytes)")
    
    # Try hash change
    if not any('מגרש' in r for r in api_responses):
        print("\nTrying hash change to helka 64...")
        page.evaluate("window.location.hash = 'gush/7188/64'")
        page.wait_for_timeout(3000)
        
        container = page.query_selector('#MainContainerHandasa')
        if container:
            text = container.inner_text()
            print(f"Container: {'MIGRASH!' if 'מגרש' in text else 'ERROR' if 'מצטערים' in text else 'empty'}")
            if 'מגרש' in text:
                print(f"Data: {text[:400]}")
    
    browser.close()
    print("Done!")
