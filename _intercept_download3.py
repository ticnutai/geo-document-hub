"""
Navigate to MAVAT plan page, click on document download buttons,
and capture ALL network requests/responses to find the download URL.
"""
from playwright.sync_api import sync_playwright
import json, time

MP_ID = "4005189510"
BASE = "https://mavat.iplan.gov.il"

def main():
    all_requests = []
    all_responses = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        def on_request(req):
            all_requests.append({"url": req.url, "method": req.method})

        def on_response(resp):
            ct = resp.headers.get("content-type", "?")
            all_responses.append({
                "url": resp.url,
                "status": resp.status,
                "ct": ct,
                "size": None,  # don't read body to avoid blocking
            })
            if "rest/api" in resp.url or "Attac" in resp.url or "attac" in resp.url:
                print(f"  RESP: {resp.status} {resp.url[:150]} ct={ct[:50]}")

        page.on("request", on_request)
        page.on("response", on_response)

        # Step 1: Navigate to plan page
        url = f"{BASE}/SV4/1/{MP_ID}/310"
        print(f"Step 1: Navigating to {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(10000)

        # Step 2: Check what's on the page
        print(f"\nStep 2: Page analysis")
        page_title = page.title()
        print(f"  Title: {page_title}")

        # Look for document tabs using various approaches
        # In the MAVAT SPA, the docs section might be inside the current view
        
        # Check if there are any visible document elements
        elements_check = page.evaluate("""() => {
            const results = {};
            // Check for icone-file
            results.icone_file = document.querySelectorAll('app-icone-file').length;
            // Check for file download elements
            results.file_download = document.querySelectorAll('.fileIcon').length;
            // Check for document table rows
            results.doc_rows = document.querySelectorAll('.sv4-doc-row, .doc-row, tr.doc').length;
            // Check for tabs
            results.tabs = [];
            document.querySelectorAll('a, button, [role="tab"]').forEach(el => {
                const text = el.textContent.trim();
                if (text.includes('מסמכ') || text.includes('תשריט') || text.includes('פרסום') || text.includes('נספח')) {
                    results.tabs.push({text: text.substring(0, 50), tag: el.tagName, href: el.getAttribute('href') || ''});
                }
            });
            // Get all angular router links
            results.routerLinks = [];
            document.querySelectorAll('[routerlink], [ng-reflect-router-link]').forEach(el => {
                results.routerLinks.push(el.getAttribute('routerlink') || el.getAttribute('ng-reflect-router-link') || '');
            });
            return results;
        }""")
        print(f"  Elements: {json.dumps(elements_check, indent=2, ensure_ascii=False)}")

        # Step 3: Navigate to different sections of the SPA
        # Try different tab IDs
        tab_ids = [320, 330, 340, 350, 360]
        req_before = len(all_requests)

        for tab_id in tab_ids:
            tab_url = f"{BASE}/SV4/1/{MP_ID}/{tab_id}"
            print(f"\nStep 3: Navigate to tab {tab_id}: {tab_url}")
            
            req_before = len(all_requests)
            page.goto(tab_url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(5000)

            # Check for download elements
            n_icone = page.evaluate("document.querySelectorAll('app-icone-file').length")
            n_fileicon = page.evaluate("document.querySelectorAll('[class*=\"fileIcon\"]').length")
            n_download = page.evaluate("document.querySelectorAll('[class*=\"download\"]').length")
            print(f"  icone-file: {n_icone}, fileIcon: {n_fileicon}, download: {n_download}")

            new_reqs = all_requests[req_before:]
            api_reqs = [r for r in new_reqs if "rest/api" in r["url"]]
            if api_reqs:
                print(f"  New API requests:")
                for r in api_reqs:
                    print(f"    {r['method']} {r['url'][:150]}")

            # If we found download elements, try clicking them
            if n_icone > 0 or n_fileicon > 0 or n_download > 0:
                print(f"  ==> Found download elements! Trying to click...")
                
                # Try clicking the first icone-file
                el = page.query_selector('app-icone-file')
                if el:
                    req_before2 = len(all_requests)
                    try:
                        el.click(timeout=3000)
                        page.wait_for_timeout(3000)
                    except:
                        pass
                    new_reqs2 = all_requests[req_before2:]
                    if new_reqs2:
                        print(f"  Requests after click:")
                        for r in new_reqs2:
                            print(f"    {r['method']} {r['url'][:200]}")

                # Try clicking fileIcon
                el2 = page.query_selector('[class*="fileIcon"]')
                if el2:
                    req_before3 = len(all_requests)
                    try:
                        el2.click(timeout=3000)
                        page.wait_for_timeout(3000)
                    except:
                        pass
                    new_reqs3 = all_requests[req_before3:]
                    if new_reqs3:
                        print(f"  Requests after fileIcon click:")
                        for r in new_reqs3:
                            print(f"    {r['method']} {r['url'][:200]}")

        # Step 4: Look for all API calls made so far
        print(f"\n\nStep 4: All API requests ({len(all_requests)} total)")
        api_all = [r for r in all_requests if "rest/api" in r["url"]]
        seen_urls = set()
        for r in api_all:
            if r["url"] not in seen_urls:
                seen_urls.add(r["url"])
                print(f"  {r['method']} {r['url'][:200]}")

        # Step 5: Try fetching with different URL patterns in page context
        print("\n\nStep 5: Testing URLs via fetch in page context")
        doc_id = 6000826574591
        ednum = "DAE747B80A899F721A40EA8DAAD55E338F46427559198DB85C60B0674158919F"
        plan_edn = "0337D384BE78619EC3A2C2AD1E34B21CC62D452DF3F44F514E42A9B9B703F23E"
        fname = "DOC_6000826574591.pdf"
        pn = "425-1030113"
        att_id = 6021874851

        test_urls = [
            f"/rest/api/Attacments/?eid={doc_id}&fn={fname}&edn={ednum}&pn={pn}",
            f"/rest/api/Attacments/?eid={doc_id}&fn={fname}&edn={plan_edn}&pn={pn}",
            f"/rest/api/Attacments/?eid={att_id}&fn={fname}&edn={ednum}&pn={pn}",
            f"/rest/api/Attachments/?eid={doc_id}&fn={fname}&edn={ednum}&pn={pn}",  # with 'h'
            f"/rest/api/Attachment/?eid={doc_id}&fn={fname}&edn={ednum}&pn={pn}",
        ]

        for test_url in test_urls:
            result = page.evaluate(f"""
                async () => {{
                    try {{
                        const resp = await fetch('{test_url}');
                        const text = await resp.text();
                        return {{status: resp.status, size: text.length, ct: resp.headers.get('content-type'), body: text.substring(0, 200)}};
                    }} catch(e) {{
                        return {{error: e.message}};
                    }}
                }}
            """)
            print(f"  {test_url[:80]}...")
            print(f"    Result: status={result.get('status')}, size={result.get('size')}, body={result.get('body', '')[:100]}")

        browser.close()

if __name__ == "__main__":
    main()
