"""Check if handasi scripts load correctly in Playwright."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Capture responses
    responses = {}
    def on_response(response):
        if 'handasi' in response.url:
            responses[response.url] = {
                'status': response.status,
                'ok': response.ok,
                'headers': dict(response.headers),
            }
    
    page.on('response', on_response)
    
    # Also capture console messages
    console_msgs = []
    page.on('console', lambda msg: console_msgs.append(f'{msg.type}: {msg.text}'))
    
    print("Navigating to sdan.complot.co.il/binyan/...")
    page.goto('https://sdan.complot.co.il/binyan/', timeout=60000, wait_until='networkidle')
    page.wait_for_timeout(3000)
    
    print(f"\nHandasi responses ({len(responses)}):")
    for url, info in responses.items():
        print(f"  {info['status']} {url[:120]}")
    
    print(f"\nConsole messages ({len(console_msgs)}):")
    for msg in console_msgs[:20]:
        print(f"  {msg[:200]}")
    
    # Try direct fetch to handasi from browser
    print("\nDirect fetch to handasi globals.js from browser:")
    result = page.evaluate("""async () => {
        try {
            const resp = await fetch('https://handasi.complot.co.il/handasi2016/Scripts/globals.js');
            const text = await resp.text();
            return {status: resp.status, len: text.length, preview: text.substring(0, 300)};
        } catch(e) {
            return {error: e.toString()};
        }
    }""")
    print(f"  Result: {result}")
    
    # Also try WebService from browser
    print("\nDirect WS call from browser:")
    result2 = page.evaluate("""async () => {
        try {
            const resp = await fetch('https://handasi.complot.co.il/wsComplotPublicData/ComplotPublicData.asmx/GetYeshuvim', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({site_id: 31})
            });
            const text = await resp.text();
            return {status: resp.status, len: text.length, preview: text.substring(0, 300)};
        } catch(e) {
            return {error: e.toString()};
        }
    }""")
    print(f"  Result: {result2}")
    
    browser.close()
