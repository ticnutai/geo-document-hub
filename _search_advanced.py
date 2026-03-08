"""
Search MAVAT SV3 by block number using browser automation.
Steps:
1. Navigate to SV3
2. Click "חיפוש מתקדם" (advanced search)
3. Find and fill block number inputs
4. Search and collect results
"""
from playwright.sync_api import sync_playwright
import json, time

# Block numbers from our existing plan data  
BLOCKS = ['6256','6258','6260','6261','6262','6269','6272','6280','7187','7188','7196','7311']
# Also try the user's block
BLOCKS_EXTRA = ['525']

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    print("Loading MAVAT SV3...", flush=True)
    page.goto("https://mavat.iplan.gov.il/SV3", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(6000)

    # Click "חיפוש מתקדם" button
    adv_btn = page.locator("button:has-text('חיפוש מתקדם')")
    print(f"Advanced search button count: {adv_btn.count()}", flush=True)
    
    if adv_btn.count() > 0:
        print("Clicking 'חיפוש מתקדם'...", flush=True)
        adv_btn.first.click()
        page.wait_for_timeout(2000)
        page.screenshot(path="_after_advanced_click.png")
        
        # Now check what elements appeared
        new_elements = page.evaluate("""() => {
            const inputs = document.querySelectorAll('input, select, textarea, p-dropdown, p-autoComplete');
            return Array.from(inputs).map(el => {
                const r = el.getBoundingClientRect();
                return {
                    tag: el.tagName,
                    name: el.getAttribute('name') || '',
                    id: el.id || '',
                    placeholder: el.getAttribute('placeholder') || '',
                    class: el.className?.substring?.(0, 80) || '',
                    visible: r.width > 0 && r.height > 0,
                    label: el.getAttribute('aria-label') || '',
                    formControlName: el.getAttribute('formcontrolname') || '',
                };
            });
        }""")
        
        print(f"Found {len(new_elements)} form elements:", flush=True)
        for el in new_elements:
            if el['visible']:
                print(f"  [{el['tag']}] name={el['name']} id={el['id']} formCtrl={el['formControlName']} placeholder={el['placeholder']}", flush=True)
        
        # Look specifically for block/gush related inputs 
        block_inputs = page.evaluate("""() => {
            const allInputs = document.querySelectorAll('input');
            const results = [];
            for (const inp of allInputs) {
                const r = inp.getBoundingClientRect();
                const name = inp.getAttribute('name') || '';
                const formCtrl = inp.getAttribute('formcontrolname') || '';
                const id = inp.id || '';
                const ph = inp.getAttribute('placeholder') || '';
                const label = inp.getAttribute('aria-label') || '';
                // Look for any label near this input
                let nearbyLabel = '';
                if (inp.id) {
                    const lbl = document.querySelector('label[for="' + inp.id + '"]');
                    if (lbl) nearbyLabel = lbl.textContent?.trim() || '';
                }
                if (!nearbyLabel) {
                    const parent = inp.closest('.form-group, .field, .p-field, .input-group');
                    if (parent) {
                        const lbl = parent.querySelector('label, .label, span');
                        if (lbl) nearbyLabel = lbl.textContent?.trim()?.substring(0, 50) || '';
                    }
                }
                results.push({
                    name, formCtrl, id, ph, label, nearbyLabel,
                    visible: r.width > 0,
                    value: inp.value || ''
                });
            }
            return results;
        }""")
        
        print(f"\nAll inputs ({len(block_inputs)}):", flush=True)
        for inp in block_inputs:
            vis = "V" if inp['visible'] else "H"
            print(f"  [{vis}] name={inp['name']} formCtrl={inp['formCtrl']} id={inp['id']} ph={inp['ph']} label='{inp['nearbyLabel']}'", flush=True)

        # Look for labels containing גוש or block
        labels = page.evaluate("""() => {
            const labels = document.querySelectorAll('label, span, div');
            const results = [];
            for (const lbl of labels) {
                const txt = lbl.textContent?.trim() || '';
                if (txt.includes('גוש') || txt.includes('חלקה') || txt.includes('block') || txt.includes('parcel')) {
                    const r = lbl.getBoundingClientRect();
                    results.push({
                        tag: lbl.tagName,
                        text: txt.substring(0, 60),
                        visible: r.width > 0,
                        class: lbl.className?.substring?.(0, 60) || ''
                    });
                }
            }
            return results;
        }""")
        print(f"\nLabels with גוש/חלקה: {len(labels)}", flush=True)
        for lbl in labels:
            print(f"  [{lbl['tag']}] text='{lbl['text']}' visible={lbl['visible']}", flush=True)

        # Check for tabs above advanced search
        tabs = page.evaluate("""() => {
            const tabs = document.querySelectorAll('[role=tab], .tab, .nav-item, .uk-tab li, .p-tabview-nav li');
            return Array.from(tabs).map(t => ({
                text: t.textContent?.trim()?.substring(0, 50) || '',
                class: t.className?.substring?.(0, 60) || '',
                selected: t.getAttribute('aria-selected') || '',
            }));
        }""")
        print(f"\nTabs: {len(tabs)}", flush=True)
        for t in tabs:
            print(f"  text='{t['text']}' selected={t['selected']} class={t['class'][:40]}", flush=True)
    
    browser.close()
    print("\nDone.", flush=True)
