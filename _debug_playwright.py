"""Quick debug: see what Playwright actually renders for the Complot SPA."""
from playwright.sync_api import sync_playwright

URL = "https://sdan.complot.co.il/gush2/#gush/7188/64"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    print("1) Navigating to URL with hash...")
    page.goto(URL, timeout=60000, wait_until='networkidle')
    page.wait_for_timeout(3000)
    
    # Screenshot
    page.screenshot(path="debug_step1.png", full_page=True)
    print("   Screenshot saved: debug_step1.png")
    
    # Check for privacy modal
    modal_buttons = page.query_selector_all('text=אישור')
    print(f"2) Found {len(modal_buttons)} 'אישור' elements")
    for i, btn in enumerate(modal_buttons):
        vis = btn.is_visible()
        tag = btn.evaluate("el => el.tagName")
        cls = btn.evaluate("el => el.className")
        parent = btn.evaluate("el => el.parentElement?.id || el.parentElement?.className")
        print(f"   [{i}] visible={vis}, tag={tag}, class={cls}, parent={parent}")
    
    # Try force-clicking any modal button
    try:
        page.evaluate("""
            // Try clicking any אישור button
            const btns = document.querySelectorAll('button, input[type=submit], a');
            for (const b of btns) {
                if (b.textContent.includes('אישור')) {
                    b.click();
                    console.log('Clicked:', b.tagName, b.className);
                }
            }
        """)
        page.wait_for_timeout(2000)
        page.screenshot(path="debug_step2_after_modal.png", full_page=True)
        print("   Clicked via JS & screenshot saved")
    except Exception as e:
        print(f"   JS click error: {e}")
    
    # Check main container
    container = page.query_selector('#MainContainerHandasa')
    if container:
        text = container.inner_text()
        print(f"3) #MainContainerHandasa text ({len(text)} chars):")
        print(text[:500])
    else:
        print("3) #MainContainerHandasa NOT FOUND")
    
    # Check for any migrash text on page
    body_text = page.inner_text('body')
    if 'מגרש' in body_text:
        idx = body_text.index('מגרש')
        print(f"\n4) Found 'מגרש' in body at pos {idx}:")
        print(body_text[max(0,idx-50):idx+100])
    else:
        print("\n4) 'מגרש' NOT found in body text")
    
    # Check for error text
    if 'מצטערים' in body_text:
        print("5) Found 'מצטערים' (error) in body")
    elif 'לא ניתן להציג' in body_text:
        print("5) Found 'לא ניתן להציג' (can't display) in body")
    else:
        print("5) No error text found")
    
    # Look for specific elements
    print("\n6) Looking for content elements...")
    for sel in ['#gush-info', '.gush-info', '#parcel-info', '.parcel-data', '#MainContainerHandasa', '#search-result-heading-hr']:
        el = page.query_selector(sel)
        if el:
            txt = el.inner_text()[:200]
            print(f"   {sel}: {txt}")
    
    # Try hash change approach
    print("\n7) Now trying hash change from base page...")
    page.goto("https://sdan.complot.co.il/gush2/", timeout=60000, wait_until='networkidle')
    page.wait_for_timeout(3000)
    
    # Dismiss modal again if needed
    page.evaluate("""
        const btns = document.querySelectorAll('button, input[type=submit], a');
        for (const b of btns) {
            if (b.textContent.includes('אישור')) b.click();
        }
    """)
    page.wait_for_timeout(2000)
    
    page.evaluate("window.location.hash = 'gush/7188/64'")
    page.wait_for_timeout(3000)
    
    container2 = page.query_selector('#MainContainerHandasa')
    if container2:
        text2 = container2.inner_text()
        print(f"   After hash change, container text ({len(text2)} chars):")
        print(text2[:500])
    
    if 'מגרש' in page.inner_text('body'):
        body = page.inner_text('body')
        idx = body.index('מגרש')
        print(f"   Found מגרש: {body[max(0,idx-20):idx+100]}")
    
    page.screenshot(path="debug_step3_hash_change.png", full_page=True)
    print("   Screenshot: debug_step3_hash_change.png")
    
    browser.close()
    print("\nDone!")
