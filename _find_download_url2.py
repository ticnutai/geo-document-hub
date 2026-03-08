"""Extract download URL pattern from MAVAT's Angular main.js bundle."""
from playwright.sync_api import sync_playwright
import re

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Fetch the main.js bundle directly
    print("Fetching main.js bundle...")
    resp = page.request.get("https://mavat.iplan.gov.il/main.f53e191cf7958563.js")
    js_text = resp.text()
    print(f"Bundle size: {len(js_text)} bytes")
    
    # Search for attachment/download URL patterns
    patterns_to_search = [
        r'[Aa]ttac[hk]ment',
        r'download',
        r'[Gg]et[Ff]ile',
        r'[Gg]et[Dd]oc',
        r'ATTACHMENT_ID',
        r'rest/api.*[Ff]ile',
        r'rest/api.*[Dd]oc',
        r'rest/api.*[Aa]ttac',
        r'openFile',
        r'fileUrl',
        r'docUrl',
        r'downloadUrl',
        r'window\.open',
    ]
    
    for pattern in patterns_to_search:
        matches = list(re.finditer(pattern, js_text))
        if matches:
            print(f"\n=== Pattern '{pattern}' - {len(matches)} matches ===")
            for m in matches[:5]:
                start = max(0, m.start() - 80)
                end = min(len(js_text), m.end() + 80)
                context = js_text[start:end]
                # Clean up for display
                print(f"  ...{context}...")
    
    browser.close()
