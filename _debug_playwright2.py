"""Debug: dump full page HTML after loading Complot SPA."""
from playwright.sync_api import sync_playwright

URL = "https://sdan.complot.co.il/gush2/#gush/7188/64"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    page.goto(URL, timeout=60000, wait_until='networkidle')
    page.wait_for_timeout(3000)
    
    # Click privacy modal
    page.evaluate("""
        const btns = document.querySelectorAll('.cap-popup-accept');
        for (const b of btns) b.click();
    """)
    page.wait_for_timeout(2000)
    
    # Dump full HTML
    html = page.content()
    with open("debug_page.html", "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Page HTML saved: {len(html)} bytes → debug_page.html")
    
    # Check for iframes
    frames = page.frames
    print(f"\nFrames: {len(frames)}")
    for i, frame in enumerate(frames):
        print(f"  [{i}] name={frame.name}, url={frame.url}")
        if frame != page.main_frame:
            try:
                frame_html = frame.content()
                fname = f"debug_frame_{i}.html"
                with open(fname, "w", encoding="utf-8") as f:
                    f.write(frame_html)
                print(f"       Saved to {fname} ({len(frame_html)} bytes)")
                
                # Check for migrash in frame
                if 'מגרש' in frame_html:
                    print(f"       *** Contains מגרש! ***")
                if 'MainContainerHandasa' in frame_html:
                    print(f"       *** Contains MainContainerHandasa! ***")
            except Exception as e:
                print(f"       Error reading frame: {e}")
    
    # Check body text
    body = page.inner_text('body')[:2000]
    print(f"\nBody text (first 2000 chars):\n{body}")
    
    browser.close()
