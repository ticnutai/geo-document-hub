"""Explore MAVAT REST API for plan documents."""
from playwright.sync_api import sync_playwright
import json
import re

# Test with approved plan 425-1030113 (mp_id=4005189510)
TEST_URL = "https://mavat.iplan.gov.il/SV4/1/4005189510/310"
MP_ID = "4005189510"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Capture ALL API responses
    api_data = []
    def on_response(response):
        url = response.url
        if 'rest/api' in url or 'api/' in url.lower():
            try:
                body = response.text()
            except:
                body = "(binary)"
            api_data.append({
                'url': url,
                'status': response.status,
                'type': response.headers.get('content-type', ''),
                'body': body[:5000] if isinstance(body, str) else body,
            })
    
    page.on('response', on_response)
    
    print(f"Navigating to {TEST_URL}")
    page.goto(TEST_URL, timeout=90000, wait_until='domcontentloaded')
    page.wait_for_timeout(10000)
    
    print(f"\nCaptured {len(api_data)} API responses:")
    for r in api_data:
        print(f"\n  === {r['status']} {r['url'][:200]} ===")
        print(f"  Type: {r['type']}")
        if r['body'] and r['body'] != '(binary)':
            # Try to parse JSON
            try:
                parsed = json.loads(r['body'])
                print(f"  JSON: {json.dumps(parsed, ensure_ascii=False)[:500]}")
            except:
                print(f"  Body: {r['body'][:300]}")
    
    # Now try to click on document/file tabs
    print("\n\n--- Trying to find document links by clicking tabs ---")
    
    # Look for elements with file-related text
    all_text = page.inner_text('body')
    for kw in ['תקנון', 'הוראות', 'תשריט', 'נספח', 'מסמכי', 'קבצים', 'מסמכים']:
        if kw in all_text:
            idx = all_text.find(kw)
            print(f"Found '{kw}' in page text at pos {idx}: ...{all_text[max(0,idx-30):idx+50]}...")
    
    # Look for elements with "file" or "document" in class/id
    file_els = page.query_selector_all('[class*="file"]')
    print(f"\nElements with class*='file': {len(file_els)}")
    for el in file_els[:10]:
        text = el.inner_text().strip()[:100]
        tag = el.evaluate("el => el.tagName")
        cls = el.get_attribute('class') or ''
        if text:
            print(f"  <{tag} class='{cls[:50]}'> {text}")
    
    # Look for download buttons/links
    for sel in ['a[download]', 'button[class*="download"]', '[class*="download"]', 
                'a[href*="file"]', 'a[href*="download"]', 'a[href*="attachment"]',
                'a[href*="Document"]', '[class*="tochnitFile"]']:
        els = page.query_selector_all(sel)
        if els:
            print(f"\n  {sel}: {len(els)} elements")
            for el in els[:5]:
                text = el.inner_text().strip()[:80]
                href = el.get_attribute('href') or ''
                print(f"    text='{text}' href='{href[:100]}'")
    
    browser.close()
    print("\nDone!")
