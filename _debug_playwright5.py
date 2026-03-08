"""Debug: try Firefox in Playwright."""
from playwright.sync_api import sync_playwright

URL = "https://sdan.complot.co.il/gush2/#gush/7188/64"

with sync_playwright() as p:
    print("Trying Firefox...")
    browser = p.firefox.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},
        locale="he-IL",
    )
    page = context.new_page()
    
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
        print(f"  Container: {'HAS MIGRASH!' if has_migrash else 'ERROR' if has_error else 'empty/other'}")
        if has_migrash:
            print(f"  Text: {text[:500]}")
    
    if api_responses:
        body = api_responses[-1]
        print(f"  API: {'MIGRASH' if 'מגרש' in body else 'error'} ({len(body)} bytes)")
        if 'מגרש' in body:
            print(f"  {body[:500]}")
    
    browser.close()

    # Try Chromium with persistent context (like a real user)
    print("\nTrying Chromium with persistent context...")
    with p.chromium.launch_persistent_context(
        user_data_dir="./chromium_profile",
        headless=True,
        args=["--disable-blink-features=AutomationControlled"],
    ) as context:
        page = context.new_page()
        
        api_responses2 = []
        def on_response2(response):
            if 'GetGushFile' in response.url:
                try:
                    api_responses2.append(response.text())
                except:
                    pass
        page.on("response", on_response2)
        
        page.goto(URL, timeout=60000, wait_until='networkidle')
        page.wait_for_timeout(5000)
        
        container = page.query_selector('#MainContainerHandasa')
        if container:
            text = container.inner_text()
            has_migrash = 'מגרש' in text
            has_error = 'מצטערים' in text
            print(f"  Container: {'HAS MIGRASH!' if has_migrash else 'ERROR' if has_error else 'empty/other'}")
            if has_migrash:
                print(f"  Text: {text[:500]}")
        
        if api_responses2:
            body = api_responses2[-1]
            print(f"  API: {'MIGRASH' if 'מגרש' in body else 'error'} ({len(body)} bytes)")

print("\nDone!")
