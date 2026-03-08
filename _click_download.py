"""
Click the <a> inside icone-file using Playwright's locator.click()
to trigger Angular's event system, and capture the actual API request.
"""
from playwright.sync_api import sync_playwright
import json, time

MP_ID = "4005189510"
BASE = "https://mavat.iplan.gov.il"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture ALL requests
        all_reqs = []
        def on_request(req):
            all_reqs.append({"url": req.url, "method": req.method, "headers": dict(req.headers)})
        
        all_resps = []
        def on_response(resp):
            all_resps.append({
                "url": resp.url,
                "status": resp.status,
                "ct": resp.headers.get("content-type", "?"),
            })

        page.on("request", on_request)
        page.on("response", on_response)

        # Navigate
        url = f"{BASE}/SV4/1/{MP_ID}/310"
        print(f"Navigating to {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(12000)

        # Find download links
        n_before = len(all_reqs)

        # Try different selectors for the clickable element
        selectors = [
            'div.fileIcon.download a[role="link"]',
            'div.fileIcon.download a',
            'div.fileIcon.download icone-file',
            'icone-file',
        ]

        for sel in selectors:
            locator = page.locator(sel)
            count = locator.count()
            print(f"\n  Selector '{sel}': {count} elements")
            
            if count > 0:
                # Get element info
                for i in range(min(count, 3)):
                    info = locator.nth(i).evaluate("""el => ({
                        tag: el.tagName,
                        class: el.className,
                        visible: el.offsetWidth > 0 && el.offsetHeight > 0,
                        text: el.textContent.substring(0, 50).trim(),
                        rect: el.getBoundingClientRect()
                    })""")
                    print(f"    [{i}]: {json.dumps(info, ensure_ascii=False)}")

        # Now try to click - use force to bypass visibility
        print("\n\n=== Clicking download link ===")
        n_before = len(all_reqs)
        
        # Try clicking the <a> element with force
        click_sel = 'div.fileIcon.download a[role="link"]'
        locator = page.locator(click_sel)
        if locator.count() > 0:
            print(f"Clicking first {click_sel}...")
            try:
                locator.first.click(force=True, timeout=5000)
            except Exception as e:
                print(f"  Click failed: {e}")
            
            page.wait_for_timeout(5000)
            
            # Show new requests
            new_reqs = all_reqs[n_before:]
            print(f"\n  New requests ({len(new_reqs)}):")
            for r in new_reqs:
                url_short = r["url"][:200]
                print(f"    {r['method']} {url_short}")
                # Check for Auth headers
                auth = r["headers"].get("authorization", "")
                if auth:
                    print(f"      Authorization: {auth[:80]}...")

            # Show new responses
            new_resps = [resp for resp in all_resps if resp["url"] in [r["url"] for r in new_reqs]]
            for resp in new_resps:
                print(f"    RESP: {resp['status']} {resp['url'][:150]} ct={resp['ct'][:50]}")

        # Alternative: try clicking the inner icone-file element
        print("\n\n=== Try icone-file click ===")
        n_before2 = len(all_reqs)
        
        icone_locator = page.locator('icone-file')
        if icone_locator.count() > 0:
            print(f"Found {icone_locator.count()} icone-file elements")
            try:
                icone_locator.first.click(force=True, timeout=5000)
            except Exception as e:
                print(f"  Click failed: {e}")
            
            page.wait_for_timeout(5000)
            
            new_reqs2 = all_reqs[n_before2:]
            print(f"\n  New requests ({len(new_reqs2)}):")
            for r in new_reqs2:
                print(f"    {r['method']} {r['url'][:200]}")
                auth = r["headers"].get("authorization", "")
                if auth:
                    print(f"      Authorization: {auth[:80]}...")

        # Alternative: use page.evaluate to find click handlers
        print("\n\n=== Try JS click trigger ===")
        n_before3 = len(all_reqs)
        
        result = page.evaluate("""() => {
            // Find the first icone-file and trigger its parent <a> click
            const iconeFile = document.querySelector('icone-file');
            if (!iconeFile) return 'no icone-file found';
            
            // Check for Angular event listeners
            const parentA = iconeFile.closest('a');
            if (parentA) {
                parentA.click();
                return 'clicked parent <a>';
            }
            
            iconeFile.click();
            return 'clicked icone-file';
        }""")
        print(f"  JS click result: {result}")
        page.wait_for_timeout(5000)
        
        new_reqs3 = all_reqs[n_before3:]
        print(f"\n  New requests ({len(new_reqs3)}):")
        for r in new_reqs3:
            print(f"    {r['method']} {r['url'][:200]}")
            auth = r["headers"].get("authorization", "")
            if auth:
                print(f"      Authorization: {auth[:80]}...")

        # One more try: use Tab + Enter to simulate keyboard interaction
        print("\n\n=== Try keyboard interaction ===")
        n_before4 = len(all_reqs)
        
        # Focus the first download link
        page.evaluate("""() => {
            const link = document.querySelector('div.fileIcon.download a[role="link"]');
            if (link) link.focus();
        }""")
        time.sleep(0.5)
        page.keyboard.press("Enter")
        page.wait_for_timeout(5000)
        
        new_reqs4 = all_reqs[n_before4:]
        print(f"\n  New requests ({len(new_reqs4)}):")
        for r in new_reqs4:
            print(f"    {r['method']} {r['url'][:200]}")
            auth = r["headers"].get("authorization", "")
            if auth:
                print(f"      Authorization: {auth[:80]}...")

        browser.close()

if __name__ == "__main__":
    main()
