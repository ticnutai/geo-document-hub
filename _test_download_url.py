"""
Test the actual document download URL pattern.
URL: GET /rest/api/Attacments/?eid={ID}&fn={fname}&edn={edNum}&pn={planNumber}
"""
from playwright.sync_api import sync_playwright
import json

BASE = "https://mavat.iplan.gov.il"
PLAN_NUMBER = "425-1030113"

# Document data from rsPlanDocs
docs = [
    {
        "name": "הוראות התכנית",
        "id": 6000826574591,
        "fname": "DOC_6000826574591.pdf",
        "edNum": "DAE747B80A899F721A40EA8DAAD55E338F46427559198DB85C60B0674158919F",
        "plan_edn": "0337D384BE78619EC3A2C2AD1E34B21CC62D452DF3F44F514E42A9B9B703F23E",
        "file_type": "pdf",
    },
    {
        "name": "תשריט מצב מוצע",
        "id": 6000826574579,
        "fname": "DOC_6000826574579.pdf",
        "edNum": "7632F57B9158E2326BB625E994DCEA35E4CB7FCB1192532D77C24821FCEB1DD1",
        "plan_edn": "3E7B6A083B3FE38CD45721E11FC8CCCDC87915237BB67746F3D3C4EE95943A93",
        "file_type": "pdf",
    },
]

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for doc in docs:
            print(f"\n--- Testing: {doc['name']} ---")
            
            # Try different combinations of edn
            test_edns = {
                "FILE_DATA.edNum": doc["edNum"],
                "PLAN_ENTITY_DOC_NUM": doc["plan_edn"],
                "temp-default": "temp-default",
            }
            
            for edn_name, edn_val in test_edns.items():
                url = f"{BASE}/rest/api/Attacments/?eid={doc['id']}&fn={doc['fname']}&edn={edn_val}&pn={PLAN_NUMBER}"
                try:
                    resp = page.request.get(url, timeout=15000)
                    ct = resp.headers.get("content-type", "unknown")
                    body = resp.body()
                    status = resp.status
                    
                    # Check if it looks like a real PDF
                    is_pdf = body[:4] == b'%PDF' if len(body) > 4 else False
                    print(f"  edn={edn_name}: status={status}, size={len(body)}, ct={ct[:50]}, is_pdf={is_pdf}")
                    
                    if is_pdf:
                        # Save the test file
                        fname = f"_test_{doc['fname']}"
                        with open(fname, "wb") as f:
                            f.write(body)
                        print(f"    SAVED: {fname} ({len(body)} bytes)")
                except Exception as ex:
                    print(f"  edn={edn_name}: ERROR: {ex}")

            # Also try without edn
            url_no_edn = f"{BASE}/rest/api/Attacments/?eid={doc['id']}&fn={doc['fname']}&pn={PLAN_NUMBER}"
            try:
                resp = page.request.get(url_no_edn, timeout=15000)
                body = resp.body()
                is_pdf = body[:4] == b'%PDF' if len(body) > 4 else False
                print(f"  NO edn: status={resp.status}, size={len(body)}, is_pdf={is_pdf}")
            except Exception as ex:
                print(f"  NO edn: ERROR: {ex}")

        browser.close()

if __name__ == "__main__":
    main()
