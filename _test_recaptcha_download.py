"""
The endpoint needs a reCaptcha v3 token as Authorization header.
Flow:
1. Load MAVAT page (loads reCaptcha v3 SDK)
2. Execute grecaptcha.execute() to get token
3. Call /rest/api/Attacments/ with Authorization: <token>
"""
from playwright.sync_api import sync_playwright
import json, time

MP_ID = "4005189510"
BASE = "https://mavat.iplan.gov.il"
SITE_KEY = "6LeUKkMoAAAAAH4UacB4zewg4ult8Rcriv-ce0Db"

# Test document: הוראות התכנית
DOC_ID = 6000826574591
EDNUM = "DAE747B80A899F721A40EA8DAAD55E338F46427559198DB85C60B0674158919F"
FNAME = "DOC_6000826574591.pdf"
PN = "425-1030113"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Step 1: Navigate to MAVAT page
        url = f"{BASE}/SV4/1/{MP_ID}/310"
        print(f"Step 1: Navigating to {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(10000)

        # Step 2: Check if reCaptcha is loaded
        print("\nStep 2: Check reCaptcha")
        recaptcha_check = page.evaluate("""() => {
            return {
                grecaptcha: typeof grecaptcha,
                grecaptcha_enterprise: typeof grecaptcha?.enterprise,
                hasExecute: typeof grecaptcha?.execute,
                hasReady: typeof grecaptcha?.ready,
            };
        }""")
        print(f"  reCaptcha status: {recaptcha_check}")

        # Step 3: Get reCaptcha token
        print("\nStep 3: Get reCaptcha token")
        token = page.evaluate(f"""() => {{
            return new Promise((resolve, reject) => {{
                if (typeof grecaptcha === 'undefined') {{
                    reject('grecaptcha not loaded');
                    return;
                }}
                grecaptcha.ready(() => {{
                    grecaptcha.execute('{SITE_KEY}', {{action: 'importantAction'}})
                        .then(token => resolve(token))
                        .catch(err => reject(err.message || err));
                }});
            }});
        }}""")
        print(f"  Token: {token[:50]}..." if token else "  No token!")

        if not token:
            print("Failed to get token, aborting")
            browser.close()
            return

        # Step 4: Make API call with Authorization header
        print("\nStep 4: Test API call with token")
        result = page.evaluate(f"""(token) => {{
            return new Promise((resolve) => {{
                const xhr = new XMLHttpRequest();
                xhr.open('GET', '/rest/api/Attacments/?eid={DOC_ID}&fn={FNAME}&edn={EDNUM}&pn={PN}', true);
                xhr.responseType = 'blob';
                xhr.setRequestHeader('Authorization', token);
                xhr.onload = function() {{
                    resolve({{
                        status: xhr.status, 
                        size: xhr.response ? xhr.response.size : 0, 
                        type: xhr.response ? xhr.response.type : ''
                    }});
                }};
                xhr.onerror = function() {{
                    resolve({{error: 'XHR error', status: xhr.status}});
                }};
                xhr.send();
            }});
        }}""", token)
        print(f"  Result: {result}")

        if result.get('size', 0) > 0:
            # Step 5: Download the actual file
            print("\nStep 5: Downloading file...")
            file_data = page.evaluate(f"""(token) => {{
                return new Promise((resolve) => {{
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', '/rest/api/Attacments/?eid={DOC_ID}&fn={FNAME}&edn={EDNUM}&pn={PN}', true);
                    xhr.responseType = 'arraybuffer';
                    xhr.setRequestHeader('Authorization', token);
                    xhr.onload = function() {{
                        if (xhr.response) {{
                            // Convert to base64
                            const bytes = new Uint8Array(xhr.response);
                            let binary = '';
                            bytes.forEach(b => binary += String.fromCharCode(b));
                            resolve({{
                                status: xhr.status,
                                size: bytes.length,
                                data: btoa(binary),
                                type: xhr.getResponseHeader('content-type')
                            }});
                        }} else {{
                            resolve({{error: 'no response'}});
                        }}
                    }};
                    xhr.onerror = function() {{
                        resolve({{error: 'XHR error'}});
                    }};
                    xhr.send();
                }});
            }}""", token)
            
            if file_data.get('data'):
                import base64
                data = base64.b64decode(file_data['data'])
                is_pdf = data[:4] == b'%PDF'
                print(f"  Downloaded {len(data)} bytes, is_pdf={is_pdf}, type={file_data.get('type')}")
                
                if is_pdf or len(data) > 1000:
                    fname = f"data/_test_{FNAME}"
                    with open(fname, "wb") as ff:
                        ff.write(data)
                    print(f"  SAVED: {fname}")
            else:
                print(f"  Download result: {file_data}")
        else:
            # Maybe try PLAN_ENTITY_DOC_NUM as edn
            plan_edn = "0337D384BE78619EC3A2C2AD1E34B21CC62D452DF3F44F514E42A9B9B703F23E"
            print(f"\n  Trying with PLAN_ENTITY_DOC_NUM as edn...")
            result2 = page.evaluate(f"""(token) => {{
                return new Promise((resolve) => {{
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', '/rest/api/Attacments/?eid={DOC_ID}&fn={FNAME}&edn={plan_edn}&pn={PN}', true);
                    xhr.responseType = 'blob';
                    xhr.setRequestHeader('Authorization', token);
                    xhr.onload = function() {{
                        resolve({{status: xhr.status, size: xhr.response ? xhr.response.size : 0, type: xhr.response ? xhr.response.type : ''}});
                    }};
                    xhr.onerror = function() {{
                        resolve({{error: 'XHR error', status: xhr.status}});
                    }};
                    xhr.send();
                }});
            }}""", token)
            print(f"  Result: {result2}")

            # Also try temp-default
            print(f"\n  Trying with 'temp-default' as edn...")
            result3 = page.evaluate(f"""(token) => {{
                return new Promise((resolve) => {{
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', '/rest/api/Attacments/?eid={DOC_ID}&fn={FNAME}&edn=temp-default&pn={PN}', true);
                    xhr.responseType = 'blob';
                    xhr.setRequestHeader('Authorization', token);
                    xhr.onload = function() {{
                        resolve({{status: xhr.status, size: xhr.response ? xhr.response.size : 0, type: xhr.response ? xhr.response.type : ''}});
                    }};
                    xhr.onerror = function() {{
                        resolve({{error: 'XHR error', status: xhr.status}});
                    }};
                    xhr.send();
                }});
            }}""", token)
            print(f"  Result: {result3}")

        browser.close()

if __name__ == "__main__":
    main()
