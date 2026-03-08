"""
Search MAVAT SV3 for ALL plans associated with כפר חב"ד block numbers.
Uses browser automation with the advanced search form.
"""
from playwright.sync_api import sync_playwright
import json, time, os

# Block numbers from existing plan data for כפר חב"ד
BLOCKS = ['6256', '6258', '6260', '6261', '6262', '6269', '6272', '6280', '7187', '7188', '7196', '7311']

OUTPUT_FILE = "data/all_plans_by_block.json"
os.makedirs("data", exist_ok=True)

all_plans = {}  # plan_number -> plan_info
block_plan_map = {}  # block -> [plan_numbers]


def search_block(page, block_number):
    """Search for plans by block number, return list of plans."""
    plans_found = []
    captured_responses = []
    
    def on_response(resp):
        if 'Search' in resp.url:
            try:
                body = resp.json()
                captured_responses.append(body)
                print(f"    [API] {resp.url[-30:]} status={resp.status} total={body.get('total', '?') if isinstance(body, dict) else '?'}", flush=True)
            except Exception as e:
                print(f"    [API] {resp.url[-30:]} status={resp.status} parse error: {e}", flush=True)
    
    page.on("response", on_response)
    
    # Click "ניקוי" (clear) to reset form via JavaScript
    page.evaluate("""() => {
        const btns = document.querySelectorAll('button[aria-label="ניקוי"]');
        for (const b of btns) { if (b.offsetParent !== null) { b.click(); return; } }
    }""")
    page.wait_for_timeout(1500)
    captured_responses.clear()  # Ignore clear-triggered responses
    
    # Fill block number - scroll into view first
    block_input = page.locator("input[name='blockNumber']").first
    block_input.scroll_into_view_if_needed()
    page.wait_for_timeout(300)
    block_input.click()
    block_input.fill("")
    page.wait_for_timeout(200)
    block_input.type(block_number, delay=50)
    page.wait_for_timeout(500)
    
    # Submit search via Enter
    print(f"  Pressing Enter to search...", flush=True)
    block_input.press("Enter")
    
    page.wait_for_timeout(8000)  # Wait for results
    
    total = 0
    if captured_responses:
        resp = captured_responses[-1]
        if isinstance(resp, dict):
            total = resp.get('total', 0)
            data = resp.get('data', [])
            for r in data:
                plans_found.append(r)
            
            print(f"  Block {block_number}: {total} total, got {len(data)} on page 1", flush=True)
            
            # Paginate - request more results if needed
            page_num = 1
            while len(plans_found) < total:
                page_num += 1
                captured_responses.clear()
                
                # Try clicking "next" in paginator
                next_btns = page.locator(".p-paginator-next, button[aria-label='Next Page']")
                if next_btns.count() > 0 and next_btns.first.is_enabled():
                    next_btns.first.click()
                    page.wait_for_timeout(4000)
                    
                    if captured_responses:
                        resp2 = captured_responses[-1]
                        if isinstance(resp2, dict):
                            data2 = resp2.get('data', [])
                            for r in data2:
                                plans_found.append(r)
                            print(f"    Page {page_num}: +{len(data2)}, total={len(plans_found)}/{total}", flush=True)
                            if len(data2) == 0:
                                break
                    else:
                        break
                else:
                    # Check for page number links
                    page_links = page.locator(".p-paginator-page")
                    found_next = False
                    for i in range(page_links.count()):
                        link = page_links.nth(i)
                        if link.is_visible() and link.text_content().strip() == str(page_num):
                            captured_responses.clear()
                            link.click()
                            page.wait_for_timeout(4000)
                            if captured_responses:
                                resp2 = captured_responses[-1]
                                if isinstance(resp2, dict):
                                    data2 = resp2.get('data', [])
                                    for r in data2:
                                        plans_found.append(r)
                                    print(f"    Page {page_num}: +{len(data2)}, total={len(plans_found)}/{total}", flush=True)
                                    if len(data2) == 0:
                                        break
                            found_next = True
                            break
                    if not found_next:
                        print(f"    No more pagination, stopping at {len(plans_found)}/{total}", flush=True)
                        break
    else:
        print(f"  Block {block_number}: No response captured", flush=True)
    
    page.remove_listener("response", on_response)
    return plans_found, total


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    print("Loading MAVAT SV3...", flush=True)
    page.goto("https://mavat.iplan.gov.il/SV3", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(6000)

    # Open advanced search
    adv_btn = page.locator("button:has-text('חיפוש מתקדם')")
    adv_btn.first.click()
    page.wait_for_timeout(2000)
    print("Advanced search opened\n", flush=True)

    for block in BLOCKS:
        try:
            plans, total = search_block(page, block)
            
            plan_nums = []
            for plan in plans:
                pn = plan.get('PL_NUMBER', '')
                if pn and pn not in all_plans:
                    all_plans[pn] = {
                        'PL_NUMBER': pn,
                        'PL_NAME': plan.get('PL_NAME', ''),
                        'MP_ID': plan.get('MP_ID', plan.get('mp_id', '')),
                        'STATION_DESC': plan.get('STATION_DESC', ''),
                        'ENTITY_SUBTYPE_DESC': plan.get('ENTITY_SUBTYPE_DESC', ''),
                        'LOCATION': plan.get('LOCATION', ''),
                    }
                if pn:
                    plan_nums.append(pn)
            
            block_plan_map[block] = plan_nums
            print(f"  Unique plans so far: {len(all_plans)}\n", flush=True)
            
        except Exception as e:
            print(f"  ERROR searching block {block}: {e}", flush=True)
        
        time.sleep(2)

    browser.close()

    # Load existing plan numbers from our geojson
    existing_plans = set()
    geojson_file = "data/taba_kfar_chabad.geojson"
    if os.path.exists(geojson_file):
        with open(geojson_file, 'r', encoding='utf-8') as f:
            gj = json.load(f)
        for feat in gj.get('features', []):
            pn = feat['properties'].get('pl_number', '')
            if pn:
                existing_plans.add(pn)

    new_plans = set(all_plans.keys()) - existing_plans

    print(f"\n{'='*50}", flush=True)
    print(f"SUMMARY", flush=True)
    print(f"{'='*50}", flush=True)
    print(f"Blocks searched: {len(BLOCKS)}", flush=True)
    print(f"Total unique plans found: {len(all_plans)}", flush=True)
    print(f"Already in our collection: {len(existing_plans & set(all_plans.keys()))}", flush=True)
    print(f"NEW plans: {len(new_plans)}", flush=True)
    
    if new_plans:
        print(f"\nNew plans to download:", flush=True)
        for pn in sorted(new_plans):
            p = all_plans[pn]
            print(f"  {pn}: {p.get('PL_NAME', '')}", flush=True)
    
    # Save results
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump({
            'blocks_searched': BLOCKS,
            'block_plan_map': block_plan_map,
            'total_unique_plans': len(all_plans),
            'new_plans_count': len(new_plans),
            'existing_plans_count': len(existing_plans & set(all_plans.keys())),
            'plans': all_plans
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\nSaved to {OUTPUT_FILE}", flush=True)
