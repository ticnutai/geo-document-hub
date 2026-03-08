"""Find GetAttachment and download URL construction in MAVAT's JS bundle."""
from playwright.sync_api import sync_playwright
import re

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    print("Fetching main.js bundle...")
    resp = page.request.get("https://mavat.iplan.gov.il/main.f53e191cf7958563.js")
    js_text = resp.text()
    
    # Search for GetAttachment implementation
    patterns = [
        r'GetAttachment',
        r'[Aa]ttachment.*[Uu]rl',
        r'rest/api.*[Aa]ttach',
        r'rest/api.*[Ff]ile',
        r'rest/api.*[Dd]ownload',
        r'dowloadFile',
        r'msSaveOrOpenBlob',
        r'createObjectURL',
        r'rest/api/SV',
        r'[Bb]lob\(',
    ]
    
    for pattern in patterns:
        matches = list(re.finditer(pattern, js_text))
        if matches:
            print(f"\n=== Pattern '{pattern}' - {len(matches)} matches ===")
            for m in matches[:8]:
                start = max(0, m.start() - 150)
                end = min(len(js_text), m.end() + 150)
                context = js_text[start:end]
                print(f"  ...{context}...")
                print()
    
    browser.close()
