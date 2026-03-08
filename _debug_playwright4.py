"""Debug: try different Playwright modes to see if Cloudflare blocking is the issue."""
from playwright.sync_api import sync_playwright

URL = "https://sdan.complot.co.il/gush2/#gush/7188/64"

modes = [
    ("new headless", {"headless": True, "args": ["--disable-blink-features=AutomationControlled"]}),
    ("channel msedge", {"headless": True, "channel": "msedge"}),
]

for mode_name, launch_args in modes:
    print(f"\n{'='*60}")
    print(f"Mode: {mode_name}")
    print(f"{'='*60}")
    
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(**launch_args)
        except Exception as e:
            print(f"  Launch failed: {e}")
            continue
        
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="he-IL",
        )
        page = context.new_page()
        
        # Hide webdriver property
        page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        """)
        
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
            text = container.inner_text()[:300]
            has_migrash = 'מגרש' in text
            has_error = 'מצטערים' in text
            print(f"  Container text ({len(text)} chars): {'HAS MIGRASH!' if has_migrash else 'ERROR' if has_error else 'other'}")
            if has_migrash:
                print(f"  {text}")
        else:
            print(f"  Container NOT FOUND")
        
        if api_responses:
            api_response_body = api_responses[-1]
            has_m = 'מגרש' in api_response_body if api_response_body else False
            print(f"  API response ({len(api_response_body)} bytes): {'HAS MIGRASH' if has_m else 'no migrash'}")
            print(f"  First 200 chars: {api_response_body[:200]}")
        
        browser.close()

print("\nDone!")
