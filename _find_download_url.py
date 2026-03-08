"""Find the MAVAT document download URL pattern by intercepting network requests."""
from playwright.sync_api import sync_playwright
import json

MP_ID = "4005189510"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Track all requests/responses
    download_urls = []
    
    def on_response(response):
        url = response.url
        # Look for attachment/download/file related endpoints
        lower = url.lower()
        if any(kw in lower for kw in ['attach', 'download', 'file', 'blob', 'document']):
            download_urls.append({
                'url': url,
                'status': response.status,
                'content_type': response.headers.get('content-type', ''),
            })
    
    page.on('response', on_response)
    
    print("Navigating to plan page (documents tab)...")
    page.goto(f"https://mavat.iplan.gov.il/SV4/1/{MP_ID}/310", 
              timeout=90000, wait_until='domcontentloaded')
    page.wait_for_timeout(8000)
    
    # Look at the page for download links
    print("\n=== Looking for download links ===")
    
    # Find all anchor tags with href containing attachment/download
    links = page.evaluate("""() => {
        const allLinks = [];
        document.querySelectorAll('a[href]').forEach(a => {
            allLinks.push({href: a.href, text: a.textContent.trim().substring(0, 100), 
                          download: a.getAttribute('download') || ''});
        });
        return allLinks;
    }""")
    print(f"Found {len(links)} links total")
    for link in links:
        if any(kw in link['href'].lower() for kw in ['attach', 'download', 'file', 'blob', 'api']):
            print(f"  RELEVANT: {link['href'][:200]}")
            print(f"    Text: {link['text'][:80]}")
    
    # Find all buttons/clickable elements related to download
    print("\n=== Looking for download buttons ===")
    buttons = page.evaluate("""() => {
        const results = [];
        // Look for elements with download-related attributes or classes
        const allElements = document.querySelectorAll('[class*="download"], [class*="file"], [class*="doc"], [onclick*="download"], [onclick*="file"], [ng-click], button, .document-item, .doc-item, .file-item');
        allElements.forEach(el => {
            results.push({
                tag: el.tagName,
                class: el.className.substring(0, 200),
                text: el.textContent.trim().substring(0, 100),
                onclick: (el.getAttribute('onclick') || '').substring(0, 200),
                ngClick: (el.getAttribute('ng-click') || '').substring(0, 200),
                href: (el.getAttribute('href') || '').substring(0, 200),
            });
        });
        return results;
    }""")
    for btn in buttons[:30]:
        print(f"  {btn['tag']} class='{btn['class'][:80]}' text='{btn['text'][:60]}'")
        if btn['onclick']: print(f"    onclick: {btn['onclick']}")
        if btn['ngClick']: print(f"    ng-click: {btn['ngClick']}")
        if btn['href']: print(f"    href: {btn['href']}")

    # Look for Angular services or JavaScript functions that construct download URLs
    print("\n=== Checking JS for download URL construction ===")
    js_result = page.evaluate("""() => {
        const results = [];
        // Check for common patterns
        const scripts = document.querySelectorAll('script');
        scripts.forEach(s => {
            const src = s.src || '';
            const text = s.textContent || '';
            if (src && (src.includes('doc') || src.includes('file') || src.includes('attach'))) {
                results.push('Script src: ' + src);
            }
            if (text.includes('Attac') || text.includes('attac') || text.includes('download')) {
                results.push('Inline script contains download reference: ' + text.substring(0, 300));
            }
        });
        return results;
    }""")
    for r in js_result[:10]:
        print(f"  {r[:200]}")
    
    # Check for Angular/React app configuration
    print("\n=== Checking app config ===")
    config = page.evaluate("""() => {
        // Check window globals
        const interesting = {};
        for (const key of Object.keys(window)) {
            const lower = key.toLowerCase();
            if (lower.includes('config') || lower.includes('api') || lower.includes('base') || lower.includes('url')) {
                try {
                    const val = window[key];
                    if (typeof val === 'string' || typeof val === 'number') {
                        interesting[key] = String(val).substring(0, 200);
                    } else if (typeof val === 'object' && val !== null) {
                        interesting[key] = JSON.stringify(val).substring(0, 500);
                    }
                } catch(e) {}
            }
        }
        return interesting;
    }""")
    for k, v in config.items():
        print(f"  {k}: {v[:200]}")

    # Try to find the specific JS bundle that contains the download logic
    print("\n=== All script sources ===")
    script_srcs = page.evaluate("""() => {
        return Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
    }""")
    for src in script_srcs:
        print(f"  {src}")
    
    # Check for download-related network calls
    print(f"\n=== Download-related responses ({len(download_urls)}) ===")
    for d in download_urls:
        print(f"  {d['status']} {d['url'][:200]}")
        print(f"    Content-Type: {d['content_type']}")
    
    browser.close()
