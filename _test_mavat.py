"""Test MAVAT plan page access and find document links."""
from playwright.sync_api import sync_playwright
import json
import re

# Test with a known plan
TEST_PLAN_URL = "https://mavat.iplan.gov.il/SV4/1/4005189510/310"  # 425-1030113 (approved plan)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Capture all network requests/responses
    responses = []
    def on_response(response):
        if any(kw in response.url.lower() for kw in ['document', 'file', 'download', 'pdf', 'attachment', 'api']):
            responses.append({
                'url': response.url,
                'status': response.status,
                'type': response.headers.get('content-type', ''),
            })
    page.on('response', on_response)
    
    print(f"Navigating to MAVAT: {TEST_PLAN_URL}")
    page.goto(TEST_PLAN_URL, timeout=90000, wait_until='domcontentloaded')
    page.wait_for_timeout(10000)
    
    content = page.content()
    print(f"Page length: {len(content)}")
    
    # Get the page title
    title = page.title()
    print(f"Title: {title}")
    
    # Look for document sections
    # MAVAT typically has tabs: מסמכי התוכנית, תשריטים, הוראות/תקנון
    tabs = page.query_selector_all('[role="tab"], .nav-tabs li, .tab-pane, [class*="tab"]')
    print(f"\nTabs found: {len(tabs)}")
    for tab in tabs[:10]:
        text = tab.inner_text().strip()[:100]
        tag = tab.evaluate("el => el.tagName")
        cls = tab.get_attribute('class') or ''
        print(f"  {tag}.{cls[:50]}: {text[:80]}")
    
    # Look for all links that might be documents
    links = page.query_selector_all('a[href]')
    doc_links = []
    for link in links:
        href = link.get_attribute('href') or ''
        text = link.inner_text().strip()
        if any(kw in href.lower() for kw in ['.pdf', '.doc', '.tif', '.jpg', 'download', 'file', 'document', 'attachment']):
            doc_links.append({'url': href, 'text': text})
        elif any(kw in text for kw in ['תקנון', 'הוראות', 'תשריט', 'מסמך', 'נספח', 'חתך', 'טבלה']):
            doc_links.append({'url': href, 'text': text})
    
    print(f"\nDocument links found: {len(doc_links)}")
    for dl in doc_links[:20]:
        print(f"  {dl['text'][:50]} -> {dl['url'][:150]}")
    
    # Check for iframe (MAVAT sometimes uses iframes)
    iframes = page.query_selector_all('iframe')
    print(f"\nIframes: {len(iframes)}")
    for iframe in iframes:
        src = iframe.get_attribute('src') or ''
        print(f"  {src[:200]}")
    
    # Captured API responses
    print(f"\nCaptured responses: {len(responses)}")
    for r in responses[:10]:
        print(f"  {r['status']} {r['url'][:150]}")
    
    # Try to find the documents section in the DOM
    print("\n--- Looking for document/file sections ---")
    for selector in ['#documents', '#files', '.documents', '.files', 
                     '[class*="document"]', '[class*="file"]', '[class*="attach"]',
                     '.tochnitFiles', '#tochnitFiles']:
        els = page.query_selector_all(selector)
        if els:
            print(f"  Found {len(els)} elements for '{selector}'")
            for el in els[:3]:
                text = el.inner_text()[:200]
                print(f"    {text}")
    
    # Save full page for inspection
    with open('_mavat_test.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("\nSaved page to _mavat_test.html")
    
    browser.close()
    print("\nDone!")
