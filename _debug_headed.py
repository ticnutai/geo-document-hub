"""Try Playwright headed (visible browser) mode."""
from playwright.sync_api import sync_playwright

URL = "https://sdan.complot.co.il/gush2/#gush/7188/14"

with sync_playwright() as p:
    print("Launching headed browser...")
    browser = p.chromium.launch(headless=False)
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},
    )
    page = context.new_page()
    
    # Hide webdriver
    page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => false });")
    
    api_responses = []
    def on_response(response):
        if 'GetGushFile' in response.url:
            try:
                api_responses.append(response.text())
            except:
                pass
    page.on("response", on_response)
    
    page.goto(URL, timeout=60000, wait_until='networkidle')
    page.wait_for_timeout(5000)
    
    container = page.query_selector('#MainContainerHandasa')
    if container:
        text = container.inner_text()
        has_migrash = 'מגרש' in text
        has_error = 'מצטערים' in text
        print(f"Container: {'MIGRASH!' if has_migrash else 'ERROR' if has_error else 'empty'}")
        if has_migrash:
            print(f"Text: {text[:300]}")
    else:
        print("Container NOT FOUND")
    
    for r in api_responses:
        print(f"API: {'MIGRASH!' if 'מגרש' in r else 'error'} ({len(r)} bytes)")
    
    # Try hash change
    print("\nTrying hash change to helka 64...")
    page.evaluate("window.location.hash = 'gush/7188/64'")
    page.wait_for_timeout(3000)
    
    if container:
        text2 = container.inner_text()
        print(f"Container: {'MIGRASH!' if 'מגרש' in text2 else 'ERROR' if 'מצטערים' in text2 else 'empty'}")
        if 'מגרש' in text2:
            print(f"Text: {text2[:300]}")
    
    browser.close()
    print("Done!")
