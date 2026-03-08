"""
Search MAVAT for plans by block number (גוש).
Uses Playwright to navigate the MAVAT search page and intercept the POST request
to /rest/api/sv3/Search to discover the correct parameter format.
"""
from playwright.sync_api import sync_playwright
import json, sys, time

# כפר חב"ד blocks to search
BLOCKS = [525]  # Start with 525 to discover the API format

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    # Capture all requests and responses
    captured = []
    def on_request(req):
        if "sv3" in req.url.lower() or "search" in req.url.lower():
            body = req.post_data
            print(f"  REQ: {req.method} {req.url[:120]}")
            if body:
                print(f"    BODY: {body[:500]}")

    def on_response(resp):
        url = resp.url
        if "sv3" in url.lower() or "search" in url.lower():
            try:
                body = resp.body()
                ct = resp.headers.get("content-type", "")
                print(f"  RESP: {resp.status} {url[:120]} ct={ct} size={len(body)}")
                if len(body) < 5000:
                    print(f"    Body: {body[:2000]}")
                else:
                    print(f"    Body (first 1000): {body[:1000]}")
                captured.append({"url": url, "status": resp.status, "body": body})
            except:
                pass

    page.on("request", on_request)
    page.on("response", on_response)

    # Navigate to MAVAT search page
    print("Navigating to MAVAT search...")
    page.goto("https://mavat.iplan.gov.il/SV3", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(5000)
    print("Page loaded.")

    # Take screenshot to understand the search form
    page.screenshot(path="_mavat_search.png")

    # Explore the search form - find block input fields
    inputs = page.evaluate("""() => {
        const inputs = document.querySelectorAll('input, select');
        return Array.from(inputs).map(el => ({
            tag: el.tagName,
            type: el.type || '',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            class: el.className?.substring(0, 80) || '',
            label: el.labels?.[0]?.textContent?.trim() || '',
            ariaLabel: el.getAttribute('aria-label') || '',
            ngModel: el.getAttribute('ng-model') || el.getAttribute('formcontrolname') || '',
            visible: el.getBoundingClientRect().width > 0,
        }));
    }""")
    print(f"\nFound {len(inputs)} input elements:")
    for i, inp in enumerate(inputs):
        if inp['visible']:
            print(f"  [{i}] {inp['tag']} type={inp['type']} name={inp['name']} id={inp['id']}")
            print(f"       placeholder={inp['placeholder']} label={inp['label']} ariaLabel={inp['ariaLabel']}")

    # Look for Angular components related to block search
    angular_info = page.evaluate("""() => {
        // Look for autocomplete or specific search components
        const allEls = document.querySelectorAll('[formcontrolname], [ng-reflect-model], p-autocomplete, p-dropdown');
        return Array.from(allEls).map(el => ({
            tag: el.tagName,
            formControlName: el.getAttribute('formcontrolname') || '',
            ngModel: el.getAttribute('ng-reflect-model') || '',
            class: el.className?.substring(0, 80) || '',
            visible: el.getBoundingClientRect().width > 0,
            text: el.textContent?.trim().substring(0, 50) || '',
        }));
    }""")
    print(f"\nAngular form elements: {len(angular_info)}")
    for el in angular_info:
        if el['visible']:
            print(f"  {el['tag']} fcn={el['formControlName']} class={el['class'][:50]} text={el['text'][:30]}")

    # Search the page HTML for block-related content
    html_snippet = page.evaluate("""() => {
        // Find elements with text containing 'גוש' or 'block'
        const all = document.querySelectorAll('label, span, div, p, a, button');
        const results = [];
        for (const el of all) {
            const text = el.textContent?.trim();
            if (text && (text.includes('גוש') || text.includes('חלקה') || text.toLowerCase().includes('block'))) {
                if (text.length < 100) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 0) {
                        results.push({
                            tag: el.tagName,
                            text: text,
                            class: el.className?.substring(0, 60) || '',
                            rect: {x: rect.x, y: rect.y}
                        });
                    }
                }
            }
        }
        return results;
    }""")
    print(f"\nBlock-related visible elements: {len(html_snippet)}")
    for el in html_snippet:
        print(f"  {el['tag']} class={el['class'][:40]} text={el['text'][:60]}")

    # Try a direct POST to the search API with block parameter
    print("\n=== Direct API test: search by block 525 ===")
    result = page.evaluate("""async () => {
        // Get reCaptcha token
        const token = await grecaptcha.execute('6LeUKkMoAAAAAH4UacB4zewg4ult8Rcriv-ce0Db', {action: 'importantAction'});
        
        // Try the search API with block parameters
        const params = {
            "ESSION_ID": "",
            "GUSH": "525",
            "HELKA": "",
            "Ession": "",
            "LocBlockFrom": "525",
            "LocBlockTo": "525",
            "LocParcel": ""
        };
        
        const resp = await fetch('https://mavat.iplan.gov.il/rest/api/sv3/Search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(params)
        });
        
        const text = await resp.text();
        return {status: resp.status, size: text.length, body: text.substring(0, 3000)};
    }""")
    print(f"  Status: {result['status']}, Size: {result['size']}")
    print(f"  Body: {result['body'][:2000]}")

    browser.close()
