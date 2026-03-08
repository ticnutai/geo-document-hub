"""Test download with CORRECTED parameters from Angular template binding.

Key discovery:
  entityDocID = t.ID  (was correct)
  entityDocNum = t.PLAN_ENTITY_DOC_NUM  (was WRONG - used FILE_DATA.edNum)
  fileName = planNumber + "_" + DOC_NAME  (was WRONG - used FILE_DATA.fname)
"""
from playwright.sync_api import sync_playwright
import json, time

PLAN_URL = "https://mavat.iplan.gov.il/SV4/1/4005189510/310"
API_BASE = "https://mavat.iplan.gov.il/rest/api"
RECAPTCHA_KEY = "6LeUKkMoAAAAAH4UacB4zewg4ult8Rcriv-ce0Db"

# Corrected parameters from the Angular template binding:
# entityDocID = t.ID
EID = "6000826574591"
# entityDocNum = t.PLAN_ENTITY_DOC_NUM (NOT FILE_DATA.edNum!)
EDN = "0337D384BE78619EC3A2C2AD1E34B21CC62D452DF3F44F514E42A9B9B703F23E"
# fileName = planNumber + "_" + DOC_NAME (NOT FILE_DATA.fname!)
FN = "425-1030113_הוראות התכנית"
PN = "425-1030113"

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    # Capture all API requests/responses
    captured = []
    def on_response(resp):
        url = resp.url
        if "Attacment" in url or "attacment" in url or "Attachment" in url:
            try:
                body = resp.body()
            except:
                body = b""
            captured.append({
                "url": url, "status": resp.status,
                "ct": resp.headers.get("content-type",""),
                "size": len(body), "body": body
            })
            print(f"  RESP: {resp.status} {url[:120]} ct={resp.headers.get('content-type','')} size={len(body)}")
            if len(body) > 0 and len(body) < 500:
                print(f"    Body: {body[:200]}")

    page.on("response", on_response)

    print("Navigating...")
    page.goto(PLAN_URL, wait_until="domcontentloaded", timeout=60000)
    # Wait for Angular app to render the documents tab
    page.wait_for_timeout(8000)
    print("Page loaded.")

    # Test 1: use page.evaluate with XMLHttpRequest (closer to Angular's HttpClient)
    # Get a FRESH token for EACH request
    print("\n=== Test 1: XHR with corrected params ===")
    result1 = page.evaluate(f"""async () => {{
        // Get fresh reCaptcha token
        const token = await new Promise((resolve, reject) => {{
            grecaptcha.execute('{RECAPTCHA_KEY}', {{action: 'importantAction'}}).then(resolve).catch(reject);
        }});
        console.log('Token:', token.substring(0, 40));
        
        // Build URL with corrected params
        const url = '{API_BASE}/Attacments/?eid={EID}&fn=' + encodeURIComponent('{FN}') + '&edn={EDN}&pn={PN}';
        console.log('URL:', url);
        
        return new Promise((resolve, reject) => {{
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'blob';
            xhr.setRequestHeader('Authorization', token);
            xhr.onload = function() {{
                resolve({{
                    status: xhr.status,
                    statusText: xhr.statusText,
                    type: xhr.response?.type,
                    size: xhr.response?.size,
                    contentType: xhr.getResponseHeader('Content-Type'),
                    contentDisposition: xhr.getResponseHeader('Content-Disposition'),
                    allHeaders: xhr.getAllResponseHeaders()
                }});
            }};
            xhr.onerror = function() {{
                reject('XHR error: ' + xhr.status);
            }};
            xhr.send();
        }});
    }}""")
    print(f"  Result: {json.dumps(result1, indent=2, ensure_ascii=False)}")

    # Test 2: Try without trailing slash
    print("\n=== Test 2: XHR without trailing slash ===")
    result2 = page.evaluate(f"""async () => {{
        const token = await grecaptcha.execute('{RECAPTCHA_KEY}', {{action: 'importantAction'}});
        const url = '{API_BASE}/Attacments?eid={EID}&fn=' + encodeURIComponent('{FN}') + '&edn={EDN}&pn={PN}';
        return new Promise((resolve, reject) => {{
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'blob';
            xhr.setRequestHeader('Authorization', token);
            xhr.onload = function() {{
                resolve({{
                    status: xhr.status,
                    size: xhr.response?.size,
                    type: xhr.response?.type,
                    ct: xhr.getResponseHeader('Content-Type'),
                    cd: xhr.getResponseHeader('Content-Disposition'),
                    headers: xhr.getAllResponseHeaders()
                }});
            }};
            xhr.onerror = (e) => reject('err');
            xhr.send();
        }});
    }}""")
    print(f"  Result: {json.dumps(result2, indent=2, ensure_ascii=False)}")

    # Test 3: Also try with FILE_DATA fields for comparison
    print("\n=== Test 3: XHR with FILE_DATA.edNum (old wrong param) for comparison ===")
    result3 = page.evaluate(f"""async () => {{
        const token = await grecaptcha.execute('{RECAPTCHA_KEY}', {{action: 'importantAction'}});
        const url = '{API_BASE}/Attacments/?eid={EID}&fn=DOC_6000826574591.pdf&edn=DAE747B80A899F721A40EA8DAAD55E338F46427559198DB85C60B0674158919F&pn={PN}';
        return new Promise((resolve, reject) => {{
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'blob';
            xhr.setRequestHeader('Authorization', token);
            xhr.onload = function() {{
                resolve({{status: xhr.status, size: xhr.response?.size, type: xhr.response?.type, ct: xhr.getResponseHeader('Content-Type')}});
            }};
            xhr.onerror = (e) => reject('err');
            xhr.send();
        }});
    }}""")
    print(f"  Result: {json.dumps(result3, indent=2, ensure_ascii=False)}")

    # Test 4: Try clicking the actual download. First check if elements are visible now
    print("\n=== Test 4: DOM inspection ===")
    info = page.evaluate("""() => {
        const icons = document.querySelectorAll('icone-file');
        const results = [];
        for (const icon of icons) {
            const rect = icon.getBoundingClientRect();
            const a = icon.closest('a[role="link"]') || icon.parentElement?.closest('a');
            const aRect = a ? a.getBoundingClientRect() : null;
            const parent = icon.closest('.fileIcon');
            const parentRect = parent ? parent.getBoundingClientRect() : null;
            results.push({
                rect: {x: rect.x, y: rect.y, w: rect.width, h: rect.height},
                aRect: aRect ? {x: aRect.x, y: aRect.y, w: aRect.width, h: aRect.height} : null,
                parentRect: parentRect ? {x: parentRect.x, y: parentRect.y, w: parentRect.width, h: parentRect.height} : null,
                visible: rect.width > 0 && rect.height > 0,
                computedDisplay: window.getComputedStyle(icon).display,
                parentDisplay: parent ? window.getComputedStyle(parent).display : null,
                grandparentClass: icon.parentElement?.parentElement?.className || '',
            });
        }
        return results;
    }""")
    print(f"  Found {len(info)} icone-file elements")
    for i, el in enumerate(info[:6]):
        print(f"  [{i}] visible={el['visible']} rect={el['rect']} display={el['computedDisplay']} parentDisplay={el['parentDisplay']}")
        if el['aRect']:
            print(f"       aRect={el['aRect']}")

    # Test 5: Check if the uk-visible@m class is causing the issue
    print("\n=== Test 5: Check CSS classes causing invisibility ===")
    css_info = page.evaluate("""() => {
        const icons = document.querySelectorAll('.fileIcon');
        const results = [];
        for (const icon of icons) {
            const rect = icon.getBoundingClientRect();
            let el = icon;
            const chain = [];
            while (el && el !== document.body) {
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || 
                    parseFloat(style.opacity) === 0 || rect.width === 0) {
                    chain.push({
                        tag: el.tagName,
                        class: el.className?.substring?.(0, 100) || '',
                        display: style.display,
                        visibility: style.visibility,
                        opacity: style.opacity,
                        overflow: style.overflow,
                        width: style.width,
                        height: style.height,
                    });
                }
                el = el.parentElement;
            }
            results.push({rect: {w: rect.width, h: rect.height}, hiddenChain: chain});
        }
        return results;
    }""")
    for i, item in enumerate(css_info[:4]):
        print(f"  [{i}] rect={item['rect']}")
        for j, h in enumerate(item['hiddenChain'][:5]):
            print(f"    hidden[{j}]: tag={h['tag']} class={h['class'][:60]} display={h['display']} vis={h['visibility']} opacity={h['opacity']} w={h['width']}")

    print("\n=== Captured download responses ===")
    for r in captured:
        print(f"  {r['status']} {r['url'][:100]} size={r['size']}")
        if r['size'] > 0 and r['size'] < 500:
            print(f"    Body: {r['body'][:200]}")
        if r['size'] > 500:
            print(f"    First 50 bytes: {r['body'][:50]}")
            print(f"    LOOKS LIKE A FILE! Content-Type: {r['ct']}")

    browser.close()
