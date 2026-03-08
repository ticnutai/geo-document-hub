"""
Search MAVAT by block: 
1. Explore the full SV3 page - find advanced search toggle
2. Find the exact reCaptcha interceptor for POST 
3. Try the search with correctly placed token
"""
from playwright.sync_api import sync_playwright
import json, time

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    print("Loading MAVAT SV3 search page...", flush=True)
    page.goto("https://mavat.iplan.gov.il/SV3", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(6000)
    
    # Screenshot for debug
    page.screenshot(path="_mavat_sv3.png")
    
    # Find all clickable elements that might toggle advanced search
    elements = page.evaluate("""() => {
        const els = document.querySelectorAll('a, button, div[role=button], span[role=button], .toggle, .advanced, .expand');
        const results = [];
        for (const el of els) {
            const text = el.textContent?.trim();
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && text && text.length < 100) {
                results.push({
                    tag: el.tagName,
                    text: text.substring(0, 80),
                    class: el.className?.substring?.(0, 80) || '',
                    ariaLabel: el.getAttribute('aria-label') || '',
                    rect: {x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height)}
                });
            }
        }
        return results;
    }""")
    
    print(f"Found {len(elements)} clickable elements:", flush=True)
    for el in elements:
        if any(x in (el['text'] + el['class'] + el['ariaLabel']).lower() 
               for x in ['advanced', 'block', 'gush', 'parcel', 'location', 'more', 'expand', 'toggle',
                         'חיפוש', 'מתקדם', 'גוש', 'חלקה', 'מיקום', 'הרחב', 'נוסף']):
            print(f'  {el["tag"]} text="{el["text"][:50]}" class={el["class"][:40]} rect={el["rect"]}', flush=True)

    # Check for UK accordion or expandable panels
    panels = page.evaluate("""() => {
        const els = document.querySelectorAll('[uk-accordion], .uk-accordion, .accordion, details, .collapsible, .expandable, .advanced-search');
        return Array.from(els).map(el => ({
            tag: el.tagName,
            class: el.className?.substring?.(0, 100) || '',
            childCount: el.children?.length || 0,
            hidden: el.hidden,
            display: window.getComputedStyle(el).display,
        }));
    }""")
    print(f"\nAccordion/expandable panels: {len(panels)}", flush=True)
    for p in panels:
        print(f"  {p['tag']} class={p['class'][:60]} children={p['childCount']} display={p['display']}", flush=True)

    # Now look at the interceptor code from main.js for POST
    print("\n--- Checking POST interceptor in main.js ---", flush=True)
    import re
    with open('_mavat_main.js', 'r', encoding='utf-8') as f:
        js = f.read()
    
    # Find the addTokenAndAppIdToBody function
    for m in re.finditer(r'addTokenAndAppIdToBody', js):
        start = max(0, m.start()-50)
        end = min(len(js), m.end()+800)
        ctx = js[start:end]
        print(ctx, flush=True)
        print(flush=True)

    # Also find the token field name in POST body
    for m in re.finditer(r'auth.*token|token.*auth|Token.*Body|body.*token|recaptcha.*body', js, re.IGNORECASE):
        start = max(0, m.start()-100)
        end = min(len(js), m.end()+200)
        ctx = js[start:end]
        if 'body' in ctx.lower() and 'token' in ctx.lower():
            print(f"--- token/body at {m.start()} ---", flush=True)
            print(ctx, flush=True)
            print(flush=True)

    # Also: try intercepting what happens when the user actually types in the search box
    print("\n--- Trying text search with plan number to see request format ---", flush=True)
    
    captured_requests = []
    def on_req(req):
        if 'sv3' in req.url.lower() and 'Search' in req.url:
            captured_requests.append({
                'method': req.method,
                'url': req.url,
                'body': req.post_data,
                'headers': dict(req.headers)
            })
    
    page.on("request", on_req)
    
    # Type in the main search box and submit
    search_input = page.locator("input#sv3-search__input")
    if search_input.is_visible():
        search_input.fill("525")
        page.wait_for_timeout(500)
        
        # Find search button
        btns = page.evaluate("""() => {
            const btns = document.querySelectorAll('button');
            return Array.from(btns).filter(b => b.getBoundingClientRect().width > 0).map(b => ({
                text: b.textContent?.trim()?.substring(0, 50) || '',
                class: b.className?.substring(0, 60) || '',
                type: b.type || '',
                ariaLabel: b.getAttribute('aria-label') || '',
            }));
        }""")
        print(f"  Visible buttons:", flush=True)
        for b in btns:
            print(f"    text='{b['text']}' class={b['class'][:40]} type={b['type']}", flush=True)
        
        # Click search button
        search_btn = page.locator("button.search-button, button[type='submit'], button:has-text('חיפוש')")
        if search_btn.count() > 0:
            print(f"  Clicking search button...", flush=True)
            search_btn.first.click()
            page.wait_for_timeout(5000)
        else:
            # Try pressing Enter
            search_input.press("Enter")
            page.wait_for_timeout(5000)
    
    page.remove_listener("request", on_req)
    
    print(f"\n  Captured {len(captured_requests)} search requests:", flush=True)
    for cr in captured_requests:
        print(f"  {cr['method']} {cr['url'][:100]}", flush=True)
        if cr['body']:
            print(f"  Body: {cr['body'][:500]}", flush=True)
        if 'authorization' in cr['headers']:
            print(f"  Auth header present: {cr['headers']['authorization'][:30]}...", flush=True)
    
    browser.close()
    print("\nDone.", flush=True)
