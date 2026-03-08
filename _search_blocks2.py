"""
Search MAVAT for plans by block number using the sv3/Search API.
Uses Playwright to handle reCaptcha tokens.

From Angular source analysis:
- POST to /rest/api/sv3/Search
- Model fields use Title/Value pairs
- getSelectedModelParams extracts Value from Title/Value objects
- Field names: blockNumber, toBlockNumber, parcelNumber, toParcelNumber, etc.
"""
from playwright.sync_api import sync_playwright
import json, time, sys

BLOCKS = [525]  # Start with one block to test

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    # Navigate to MAVAT SV3 search page to initialize Angular and reCaptcha
    print("Loading MAVAT search page...")
    page.goto("https://mavat.iplan.gov.il/SV3", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(6000)
    print("Page loaded.")

    # Try the search using Angular's own service via page.evaluate
    for block in BLOCKS:
        print(f"\n=== Searching block {block} ===")

        # Method 1: Use XHR to post to the API with correct params and reCaptcha
        result = page.evaluate("""async ([block]) => {
            // Get fresh reCaptcha token
            const token = await grecaptcha.execute('6LeUKkMoAAAAAH4UacB4zewg4ult8Rcriv-ce0Db', {action: 'importantAction'});

            // Build search params matching Angular model format
            // getSelectedModelParams: if Value has Title -> take Value, else take raw value
            const params = {
                blockNumber: block.toString(),
                toBlockNumber: block.toString()
            };

            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', 'https://mavat.iplan.gov.il/rest/api/sv3/Search', true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.setRequestHeader('Authorization', token);
                xhr.onload = function() {
                    resolve({
                        status: xhr.status,
                        size: xhr.responseText.length,
                        body: xhr.responseText.substring(0, 5000)
                    });
                };
                xhr.onerror = () => resolve({status: 0, error: 'network error'});
                xhr.send(JSON.stringify(params));
            });
        }""", [block])

        print(f"  Status: {result['status']}, Size: {result['size']}")

        if result['status'] == 200:
            try:
                data = json.loads(result['body'])
                if isinstance(data, list):
                    print(f"  Found {len(data)} plans")
                    for i, plan in enumerate(data[:5]):
                        pn = plan.get('PL_NUMBER', plan.get('pl_number', '?'))
                        pname = plan.get('PL_NAME', plan.get('pl_name', ''))[:60]
                        mp = plan.get('MP_ID', plan.get('mp_id', '?'))
                        print(f"    [{i}] {pn} - {pname} (mp_id={mp})")
                    if len(data) > 5:
                        print(f"    ... and {len(data)-5} more")
                elif isinstance(data, dict):
                    print(f"  Response keys: {list(data.keys())[:20]}")
                    # Check if it's paginated
                    if 'data' in data:
                        items = data['data']
                        print(f"  data: {len(items)} items")
                        for i, plan in enumerate(items[:5]):
                            pn = plan.get('PL_NUMBER', '?')
                            pname = plan.get('PL_NAME', '')[:60]
                            mp = plan.get('MP_ID', '?')
                            print(f"    [{i}] {pn} - {pname} (mp_id={mp})")
                    else:
                        print(f"  Body: {result['body'][:2000]}")
            except json.JSONDecodeError:
                print(f"  Body (not JSON): {result['body'][:500]}")
        else:
            print(f"  Body: {result['body'][:1000]}")

        # If failed, try alternative param formats
        if result['status'] != 200 or result['size'] < 10:
            print("\n  Trying alternative param formats...")
            alternatives = [
                {"blockNumber": str(block), "toBlockNumber": str(block), "searchType": 0},
                {"blockNumber": str(block), "toBlockNumber": str(block), "searchType": "0", "searchEntity": "1"},
                {"BLOCK_NUMBER": str(block)},
                {"block": str(block)},
                {"BlockNumber": str(block), "ToBlockNumber": str(block)},
            ]
            for alt_idx, alt_params in enumerate(alternatives):
                result2 = page.evaluate("""async ([params]) => {
                    const token = await grecaptcha.execute('6LeUKkMoAAAAAH4UacB4zewg4ult8Rcriv-ce0Db', {action: 'importantAction'});
                    return new Promise((resolve) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open('POST', 'https://mavat.iplan.gov.il/rest/api/sv3/Search', true);
                        xhr.setRequestHeader('Content-Type', 'application/json');
                        xhr.setRequestHeader('Authorization', token);
                        xhr.onload = function() {
                            resolve({status: xhr.status, size: xhr.responseText.length, body: xhr.responseText.substring(0, 2000)});
                        };
                        xhr.onerror = () => resolve({status: 0, error: 'network error'});
                        xhr.send(JSON.stringify(params));
                    });
                }""", [alt_params])
                print(f"  Alt {alt_idx} {alt_params}: status={result2['status']} size={result2['size']}")
                if result2['status'] == 200 and result2['size'] > 10:
                    print(f"    Body: {result2['body'][:1000]}")
                    break

    browser.close()
