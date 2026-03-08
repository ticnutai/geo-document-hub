"""Find the exact GetAttachment API URL in MAVAT's JS bundle."""
from playwright.sync_api import sync_playwright
import re

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    resp = page.request.get("https://mavat.iplan.gov.il/main.f53e191cf7958563.js")
    js_text = resp.text()
    
    # Search for GetAttachment function - wider context
    patterns = [
        r'GetAttachment\(',
        r'GetZipAttachment',
        r'getAttachmentData',
        r'PlanTasrit',
        r'/api/Attac',
        r'Gi\.url',
        r'responseType.*blob',
        r'SV4.*\d',
        r'rest/api',
    ]
    
    for pattern in patterns:
        matches = list(re.finditer(pattern, js_text))
        if matches:
            print(f"\n=== Pattern '{pattern}' - {len(matches)} matches ===")
            for m in matches[:5]:
                start = max(0, m.start() - 200)
                end = min(len(js_text), m.end() + 200)
                context = js_text[start:end]
                print(f"  ...{context}...")
                print()
    
    browser.close()
