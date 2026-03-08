"""
Search MAVAT for plans by block number.
Fix: reCaptcha token for POST goes in both Authorization header AND in the body (auth field).
"""
from playwright.sync_api import sync_playwright
import json, time, sys

BLOCKS = [525]

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    print("Loading MAVAT search page...", flush=True)
    page.goto("https://mavat.iplan.gov.il/SV3", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(6000)
    print("Page loaded.", flush=True)

    for block in BLOCKS:
        print(f"\nSearching block {block}...", flush=True)

        # Try multiple param formats with token in body
        formats = [
            # Format 1: token in body as 'auth' field
            {"blockNumber": str(block), "toBlockNumber": str(block), "auth": "__TOKEN__"},
            # Format 2: as Authorization header only
            {"blockNumber": str(block), "toBlockNumber": str(block)},
            # Format 3: with more fields
            {"blockNumber": str(block), "toBlockNumber": str(block), "parcelNumber": "", "toParcelNumber": "", "auth": "__TOKEN__"},
        ]

        for fmt_idx, params in enumerate(formats):
            use_auth_body = "__TOKEN__" in json.dumps(params)
            result = page.evaluate("""async ([params, useAuthBody]) => {
                const token = await grecaptcha.execute('6LeUKkMoAAAAAH4UacB4zewg4ult8Rcriv-ce0Db', {action: 'importantAction'});

                // For POST: add token to body
                if (useAuthBody) {
                    params.auth = token;
                }

                return new Promise((resolve) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', 'https://mavat.iplan.gov.il/rest/api/sv3/Search', true);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.setRequestHeader('Authorization', token);
                    xhr.onload = function() {
                        resolve({status: xhr.status, size: xhr.responseText.length, body: xhr.responseText.substring(0, 3000)});
                    };
                    xhr.onerror = () => resolve({status: 0, error: 'network error'});
                    xhr.send(JSON.stringify(params));
                });
            }""", [params, use_auth_body])

            print(f"  Format {fmt_idx}: status={result['status']} size={result['size']}", flush=True)
            if result['status'] == 200 and result['size'] > 50:
                print(f"  SUCCESS! Body: {result['body'][:2000]}", flush=True)
                break
            elif result['size'] > 0:
                print(f"  Body: {result['body'][:200]}", flush=True)

        # Try intercepting the actual Angular search
        # Navigate to SV3, fill in block, click search
        print("\n  Trying UI-based search...", flush=True)
        page.goto("https://mavat.iplan.gov.il/SV3", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(5000)

        # Check if there's a block input visible
        block_input = page.locator("input[name='blockNumber']")
        count = block_input.count()
        print(f"  Block input count: {count}", flush=True)

        if count > 0:
            # Check visibility
            for i in range(count):
                vis = block_input.nth(i).is_visible()
                print(f"    blockNumber[{i}] visible={vis}", flush=True)

        # Find radio buttons and check which is selected
        radios = page.locator("input[name='plans-radiogroup']")
        radio_count = radios.count()
        print(f"  Radio buttons: {radio_count}", flush=True)
        for i in range(radio_count):
            checked = radios.nth(i).is_checked()
            label = radios.nth(i).evaluate("el => el.parentElement?.textContent?.trim() || ''")
            print(f"    radio[{i}] checked={checked} label={label[:50]}", flush=True)

        # Click the "location" radio if exists (usually radio for block search)
        # In MAVAT, radio=0 is free text, radio=1 is by location
        if radio_count > 1:
            print("  Clicking second radio (location search)...", flush=True)
            radios.nth(1).click(force=True)
            page.wait_for_timeout(1000)

            # Now check for block input
            block_input2 = page.locator("input[name='blockNumber']")
            count2 = block_input2.count()
            print(f"  Block inputs after radio click: {count2}", flush=True)
            for i in range(count2):
                vis = block_input2.nth(i).is_visible()
                print(f"    blockNumber[{i}] visible={vis}", flush=True)
                if vis:
                    # Fill in the block number
                    block_input2.nth(i).fill(str(block))
                    page.wait_for_timeout(500)
                    print(f"    Filled block number: {block}", flush=True)

                    # Capture the search request
                    captured_req = []
                    def on_req(req):
                        if 'Search' in req.url or 'search' in req.url:
                            captured_req.append({
                                'method': req.method,
                                'url': req.url,
                                'body': req.post_data
                            })
                    page.on("request", on_req)

                    # Find and click search button
                    search_btn = page.locator("button:has-text('חיפוש'), button.btn-search, .search-button")
                    if search_btn.count() > 0:
                        print(f"  Found search button, clicking...", flush=True)
                        search_btn.first.click()
                        page.wait_for_timeout(5000)
                    else:
                        # Try Enter key
                        block_input2.nth(i).press("Enter")
                        page.wait_for_timeout(5000)

                    page.remove_listener("request", on_req)

                    print(f"  Captured {len(captured_req)} search requests:")
                    for cr in captured_req:
                        print(f"    {cr['method']} {cr['url'][:100]}")
                        if cr['body']:
                            print(f"    Body: {cr['body'][:500]}")
                    break

    browser.close()
    print("\nDone.", flush=True)
