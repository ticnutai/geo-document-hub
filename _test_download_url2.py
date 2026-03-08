"""
Test download URL after establishing a MAVAT session by navigating to the page first.
"""
from playwright.sync_api import sync_playwright
import time

BASE = "https://mavat.iplan.gov.il"
PLAN_NUMBER = "425-1030113"
MP_ID = "4005189510"

# Test document
DOC_ID = 6000826574591
DOC_FNAME = "DOC_6000826574591.pdf"
DOC_EDNUM = "DAE747B80A899F721A40EA8DAAD55E338F46427559198DB85C60B0674158919F"
DOC_PLAN_EDN = "0337D384BE78619EC3A2C2AD1E34B21CC62D452DF3F44F514E42A9B9B703F23E"
ATT_ID = 6021874851

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Step 1: Navigate to the plan page to establish session
        url = f"{BASE}/SV4/1/{MP_ID}/310"
        print(f"Step 1: Navigating to {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(5)

        # Print cookies
        cookies = context.cookies()
        print(f"Cookies: {len(cookies)}")
        for c in cookies:
            print(f"  {c['name']}={c['value'][:50]}...")

        # Step 2: Intercept when we try the API call - check for redirects
        print("\nStep 2: Testing download URLs")

        # Also check what the plan data API call looks like
        plan_api_url = f"{BASE}/rest/api/SV4/1?mid={MP_ID}&guid=0"
        print(f"\nChecking plan API: {plan_api_url}")
        resp = page.request.get(plan_api_url, timeout=15000)
        print(f"  Status: {resp.status}, Size: {len(resp.body())}, CT: {resp.headers.get('content-type','?')[:50]}")

        # Try various ID types for eid
        test_params = [
            {"eid": DOC_ID, "fn": DOC_FNAME, "edn": DOC_EDNUM, "pn": PLAN_NUMBER, "label": "ID + edNum"},
            {"eid": DOC_ID, "fn": DOC_FNAME, "edn": DOC_PLAN_EDN, "pn": PLAN_NUMBER, "label": "ID + plan_edn"},
            {"eid": DOC_ID, "fn": DOC_FNAME, "edn": "temp-default", "pn": PLAN_NUMBER, "label": "ID + temp-default"},
            {"eid": ATT_ID, "fn": DOC_FNAME, "edn": DOC_EDNUM, "pn": PLAN_NUMBER, "label": "ATT_ID + edNum"},
            {"eid": ATT_ID, "fn": DOC_FNAME, "edn": DOC_PLAN_EDN, "pn": PLAN_NUMBER, "label": "ATT_ID + plan_edn"},
            {"eid": ATT_ID, "fn": DOC_FNAME, "edn": "temp-default", "pn": PLAN_NUMBER, "label": "ATT_ID + temp-default"},
        ]

        for params in test_params:
            url = f"{BASE}/rest/api/Attacments/?eid={params['eid']}&fn={params['fn']}&edn={params['edn']}&pn={params['pn']}"
            try:
                resp = page.request.get(url, timeout=15000)
                body = resp.body()
                ct = resp.headers.get("content-type", "?")
                is_pdf = body[:4] == b'%PDF' if len(body) > 4 else False
                print(f"  {params['label']}: {resp.status}, size={len(body)}, ct={ct[:40]}, pdf={is_pdf}")
                if len(body) > 0 and len(body) < 2000 and not is_pdf:
                    print(f"    Body: {body[:200]}")
            except Exception as ex:
                print(f"  {params['label']}: ERROR: {ex}")

        # Step 3: Try fetching the page content to see if we can trigger download via JS
        print("\nStep 3: Try evaluating JS in page context")
        
        # Navigate to the documents page
        doc_url = f"{BASE}/SV4/1/{MP_ID}/320"
        print(f"Navigating to documents page: {doc_url}")
        page.goto(doc_url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(8)

        # Try to use fetch API directly in the page context
        print("\nTrying fetch in page context...")
        result = page.evaluate(f"""
            async () => {{
                try {{
                    const url = '/rest/api/Attacments/?eid={DOC_ID}&fn={DOC_FNAME}&edn={DOC_EDNUM}&pn={PLAN_NUMBER}';
                    const resp = await fetch(url);
                    const blob = await resp.blob();
                    return {{status: resp.status, size: blob.size, type: blob.type, ct: resp.headers.get('content-type')}};
                }} catch(e) {{
                    return {{error: e.message}};
                }}
            }}
        """)
        print(f"  Fetch result: {result}")

        # Try with PLAN_ENTITY_DOC_NUM
        result2 = page.evaluate(f"""
            async () => {{
                try {{
                    const url = '/rest/api/Attacments/?eid={DOC_ID}&fn={DOC_FNAME}&edn={DOC_PLAN_EDN}&pn={PLAN_NUMBER}';
                    const resp = await fetch(url);
                    const blob = await resp.blob();
                    return {{status: resp.status, size: blob.size, type: blob.type, ct: resp.headers.get('content-type')}};
                }} catch(e) {{
                    return {{error: e.message}};
                }}
            }}
        """)
        print(f"  Fetch (plan_edn) result: {result2}")

        # Try temp-default
        result3 = page.evaluate(f"""
            async () => {{
                try {{
                    const url = '/rest/api/Attacments/?eid={DOC_ID}&fn={DOC_FNAME}&edn=temp-default&pn={PLAN_NUMBER}';
                    const resp = await fetch(url);
                    const blob = await resp.blob();
                    return {{status: resp.status, size: blob.size, type: blob.type, ct: resp.headers.get('content-type')}};
                }} catch(e) {{
                    return {{error: e.message}};
                }}
            }}
        """)
        print(f"  Fetch (temp-default) result: {result3}")

        browser.close()

if __name__ == "__main__":
    main()
