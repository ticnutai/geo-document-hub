"""
Intercept the download request on MAVAT by monitoring network traffic.
Use 'domcontentloaded' instead of 'networkidle'.
"""
from playwright.sync_api import sync_playwright
import json, time

MP_ID = "4005189510"  # test plan 425-1030113
BASE = "https://mavat.iplan.gov.il"

def main():
    api_requests = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        def on_request(req):
            if "rest/api" in req.url or "Attachment" in req.url or "attachment" in req.url:
                api_requests.append({
                    "url": req.url,
                    "method": req.method,
                    "type": req.resource_type,
                })

        def on_response(resp):
            if "rest/api" in resp.url:
                ct = resp.headers.get("content-type", "")
                print(f"  RESP: {resp.status} {resp.url[:120]}  ct={ct[:50]}")

        page.on("request", on_request)
        page.on("response", on_response)

        # Navigate to document tab directly
        url = f"{BASE}/SV4/1/{MP_ID}/320"
        print(f"Navigating to {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(8)  # wait for Angular to load and render

        print(f"\n=== API requests so far: {len(api_requests)} ===")
        for r in api_requests:
            print(f"  {r['method']} {r['url'][:150]}")

        # Now list all clickable elements related to downloads
        print("\n=== Looking for download elements ===")
        
        # Check for app-icone-file elements
        icone_files = page.query_selector_all('app-icone-file')
        print(f"app-icone-file: {len(icone_files)}")
        
        # Check any clickable file elements
        file_els = page.query_selector_all('[class*="file"], [class*="download"], [class*="doc"]')
        print(f"file/download/doc elements: {len(file_els)}")
        
        # Try to find specific download links/buttons
        all_anchors = page.query_selector_all('a[href*="attachment"], a[href*="Attachment"], a[href*="download"], a[download]')
        print(f"download anchors: {len(all_anchors)}")
        for a in all_anchors[:5]:
            href = a.get_attribute('href') or ''
            print(f"  href: {href}")

        # Get page HTML snippet for the documents area
        page_html = page.content()
        
        # Search for fileIcon or download elements
        import re
        # Find icone-file or fileIcon patterns
        matches = re.findall(r'<app-icone-file[^>]*>', page_html)
        print(f"\n=== app-icone-file tags: {len(matches)} ===")
        for m in matches[:5]:
            print(f"  {m}")

        # Also look for div.fileIcon
        matches2 = re.findall(r'<div[^>]*class="[^"]*fileIcon[^"]*"[^>]*>.*?</div>', page_html, re.DOTALL)
        print(f"\n=== fileIcon divs: {len(matches2)} ===")
        for m in matches2[:3]:
            print(f"  {m[:200]}")

        # Try using JS to click a document and capture the request
        # First, try an alternative: use page.request to call API directly
        print("\n=== Testing API patterns directly ===")
        
        # Test doc IDs from the plan data
        test_cases = [
            ("6000826574591", "horaot.pdf", "pdf"),      # הוראות (ID)
            ("6021874851", "horaot.pdf", "pdf"),           # הוראות (ATTACHMENT_ID)
            ("6000826574579", "tasrit.pdf", "pdf"),        # תשריט (ID)
            ("6021874839", "tasrit.pdf", "pdf"),           # תשריט (ATTACHMENT_ID)
        ]
        
        # Test various URL patterns
        url_patterns = [
            "/rest/api/SV4/Files/{id}",
            "/rest/api/SV4/File/{id}",
            "/rest/api/SV4/Attachment/{id}",
            "/rest/api/Attachment/{id}",
            "/rest/api/File/{id}",
            "/rest/api/Files/{id}",
            "/rest/api/SV4/Download/{id}",
            "/rest/api/SV4/1/File/{id}",
            "/rest/api/SV4/1/Attachment/{id}",
            "/rest/api/SV4/Document/{id}",
            "/rest/api/Document/{id}",
        ]
        
        # Use the first test case
        doc_id = test_cases[0][0]
        att_id = test_cases[1][0]
        
        for pattern in url_patterns:
            for test_id in [doc_id, att_id]:
                full_url = BASE + pattern.format(id=test_id)
                try:
                    resp = page.request.get(full_url, timeout=5000)
                    ct = resp.headers.get("content-type", "unknown")
                    body_len = len(resp.body())
                    status = resp.status
                    short_url = pattern.format(id=test_id)
                    if status != 404 and status != 500:
                        print(f"  *** {status} {short_url}  ct={ct[:50]}  size={body_len}")
                    else:
                        print(f"  {status} {short_url}")
                except Exception as ex:
                    print(f"  ERR {pattern.format(id=test_id)}: {ex}")

        browser.close()

if __name__ == "__main__":
    main()
