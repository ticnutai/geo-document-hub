"""
1. Search for HTTP interceptors in main.js that add headers
2. Try window.open approach for downloads
3. Try adding headers to XHR
"""
from playwright.sync_api import sync_playwright
import json, time, re

MP_ID = "4005189510"
BASE = "https://mavat.iplan.gov.il"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Read the cached main.js
        with open("_mavat_main.js", "r", encoding="utf-8") as f:
            js = f.read()

        # Part 1: Search for HTTP interceptors
        print("=== Part 1: Searching for HTTP interceptors ===")
        patterns = [
            r'intercept\s*\([^)]*\)\s*\{[^}]{0,2000}',
            r'HTTP_INTERCEPTORS',
            r'HttpInterceptor',
            r'headers\.set\(',
            r'headers\.append\(',
            r'withCredentials',
        ]
        for pat in patterns:
            matches = re.findall(pat, js, re.IGNORECASE)
            print(f"\n  Pattern '{pat[:40]}': {len(matches)} matches")
            for m in matches[:2]:
                pos = js.find(m)
                ctx_start = max(0, pos - 100)
                ctx_end = min(len(js), pos + len(m) + 100)
                print(f"    ...{js[ctx_start:ctx_end][:400]}...")

        # Part 2: Navigate and test
        print("\n\n=== Part 2: Navigate and test download ===")
        url = f"{BASE}/SV4/1/{MP_ID}/310"
        print(f"Navigating to {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(10000)

        # Try XHR with various headers
        print("\n=== Part 3: XHR with headers ===")
        
        test_configs = [
            {"label": "with X-Requested-With", "headers": {"X-Requested-With": "XMLHttpRequest"}},
            {"label": "with Accept blob", "headers": {"Accept": "application/octet-stream"}},
            {"label": "with Accept */*", "headers": {"Accept": "*/*"}},
            {"label": "with Referer", "headers": {"Referer": f"{BASE}/SV4/1/{MP_ID}/310"}},
        ]

        for config in test_configs:
            result = page.evaluate(f"""(config) => {{
                return new Promise((resolve) => {{
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', '/rest/api/Attacments/?eid=6000826574591&fn=DOC_6000826574591.pdf&edn=DAE747B80A899F721A40EA8DAAD55E338F46427559198DB85C60B0674158919F&pn=425-1030113', true);
                    xhr.responseType = 'blob';
                    const headers = {config['headers']};
                    for (const [key, val] of Object.entries(headers)) {{
                        xhr.setRequestHeader(key, val);
                    }}
                    xhr.onload = function() {{
                        resolve({{status: xhr.status, size: xhr.response ? xhr.response.size : 0, type: xhr.response ? xhr.response.type : ''}});
                    }};
                    xhr.onerror = function() {{
                        resolve({{error: 'XHR error', status: xhr.status}});
                    }};
                    xhr.send();
                }});
            }}""",  json.dumps(config["headers"]))
            print(f"  {config['label']}: {result}")

        # Part 4: Try window.open to download the file (browser will download it)
        print("\n=== Part 4: Try direct navigation to Attacments URL ===")
        
        # Create a new page for download test
        download_url = f"{BASE}/rest/api/Attacments/?eid=6000826574591&fn=DOC_6000826574591.pdf&edn=DAE747B80A899F721A40EA8DAAD55E338F46427559198DB85C60B0674158919F&pn=425-1030113"
        
        page2 = browser.new_page()
        resp = page2.goto(download_url, wait_until="domcontentloaded", timeout=15000)
        if resp:
            print(f"  Status: {resp.status}")
            print(f"  CT: {resp.headers.get('content-type', '?')}")
            body = resp.body()
            print(f"  Size: {len(body)}")
            if len(body) > 0 and len(body) < 2000:
                print(f"  Body: {body[:500]}")
            elif len(body) > 2000:
                print(f"  First bytes: {body[:20]}")
                is_pdf = body[:4] == b'%PDF'
                print(f"  Is PDF: {is_pdf}")
                if is_pdf:
                    with open("_test_download.pdf", "wb") as f:
                        f.write(body)
                    print(f"  SAVED: _test_download.pdf")
        page2.close()

        # Part 5: Try with correct spelling Attachments
        print("\n=== Part 5: Direct navigate to Attachments URL ===")
        download_url2 = f"{BASE}/rest/api/Attachments/?eid=6000826574591&fn=DOC_6000826574591.pdf&edn=DAE747B80A899F721A40EA8DAAD55E338F46427559198DB85C60B0674158919F&pn=425-1030113"
        
        page3 = browser.new_page()
        try:
            resp2 = page3.goto(download_url2, wait_until="domcontentloaded", timeout=15000)
            if resp2:
                print(f"  Status: {resp2.status}")
                print(f"  URL: {page3.url}")
                print(f"  CT: {resp2.headers.get('content-type', '?')}")
                body2 = resp2.body()
                print(f"  Size: {len(body2)}")
                if len(body2) > 0 and len(body2) < 2000:
                    print(f"  Body: {body2[:500]}")
                elif len(body2) > 2000:
                    print(f"  First bytes: {body2[:20]}")
                    is_pdf = body2[:4] == b'%PDF'
                    print(f"  Is PDF: {is_pdf}")
                    if is_pdf:
                        with open("_test_download.pdf", "wb") as f:
                            f.write(body2)
                        print(f"  SAVED: _test_download.pdf")
        except Exception as e:
            print(f"  Error: {e}")
            print(f"  Final URL: {page3.url}")
        page3.close()

        # Part 6: Try without the edNum parameter
        print("\n=== Part 6: Try without edn ===")
        for variant in ["Attacments", "Attachments"]:
            download_url3 = f"{BASE}/rest/api/{variant}/?eid=6000826574591&fn=DOC_6000826574591.pdf&pn=425-1030113"
            page4 = browser.new_page()
            try:
                resp3 = page4.goto(download_url3, wait_until="domcontentloaded", timeout=15000)
                if resp3:
                    body3 = resp3.body()
                    print(f"  {variant} (no edn): status={resp3.status}, size={len(body3)}, is_pdf={body3[:4]==b'%PDF' if len(body3)>4 else False}")
                    if len(body3) > 2000 and body3[:4] == b'%PDF':
                        with open("_test_download.pdf", "wb") as f:
                            f.write(body3)
                        print(f"    SAVED!")
            except Exception as e:
                print(f"  {variant} (no edn): Error: {e}")
                print(f"    Final URL: {page4.url}")
            page4.close()

        browser.close()

if __name__ == "__main__":
    main()
