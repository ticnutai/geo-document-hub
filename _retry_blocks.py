"""Retry failed blocks and merge with existing results."""
from playwright.sync_api import sync_playwright
import json, time, os

RETRY_BLOCKS = ['6260', '6261', '6262']
OUTPUT_FILE = "data/all_plans_by_block.json"

SEARCH_JS = """
async (params) => {
    const [blockNumber, fromResult, toResult, pageNum] = params;
    const token = await grecaptcha.execute(
        '6LeUKkMoAAAAAH4UacB4zewg4ult8Rcriv-ce0Db', 
        {action: 'importantAction'}
    );
    const body = {
        freeSearchLut: {DESCRIPTION: "הכל", CODE: -1},
        searchName: "", favored: false, code: -1, text: "",
        blockNumber: blockNumber,
        fromResult: fromResult, toResult: toResult,
        _page: pageNum, token: token
    };
    const resp = await fetch('https://mavat.iplan.gov.il/rest/api/sv3/Search', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });
    return await resp.json();
}
"""

# Load existing results
with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
    existing = json.load(f)

all_plans = existing['plans']
block_plan_map = existing['block_plan_map']

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    page.goto("https://mavat.iplan.gov.il/SV3", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(8000)  # Extra wait

    for block in RETRY_BLOCKS:
        for attempt in range(3):
            try:
                time.sleep(3)
                result = page.evaluate(SEARCH_JS, [block, 1, 100, 1])
                
                plan_results = None
                for item in result:
                    if item.get('type') == '1':
                        plan_results = item.get('result', {})
                        break
                
                if plan_results:
                    total = plan_results.get('intRecordsCount', 0)
                    dt_results = plan_results.get('dtResults', [])
                    
                    plan_nums = []
                    for r in dt_results:
                        pn = r.get('ENTITY_NUMBER', '')
                        if pn:
                            plan_nums.append(pn)
                            if pn not in all_plans:
                                all_plans[pn] = {
                                    'PL_NUMBER': pn,
                                    'PL_NAME': r.get('ENTITY_NAME', ''),
                                    'MP_ID': r.get('MP_ID', ''),
                                    'PLAN_ID': r.get('PLAN_ID', ''),
                                    'ENTITY_TYPE': r.get('ENTITY_TYPE', ''),
                                    'STATION_DESC': r.get('STATION_DESC', ''),
                                    'LOCATION': r.get('DistrictAreaDesc', ''),
                                    'STATUS': r.get('LAST_UPDATE_STATUS', ''),
                                }
                    
                    block_plan_map[block] = list(set(plan_nums))
                    print(f"  Block {block}: {total} plans found (attempt {attempt+1})", flush=True)
                    break
                    
            except Exception as e:
                print(f"  Block {block} attempt {attempt+1} failed: {e}", flush=True)
                time.sleep(5)

    browser.close()

# Update existing plans list
existing_plans = set()
if os.path.exists("data/taba_kfar_chabad.geojson"):
    with open("data/taba_kfar_chabad.geojson", 'r', encoding='utf-8') as f:
        gj = json.load(f)
    for feat in gj.get('features', []):
        pn = feat['properties'].get('pl_number', '')
        if pn:
            existing_plans.add(pn)

new_plans = set(all_plans.keys()) - existing_plans

print(f"\nTotal unique plans: {len(all_plans)}", flush=True)
print(f"Already had: {len(existing_plans & set(all_plans.keys()))}", flush=True)
print(f"NEW: {len(new_plans)}", flush=True)

# Save updated results
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump({
        'blocks_searched': existing['blocks_searched'],
        'block_plan_map': block_plan_map,
        'total_unique_plans': len(all_plans),
        'new_plans_count': len(new_plans),
        'existing_plans_count': len(existing_plans & set(all_plans.keys())),
        'new_plan_numbers': sorted(list(new_plans)),
        'plans': all_plans
    }, f, ensure_ascii=False, indent=2)

print("Updated saved.", flush=True)
