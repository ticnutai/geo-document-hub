"""
Search MAVAT SV3 by block - fix button finding
"""
from playwright.sync_api import sync_playwright
import json, time

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    page.goto("https://mavat.iplan.gov.il/SV3", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(6000)

    # Click advanced search
    page.locator("button:has-text('חיפוש מתקדם')").first.click()
    page.wait_for_timeout(2000)

    # Fill block number
    block_input = page.locator("input[name='blockNumber']").first
    block_input.fill("6261")
    page.wait_for_timeout(500)

    # Find ALL visible buttons
    btns = page.evaluate("""() => {
        const btns = document.querySelectorAll('button, a.btn, input[type=submit]');
        return Array.from(btns).map(b => {
            const r = b.getBoundingClientRect();
            return {
                text: b.textContent?.trim()?.substring(0, 60),
                class: b.className?.substring(0, 80) || '',
                visible: r.width > 0 && r.height > 0,
                ariaLabel: b.getAttribute('aria-label') || '',
                type: b.type || '',
                x: Math.round(r.x), y: Math.round(r.y),
                w: Math.round(r.width), h: Math.round(r.height)
            };
        }).filter(b => b.visible);
    }""")
    
    print(f"Visible buttons ({len(btns)}):", flush=True)
    for b in btns:
        print(f"  text='{b['text'][:40]}' class={b['class'][:40]} aria='{b['ariaLabel']}' pos=({b['x']},{b['y']}) size={b['w']}x{b['h']}", flush=True)
    
    # Also check for submit buttons or search icons within the advanced panel
    adv_panel = page.evaluate("""() => {
        // Find the advanced search container
        const panels = document.querySelectorAll('.sv3-carousel-control, .advanced-search-panel, .search-form');
        const results = [];
        for (const p of panels) {
            const btns = p.querySelectorAll('button, a');
            for (const b of btns) {
                const r = b.getBoundingClientRect();
                if (r.width > 0) {
                    results.push({
                        text: b.textContent?.trim()?.substring(0, 60),
                        class: b.className?.substring(0, 80) || '',
                        tag: b.tagName,
                    });
                }
            }
        }
        return results;
    }""")
    print(f"\nButtons in panels: {len(adv_panel)}", flush=True)
    for p in adv_panel:
        print(f"  [{p['tag']}] text='{p['text'][:40]}' class={p['class'][:40]}", flush=True)

    # Screenshot
    page.screenshot(path="_advanced_search_open.png")
    
    # Try pressing Enter on the block field
    captured = []
    def on_resp(resp):
        if 'Search' in resp.url:
            try:
                captured.append({'url': resp.url, 'status': resp.status, 'body': resp.json()})
            except:
                captured.append({'url': resp.url, 'status': resp.status, 'body': None})
    
    page.on("response", on_resp)
    
    # Try pressing Enter
    block_input.press("Enter")
    page.wait_for_timeout(5000)
    
    if captured:
        for c in captured:
            print(f"\nCaptured: {c['url'][:80]} status={c['status']}", flush=True)
            if c['body']:
                if isinstance(c['body'], dict):
                    print(f"  total: {c['body'].get('total', 'N/A')}", flush=True)
                    data = c['body'].get('data', [])
                    print(f"  data count: {len(data)}", flush=True)
                    for d in data[:3]:
                        print(f"    {d.get('PL_NUMBER', '')} - {d.get('PL_NAME', '')}", flush=True)
    else:
        print("\nNo API response from Enter press", flush=True)
        
        # Try finding a search icon/button within the advanced panel
        # Look for any clickable element with search icon
        search_icons = page.evaluate("""() => {
            const els = document.querySelectorAll('[class*=search], [aria-label*=חיפוש], [class*=Search], .fa-search, .pi-search, .icon-search');
            return Array.from(els).map(el => {
                const r = el.getBoundingClientRect();
                return {
                    tag: el.tagName,
                    class: el.className?.substring?.(0, 80) || '',
                    text: el.textContent?.trim()?.substring(0, 40) || '',
                    visible: r.width > 0 && r.height > 0,
                    ariaLabel: el.getAttribute('aria-label') || ''
                };
            }).filter(el => el.visible);
        }""")
        print(f"\nSearch icons/elements ({len(search_icons)}):", flush=True)
        for si in search_icons:
            print(f"  [{si['tag']}] text='{si['text']}' class={si['class'][:40]} aria='{si['ariaLabel']}'", flush=True)
    
    page.remove_listener("response", on_resp)
    browser.close()
