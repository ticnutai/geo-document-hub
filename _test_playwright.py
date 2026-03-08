"""Test Playwright access to Complot site."""
from playwright.sync_api import sync_playwright
import json
import re

SITE_ID = 31
BASE_URL = 'https://sdan.complot.co.il/binyan/'
XPA_BASE = 'https://handasi.complot.co.il/handasi2016/magicscripts/mgrqispi.dll?appname=cixpa&prgname='

# A known plan number from כפר חב"ד
TEST_PLAN = '425-0449702'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    print(f"Navigating to {BASE_URL}...")
    page.goto(BASE_URL, timeout=30000, wait_until='networkidle')
    page.wait_for_timeout(3000)
    
    content = page.content()
    print(f"Initial page length: {len(content)}")
    
    # Check if handasi scripts are loaded
    scripts = page.query_selector_all('script[src*="handasi"]')
    print(f"Handasi scripts on page: {len(scripts)}")
    for s in scripts:
        src = s.get_attribute('src')
        print(f"  Script: {src}")
    
    # Check for MainContainerHandasa
    container = page.query_selector('#MainContainerHandasa')
    if container:
        print("MainContainerHandasa found!")
        inner = container.inner_html()
        print(f"Container HTML: {inner[:500]}")
    else:
        print("No MainContainerHandasa")
    
    # Now navigate to a specific plan 
    plan_url = f"{BASE_URL}#taba/{TEST_PLAN}"
    print(f"\nNavigating to plan: {plan_url}")
    page.goto(plan_url, timeout=30000, wait_until='networkidle')
    page.wait_for_timeout(5000)
    
    content2 = page.content()
    print(f"Plan page length: {len(content2)}")
    
    container2 = page.query_selector('#MainContainerHandasa')
    if container2:
        inner2 = container2.inner_html()
        print(f"Plan container HTML ({len(inner2)} chars):")
        print(inner2[:3000])
    else:
        print("No container on plan page")
        # Look for any plan-related content
        if TEST_PLAN in content2:
            idx = content2.find(TEST_PLAN)
            print(f"Plan number found at {idx}: ...{content2[max(0,idx-200):idx+500]}...")
    
    # Also try intercepting XHR requests
    print("\n--- Trying XHR approach ---")
    # Set up request interception to capture API calls
    api_responses = []
    
    def handle_response(response):
        if 'mgrqispi' in response.url or 'ComplotPublicData' in response.url:
            try:
                body = response.text()
                api_responses.append({
                    'url': response.url,
                    'status': response.status,
                    'body_len': len(body),
                    'body_preview': body[:500]
                })
            except:
                api_responses.append({
                    'url': response.url,
                    'status': response.status,
                    'body_len': -1
                })
    
    page.on('response', handle_response)
    
    # Navigate again to capture XHR
    page.goto(plan_url, timeout=30000, wait_until='networkidle')
    page.wait_for_timeout(5000)
    
    print(f"\nCaptured {len(api_responses)} API responses:")
    for r in api_responses:
        print(f"  URL: {r['url'][:200]}")
        print(f"  Status: {r['status']}, Body: {r['body_len']} chars")
        if 'body_preview' in r:
            print(f"  Preview: {r['body_preview'][:200]}")
        print()
    
    browser.close()
    print("Done!")
