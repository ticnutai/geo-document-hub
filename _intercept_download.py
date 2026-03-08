"""
Intercept the actual download network request on MAVAT to find the URL pattern.
Navigate to a plan page and click a document download icon, capturing the request.
"""
from playwright.sync_api import sync_playwright
import json, time, re

MP_ID = "4005189510"  # test plan 425-1030113
URL = f"https://mavat.iplan.gov.il/SV4/1/{MP_ID}/310"

def main():
    requests_log = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Log ALL requests
        def on_request(req):
            requests_log.append({
                "url": req.url,
                "method": req.method,
                "resource": req.resource_type,
            })

        page.on("request", on_request)

        print(f"Navigating to {URL} ...")
        page.goto(URL, wait_until="networkidle", timeout=60000)
        print("Page loaded.")

        # Wait for documents tab content to appear
        time.sleep(3)

        # --- Approach 1: Search for all requests that already happened ---
        print("\n=== Requests so far ===")
        api_requests = [r for r in requests_log if "rest/api" in r["url"]]
        for r in api_requests:
            print(f"  {r['method']} {r['url']}")

        # --- Approach 2: Try to find and click a download element ---
        # Look for download icons / file icons
        download_els = page.query_selector_all('.fileIcon.download, .sv4-doc-download-zip, app-icone-file, .doc-download')
        print(f"\nFound {len(download_els)} download-like elements")

        # Also look for icone-file components
        icone_files = page.query_selector_all('app-icone-file')
        print(f"Found {len(icone_files)} app-icone-file elements")

        # Try to get attributes from the first few icone-file elements
        for i, el in enumerate(icone_files[:5]):
            attrs = page.evaluate("""(el) => {
                const attrs = {};
                for (const attr of el.attributes) {
                    attrs[attr.name] = attr.value;
                }
                // Also check for Angular properties
                const keys = Object.keys(el);
                const ngKey = keys.find(k => k.startsWith('__ng'));
                if (ngKey) {
                    try {
                        attrs['_ng_debug'] = JSON.stringify(el[ngKey]);
                    } catch(e) {}
                }
                return attrs;
            }""", el)
            print(f"\n  icone-file[{i}] attrs: {json.dumps(attrs, indent=2, ensure_ascii=False)}")

        # --- Approach 3: Search the main.js for GetAttachment endpoint ---
        # Evaluate in page context to extract the service
        print("\n=== Trying to extract Angular service info ===")
        result = page.evaluate("""() => {
            // Try to find the SVDservice or any service with GetAttachment
            const scripts = document.querySelectorAll('script[src]');
            const mainScript = Array.from(scripts).find(s => s.src.includes('main.'));
            return mainScript ? mainScript.src : 'no main script found';
        }""")
        print(f"Main script: {result}")

        # --- Approach 4: Find the documents section and try clicking ---
        # First, let's navigate to the documents tab
        # Tab IDs: 310=general, 320=documents?, etc.
        # Try going to document tab
        doc_tab_selectors = [
            'a[href*="/320"]',       # documents tab
            '.sv4-tabs a:nth-child(2)',
            '[role="tab"]:nth-child(2)',
        ]
        for sel in doc_tab_selectors:
            tab = page.query_selector(sel)
            if tab:
                print(f"\nFound documents tab: {sel}")
                break

        # Let's check what tabs are available
        tabs = page.query_selector_all('.sv4-tabs a, [role="tab"], .mat-tab-label')
        print(f"\nFound {len(tabs)} tab elements")
        for i, tab in enumerate(tabs[:10]):
            text = tab.inner_text().strip()
            href = tab.get_attribute('href') or ''
            print(f"  Tab[{i}]: text='{text}', href='{href}'")

        # Try navigating to documents page (320)
        requests_before = len(requests_log)
        doc_url = f"https://mavat.iplan.gov.il/SV4/1/{MP_ID}/320"
        print(f"\nNavigating to documents page: {doc_url}")
        page.goto(doc_url, wait_until="networkidle", timeout=60000)
        time.sleep(3)

        new_requests = requests_log[requests_before:]
        api_new = [r for r in new_requests if "rest/api" in r["url"]]
        print(f"\nNew API requests after docs page:")
        for r in api_new:
            print(f"  {r['method']} {r['url']}")

        # Now look for download elements on the documents page
        icone_files2 = page.query_selector_all('app-icone-file')
        print(f"\nFound {len(icone_files2)} app-icone-file on docs page")

        # Try clicking the first download element and capture the request
        if icone_files2:
            print("\nClicking first download element...")
            requests_before2 = len(requests_log)

            # Set up a download listener too
            try:
                with page.expect_event("download", timeout=5000) as download_info:
                    icone_files2[0].click()
                download = download_info.value
                print(f"Download triggered: {download.url}")
                print(f"Download suggested filename: {download.suggested_filename}")
            except Exception as e:
                print(f"No download event: {e}")

            time.sleep(3)
            new_requests2 = requests_log[requests_before2:]
            print(f"\nRequests after click ({len(new_requests2)}):")
            for r in new_requests2:
                print(f"  {r['method']} {r['url'][:200]}")

        # --- Approach 5: Try a direct API call pattern ---
        print("\n=== Testing direct API patterns ===")
        test_doc_id = "6000826574591"  # הוראות התכנית ID
        test_attachment_id = "6021874851"  # ATTACHMENT_ID

        patterns = [
            f"https://mavat.iplan.gov.il/rest/api/Attachment/{test_doc_id}",
            f"https://mavat.iplan.gov.il/rest/api/Attachment/{test_attachment_id}",
            f"https://mavat.iplan.gov.il/rest/api/SV4/Attachment/{test_doc_id}",
            f"https://mavat.iplan.gov.il/rest/api/SV4/Attachment/{test_attachment_id}",
            f"https://mavat.iplan.gov.il/rest/api/File/{test_doc_id}",
            f"https://mavat.iplan.gov.il/rest/api/File/{test_attachment_id}",
        ]
        for url in patterns:
            resp = page.request.get(url)
            ct = resp.headers.get("content-type", "")
            print(f"  {url[-60:]}  => {resp.status} ({ct[:40]})")

        browser.close()

if __name__ == "__main__":
    main()
