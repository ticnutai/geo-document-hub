"""Get full MAVAT plan details including document URLs."""
from playwright.sync_api import sync_playwright
import json

# Test plan: 425-1030113 (mp_id=4005189510)
MP_ID = "4005189510"
API_URL = f"https://mavat.iplan.gov.il/rest/api/SV4/1?mid={MP_ID}&guid=0"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Capture the plan details API response
    plan_data = [None]
    all_api = []
    
    def on_response(response):
        url = response.url
        if f'mid={MP_ID}' in url:
            try:
                plan_data[0] = response.json()
            except:
                pass
        if 'rest/api' in url:
            try:
                body = response.json()
            except:
                body = None
            all_api.append({
                'url': url,
                'status': response.status,
                'data': body,
            })
    
    page.on('response', on_response)
    
    print(f"Navigating to plan page...")
    page.goto(f"https://mavat.iplan.gov.il/SV4/1/{MP_ID}/310", 
              timeout=90000, wait_until='domcontentloaded')
    page.wait_for_timeout(10000)
    
    if plan_data[0]:
        pd = plan_data[0]
        print(f"\n=== Plan Data ===")
        # Save full data
        with open('_mavat_plan_data.json', 'w', encoding='utf-8') as f:
            json.dump(pd, f, ensure_ascii=False, indent=2)
        print(f"Full data saved to _mavat_plan_data.json")
        
        # Show structure
        for key in pd:
            val = pd[key]
            if isinstance(val, dict):
                print(f"  {key}: dict with {len(val)} keys: {list(val.keys())[:10]}")
            elif isinstance(val, list):
                print(f"  {key}: list with {len(val)} items")
                if val and isinstance(val[0], dict):
                    print(f"    First item keys: {list(val[0].keys())[:10]}")
                    print(f"    First item: {json.dumps(val[0], ensure_ascii=False)[:300]}")
            else:
                print(f"  {key}: {str(val)[:200]}")
    
    print(f"\n\n=== All API calls ({len(all_api)}) ===")
    for api in all_api:
        print(f"\n  {api['status']} {api['url'][:200]}")
        if api['data']:
            print(f"    Data keys: {list(api['data'].keys()) if isinstance(api['data'], dict) else type(api['data'])}")
    
    # Now try to click on "מסמכי התכנית" tab
    print("\n\nClicking on document tabs...")
    tab_texts = ['מסמכי התכנית', 'מסמכי מידע מנהלי', 'נוסחי פרסום']
    for tab_text in tab_texts:
        try:
            tab = page.get_by_text(tab_text).first
            if tab:
                tab.click()
                page.wait_for_timeout(3000)
                print(f"\nClicked '{tab_text}' - checking for new API calls...")
        except:
            print(f"Could not click '{tab_text}'")
    
    # Check for new API responses after clicking tabs
    print(f"\nTotal API calls now: {len(all_api)}")
    for api in all_api:
        if api['url'] not in [a['url'] for a in all_api[:8]]:  # New ones
            print(f"  NEW: {api['status']} {api['url'][:200]}")
            if api['data'] and isinstance(api['data'], dict):
                print(f"    Keys: {list(api['data'].keys())[:10]}")
    
    browser.close()
    print("\nDone!")
