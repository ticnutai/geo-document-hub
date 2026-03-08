"""
1. Extract the reCaptcha interceptor logic from main.js
2. Try to trigger download via Angular's own mechanism
"""
from playwright.sync_api import sync_playwright
import json, time, re

MP_ID = "4005189510"
BASE = "https://mavat.iplan.gov.il"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Part 1: Examine the reCaptcha interceptor
        print("=== Part 1: reCaptcha interceptor ===")
        with open("_mavat_main.js", "r", encoding="utf-8") as f:
            js = f.read()

        # Find the interceptor class
        pos = js.find("intercept(n,t){return(0,Di.D)(this.handle(n,t))")
        if pos >= 0:
            # Get surrounding context (3000 chars before and after)
            ctx_start = max(0, pos - 500)
            ctx_end = min(len(js), pos + 2000)
            snippet = js[ctx_start:ctx_end]
            print(f"  Interceptor context:\n{snippet}\n")

        # Also search for 'recaptcha' keyword
        recaptcha_matches = [(m.start(), m.end()) for m in re.finditer(r'[Rr]e[Cc]aptcha', js)]
        print(f"\n  reCaptcha occurrences: {len(recaptcha_matches)}")
        for start, end in recaptcha_matches[:5]:
            ctx = js[max(0, start-100):min(len(js), end+200)]
            print(f"    ...{ctx}...")
            print()

        # Part 2: Navigate and try to click actual download elements  
        print("\n\n=== Part 2: Navigate and click downloads ===")
        page = browser.new_page()
        
        # Intercept all requests to see what happens
        all_reqs = []
        def on_request(req):
            url = req.url
            if any(k in url.lower() for k in ['attac', 'download', 'blob', 'file']):
                headers = req.headers
                all_reqs.append({"url": url, "method": req.method, "headers": dict(headers)})
                print(f"    REQ: {req.method} {url[:200]}")
                # Print interesting headers
                for hk in ['authorization', 'x-recaptcha', 'recaptcha-token', 'token']:
                    if hk in headers:
                        print(f"      Header {hk}: {headers[hk][:100]}")

        page.on("request", on_request)

        url = f"{BASE}/SV4/1/{MP_ID}/310"
        print(f"Navigating to {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(10000)

        # Find the actual download divs (not headers)
        download_divs = page.query_selector_all('div.fileIcon.download')
        print(f"\nFound {len(download_divs)} actual download divs")

        for i, div in enumerate(download_divs[:3]):
            # Get inner elements
            inner = page.evaluate("""(el) => {
                return {
                    outerHTML: el.outerHTML.substring(0, 500),
                    innerText: el.innerText.substring(0, 100),
                    // Find clickable child elements
                    children: Array.from(el.querySelectorAll('*')).map(c => ({
                        tag: c.tagName,
                        class: c.className,
                        text: c.textContent.substring(0, 50),
                        clickable: c.onclick != null || c.tagName === 'A' || c.tagName === 'BUTTON',
                    })).slice(0, 10),
                };
            }""", div)
            print(f"\n  [{i}]: {json.dumps(inner, indent=4, ensure_ascii=False)[:500]}")

        # Try force-clicking the first download div's inner element
        if download_divs:
            print("\n\nForce-clicking first download div...")
            try:
                # First dispatch click event
                download_divs[0].dispatch_event("click")
                page.wait_for_timeout(5000)
                print(f"  Captured {len(all_reqs)} download requests")
                for r in all_reqs:
                    print(f"    {r['method']} {r['url'][:200]}")
                    if r['headers']:
                        interesting = {k: v for k, v in r['headers'].items() 
                                      if k.lower() not in ['accept', 'user-agent', 'referer', 'sec-', 'accept-language', 'accept-encoding']}
                        if interesting:
                            print(f"    Headers: {json.dumps(interesting)}")
            except Exception as e:
                print(f"  Error: {e}")

        # Try clicking inner app-icone-file if it exists
        if download_divs:
            # Look for nested clickable elements
            inner_el = download_divs[0].query_selector('div[class*="icone"], div[class*="icon"], a, button, span')
            if inner_el:
                print(f"\nFound inner element, clicking...")
                all_reqs.clear()
                try:
                    inner_el.dispatch_event("click")
                    page.wait_for_timeout(5000)
                    print(f"  Captured {len(all_reqs)} requests")
                    for r in all_reqs:
                        print(f"    {r['method']} {r['url'][:200]}")
                except Exception as e:
                    print(f"  Error: {e}")

        # Part 3: Try to call the Angular service directly via page.evaluate
        print("\n\n=== Part 3: Call Angular download service ===")
        
        # Try to get Angular's injector and call the service
        result = page.evaluate("""() => {
            try {
                // Try getAllAngularRootElements
                const rootEls = document.querySelectorAll('[ng-version]');
                if (rootEls.length === 0) return {error: 'No Angular root elements'};
                
                // Try ng.getComponent on root
                if (window.ng && window.ng.getComponent) {
                    const root = rootEls[0];
                    const comp = window.ng.getComponent(root);
                    return {rootTag: root.tagName, compKeys: comp ? Object.keys(comp) : 'null', ng: 'available'};
                }
                
                // Check for Angular version
                const el = rootEls[0];
                return {version: el.getAttribute('ng-version'), rootTag: el.tagName, ng: typeof window.ng};
            } catch(e) {
                return {error: e.message};
            }
        }""")
        print(f"  Angular info: {json.dumps(result, indent=2, ensure_ascii=False)}")

        # Part 4: Search more carefully - look for the actual deployed API URL
        # Maybe the Gi object is modified at runtime
        print("\n\n=== Part 4: Check runtime Gi.url ===")
        result2 = page.evaluate("""() => {
            // Search for any global that contains 'rest/api'
            const results = {};
            // Check window properties
            for (const key of Object.getOwnPropertyNames(window)) {
                try {
                    const val = window[key];
                    if (typeof val === 'string' && val.includes('rest/api')) {
                        results[key] = val;
                    }
                    if (typeof val === 'object' && val !== null) {
                        const str = JSON.stringify(val);
                        if (str && str.includes('rest/api')) {
                            results[key] = str.substring(0, 200);
                        }
                    }
                } catch(e) {}
            }
            return results;
        }""")
        print(f"  Globals with rest/api: {json.dumps(result2, indent=2, ensure_ascii=False)}")

        browser.close()

if __name__ == "__main__":
    main()
