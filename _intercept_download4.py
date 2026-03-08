"""
1. Trace 302 redirects from Attachments endpoint
2. Click fileIcon elements on page 310
"""
from playwright.sync_api import sync_playwright
import json, time

MP_ID = "4005189510"
BASE = "https://mavat.iplan.gov.il"
DOC_ID = 6000826574591
EDNUM = "DAE747B80A899F721A40EA8DAAD55E338F46427559198DB85C60B0674158919F"
FNAME = "DOC_6000826574591.pdf"
PN = "425-1030113"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Part 1: Navigate to page 310 and get session
        url = f"{BASE}/SV4/1/{MP_ID}/310"
        print(f"Navigating to {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(10000)
        
        # Part 2: Try following redirect with manual fetch (no redirect follow)
        print("\n=== Part 2: Trace redirects ===")
        
        redirect_result = page.evaluate("""
            async () => {
                // Try Attachments (with h, plural)
                const urls = [
                    '/rest/api/Attachments/?eid=6000826574591&fn=DOC_6000826574591.pdf&edn=DAE747B80A899F721A40EA8DAAD55E338F46427559198DB85C60B0674158919F&pn=425-1030113',
                    '/rest/api/Attachment/?eid=6000826574591&fn=DOC_6000826574591.pdf&edn=DAE747B80A899F721A40EA8DAAD55E338F46427559198DB85C60B0674158919F&pn=425-1030113',
                ];
                const results = [];
                for (const url of urls) {
                    try {
                        const resp = await fetch(url, { redirect: 'manual' });
                        const location = resp.headers.get('location') || 'none';
                        results.push({
                            url: url.substring(0, 80),
                            status: resp.status,
                            location: location,
                            type: resp.type,
                            headers: Object.fromEntries(resp.headers.entries())
                        });
                    } catch(e) {
                        results.push({url: url.substring(0, 80), error: e.message});
                    }
                }
                return results;
            }
        """)
        for r in redirect_result:
            print(f"  {json.dumps(r, indent=2, ensure_ascii=False)}")
        
        # Part 3: Click on fileIcon elements on page 310
        print("\n=== Part 3: Click fileIcon elements ===")
        
        # Check what fileIcon elements look like
        file_icons_info = page.evaluate("""() => {
            const icons = document.querySelectorAll('[class*="fileIcon"]');
            const result = [];
            for (let i = 0; i < Math.min(icons.length, 5); i++) {
                const el = icons[i];
                result.push({
                    tagName: el.tagName,
                    className: el.className,
                    innerHTML: el.innerHTML.substring(0, 200),
                    outerHTML: el.outerHTML.substring(0, 300),
                    parentHTML: el.parentElement ? el.parentElement.outerHTML.substring(0, 300) : '',
                });
            }
            return result;
        }""")
        print(f"Found {len(file_icons_info)} fileIcon elements:")
        for i, info in enumerate(file_icons_info):
            print(f"\n  [{i}] tag={info['tagName']}, class={info['className']}")
            print(f"      outer: {info['outerHTML'][:200]}")
            print(f"      parent: {info['parentHTML'][:200]}")

        # Try to get Angular component debug info
        angular_debug = page.evaluate("""() => {
            const el = document.querySelector('[class*="fileIcon"]');
            if (!el) return 'no element';
            
            // Try to access Angular debug info
            const keys = Object.keys(el);
            const ngKeys = keys.filter(k => k.startsWith('__ng') || k.startsWith('_ng'));
            const result = { ngKeys };
            
            // Try ng.getComponent or ng.probe
            if (window.ng) {
                try {
                    const comp = window.ng.getComponent(el);
                    if (comp) {
                        result.component = Object.keys(comp);
                        result.entityDocID = comp.entityDocID || comp.entityDocId || 'not found';
                        result.entityDocNum = comp.entityDocNum || 'not found';
                        result.fileName = comp.fileName || comp.fname || 'not found';
                        result.fileType = comp.fileType || 'not found';
                    }
                } catch(e) { result.componentError = e.message; }
                
                // Try getContext
                try {
                    const ctx = window.ng.getContext(el);
                    if (ctx) {
                        result.context = Object.keys(ctx).slice(0, 20);
                    }
                } catch(e) { result.contextError = e.message; }
            } else {
                result.ng = 'not available';
            }
            
            return result;
        }""")
        print(f"\n  Angular debug: {json.dumps(angular_debug, indent=2, ensure_ascii=False)}")

        # Set up request interception before clicking
        all_reqs = []
        def on_request(req):
            if "Attac" in req.url or "attac" in req.url or "blob" in req.url:
                all_reqs.append({"url": req.url, "method": req.method})
                print(f"    REQ: {req.method} {req.url[:200]}")

        page.on("request", on_request)

        # Click the first fileIcon
        file_icons = page.query_selector_all('[class*="fileIcon"]')
        if file_icons:
            print(f"\nClicking first fileIcon element...")
            try:
                file_icons[0].click(timeout=3000)
            except Exception as e:
                print(f"  Click error: {e}")
            page.wait_for_timeout(5000)
            print(f"  Captured {len(all_reqs)} attachment requests after click")

        # Part 4: Try using XMLHttpRequest instead of fetch (Angular uses HttpClient which uses XHR)
        print("\n=== Part 4: Try XHR ===")
        xhr_result = page.evaluate("""() => {
            return new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', '/rest/api/Attacments/?eid=6000826574591&fn=DOC_6000826574591.pdf&edn=DAE747B80A899F721A40EA8DAAD55E338F46427559198DB85C60B0674158919F&pn=425-1030113', true);
                xhr.responseType = 'blob';
                xhr.onload = function() {
                    resolve({status: xhr.status, size: xhr.response ? xhr.response.size : 0, type: xhr.response ? xhr.response.type : ''});
                };
                xhr.onerror = function() {
                    resolve({error: 'XHR error', status: xhr.status});
                };
                xhr.send();
            });
        }""")
        print(f"  XHR Attacments result: {xhr_result}")

        # Try with correct spelling
        xhr_result2 = page.evaluate("""() => {
            return new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', '/rest/api/Attachments/?eid=6000826574591&fn=DOC_6000826574591.pdf&edn=DAE747B80A899F721A40EA8DAAD55E338F46427559198DB85C60B0674158919F&pn=425-1030113', true);
                xhr.responseType = 'blob';
                xhr.onload = function() {
                    resolve({status: xhr.status, size: xhr.response ? xhr.response.size : 0, type: xhr.response ? xhr.response.type : ''});
                };
                xhr.onerror = function() {
                    resolve({error: 'XHR error', status: xhr.status});
                };
                xhr.send();
            });
        }""")
        print(f"  XHR Attachments result: {xhr_result2}")

        browser.close()

if __name__ == "__main__":
    main()
