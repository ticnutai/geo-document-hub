"""
1. Set a large viewport so elements are visible
2. Click download and capture the REAL request with the reCaptcha token
"""
from playwright.sync_api import sync_playwright
import json, time, base64

MP_ID = "4005189510"
BASE = "https://mavat.iplan.gov.il"
SITE_KEY = "6LeUKkMoAAAAAH4UacB4zewg4ult8Rcriv-ce0Db"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set large viewport
        page = browser.new_page(viewport={"width": 1920, "height": 1080})

        # Capture requests
        download_reqs = []
        def on_request(req):
            url = req.url
            if "Attac" in url or "attac" in url or "download" in url.lower():
                download_reqs.append({
                    "url": url,
                    "method": req.method,
                    "headers": dict(req.headers),
                })
                print(f"  REQ: {req.method} {url[:200]}")
                auth = req.headers.get("authorization", "")
                if auth:
                    print(f"    Auth: {auth[:100]}...")

        download_resps = []
        def on_response(resp):
            url = resp.url
            if "Attac" in url or "attac" in url or "download" in url.lower():
                ct = resp.headers.get("content-type", "?")
                try:
                    body = resp.body()
                    size = len(body)
                except:
                    body = None
                    size = -1
                download_resps.append({
                    "url": url,
                    "status": resp.status,
                    "ct": ct,
                    "size": size,
                    "body": body,
                })
                print(f"  RESP: {resp.status} {url[:150]} ct={ct[:50]} size={size}")

        page.on("request", on_request)
        page.on("response", on_response)

        # Navigate
        url = f"{BASE}/SV4/1/{MP_ID}/310"
        print(f"Navigating to {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(12000)

        # Check visibility with large viewport
        visible_check = page.evaluate("""() => {
            const els = document.querySelectorAll('div.fileIcon.download a[role="link"]');
            return Array.from(els).map((el, i) => ({
                idx: i,
                visible: el.offsetWidth > 0 && el.offsetHeight > 0,
                rect: el.getBoundingClientRect(),
                parentVisible: el.parentElement.offsetWidth > 0,
            }));
        }""")
        print(f"\nDownload links visibility:")
        for vc in visible_check:
            print(f"  [{vc['idx']}]: visible={vc['visible']}, rect={vc['rect']}")

        # Scroll to make elements visible if needed
        page.evaluate("""() => {
            const el = document.querySelector('div.fileIcon.download a[role="link"]');
            if (el) el.scrollIntoView();
        }""")
        time.sleep(1)

        # Try clicking with large viewport
        print("\n\n=== Clicking download ===")
        link = page.locator('div.fileIcon.download a[role="link"]').first
        
        try:
            link.scroll_into_view_if_needed(timeout=3000)
        except:
            pass
        
        try:
            link.click(timeout=5000)
            print("Click succeeded!")
        except Exception as e:
            print(f"Click failed: {e}")
            # Try force click
            try:
                link.click(force=True, timeout=5000)
                print("Force click succeeded!")
            except Exception as e2:
                print(f"Force click also failed: {e2}")

        page.wait_for_timeout(5000)

        print(f"\nCaptured {len(download_reqs)} download requests")
        for r in download_reqs:
            print(f"  {r['method']} {r['url']}")
            auth = r['headers'].get('authorization', '')
            if auth:
                print(f"    Auth: {auth[:100]}...")

        print(f"\nCaptured {len(download_resps)} download responses")
        for r in download_resps:
            print(f"  {r['status']} {r['url'][:150]} size={r['size']}")
            if r['body'] and r['size'] < 2000:
                print(f"    Body: {r['body'][:200]}")
            elif r['body'] and r['size'] > 0:
                print(f"    First bytes: {r['body'][:20]}")
                is_pdf = r['body'][:4] == b'%PDF'
                print(f"    Is PDF: {is_pdf}")

        # Also check: maybe the API URL has changed. Let me test with the reCaptcha token directly
        print("\n\n=== Direct API test with token ===")
        
        # Get fresh token
        token = page.evaluate(f"""() => {{
            return new Promise((resolve, reject) => {{
                grecaptcha.ready(() => {{
                    grecaptcha.execute('{SITE_KEY}', {{action: 'importantAction'}})
                        .then(token => resolve(token))
                        .catch(err => reject(err.toString()));
                }});
            }});
        }}""")
        print(f"Token: {token[:60]}...")
        
        # Try different URL patterns
        doc_id = 6000826574591
        ednum = "DAE747B80A899F721A40EA8DAAD55E338F46427559198DB85C60B0674158919F"
        fname = "DOC_6000826574591.pdf"
        pn = "425-1030113"
        
        # Test many URL variations
        url_tests = [
            f"/rest/api/Attacments/?eid={doc_id}&fn={fname}&edn={ednum}&pn={pn}",
            f"/rest/api/Attacments?eid={doc_id}&fn={fname}&edn={ednum}&pn={pn}",  # without trailing /
            f"/rest/api/attacments/?eid={doc_id}&fn={fname}&edn={ednum}&pn={pn}",  # lowercase
            f"/rest/api/Attacments/?eid={int(doc_id)}&fn={fname}&edn={ednum}&pn={pn}",  # explicit int
        ]
        
        for test_url in url_tests:
            result = page.evaluate(f"""(token) => {{
                return new Promise((resolve) => {{
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', '{test_url}', true);
                    xhr.responseType = 'arraybuffer';
                    xhr.setRequestHeader('Authorization', token);
                    xhr.onload = function() {{
                        const bytes = new Uint8Array(xhr.response || new ArrayBuffer(0));
                        let preview = '';
                        for (let i = 0; i < Math.min(bytes.length, 50); i++) {{
                            preview += String.fromCharCode(bytes[i]);
                        }}
                        resolve({{
                            status: xhr.status, 
                            size: bytes.length,
                            ct: xhr.getResponseHeader('content-type'),
                            preview: preview,
                            allHeaders: xhr.getAllResponseHeaders().substring(0, 500)
                        }});
                    }};
                    xhr.onerror = function() {{
                        resolve({{error: 'XHR error', status: xhr.status}});
                    }};
                    xhr.send();
                }});
            }}""", token)
            print(f"\n  URL: {test_url[:80]}")
            print(f"  Result: status={result.get('status')}, size={result.get('size')}, ct={result.get('ct')}")
            preview = result.get('preview', '')
            if preview:
                print(f"  Preview: {repr(preview[:100])}")

        browser.close()

if __name__ == "__main__":
    main()
