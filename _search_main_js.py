"""
Download and search main.js bundle for the exact GetAttachment HTTP endpoint.
Focus on finding the URL construction in getAttachmentData method.
"""
from playwright.sync_api import sync_playwright
import re

BASE = "https://mavat.iplan.gov.il"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Download the main bundle
        print("Fetching main.js bundle...")
        resp = page.request.get(f"{BASE}/main.f53e191cf7958563.js")
        js = resp.text()
        print(f"Bundle size: {len(js)} bytes")

        # Save it locally for analysis
        with open("_mavat_main.js", "w", encoding="utf-8") as f:
            f.write(js)
        print("Saved to _mavat_main.js")

        # Search for getAttachmentData - find the actual function body
        # In minified code, look for the method name followed by its implementation
        patterns_to_find = [
            r'getAttachmentData\s*\([^)]*\)\s*\{[^}]{0,2000}',
            r'GetAttachment\s*\([^)]*\)\s*\{[^}]{0,3000}',
            r'GetZipAttachment\s*\([^)]*\)\s*\{[^}]{0,1000}',
            r'getTasritsFiles\s*\([^)]*\)\s*\{[^}]{0,500}',
            r'PlanTasrit',
            r'/SV4/[^"\']*(?:ttachment|ile|ownload)',
            r'responseType\s*:\s*["\']blob["\']',
        ]

        for pat in patterns_to_find:
            matches = re.findall(pat, js, re.IGNORECASE)
            print(f"\n=== Pattern: {pat[:60]} ({len(matches)} matches) ===")
            for m in matches[:3]:
                # Show context: find position and show surrounding
                pos = js.find(m)
                context_start = max(0, pos - 200)
                context_end = min(len(js), pos + len(m) + 200)
                context = js[context_start:context_end]
                print(f"  MATCH: ...{context}...")
                print()

        # Also search for patterns like this._http.get with URL construction
        # that might contain file/attachment related paths
        http_get_patterns = [
            r'this\._http\.get\([^)]*(?:ttach|ile|ownload|blob)[^)]*\)',
            r'this\._http\.post\([^)]*(?:ttach|ile|ownload|blob)[^)]*\)',
            r'this\.httpService\.[^(]*\([^)]*(?:ttach|ile|ownload)[^)]*\)',
            r'\.get\(\s*[^,]*?["\'/](?:Attachment|File|Download)[^)]*\)',
        ]

        for pat in http_get_patterns:
            matches = re.findall(pat, js, re.IGNORECASE)
            print(f"\n=== HTTP Pattern: {pat[:60]} ({len(matches)} matches) ===")
            for m in matches[:5]:
                pos = js.find(m)
                ctx_start = max(0, pos - 150)
                ctx_end = min(len(js), pos + len(m) + 150)
                print(f"  {js[ctx_start:ctx_end]}")
                print()

        # Find any URL construction near 'blob' responseType
        blob_positions = [m.start() for m in re.finditer(r'responseType.*?blob', js)]
        print(f"\n=== Blob responseType positions: {len(blob_positions)} ===")
        for pos in blob_positions[:5]:
            # Show 500 chars before to see the URL construction
            ctx_start = max(0, pos - 500)
            ctx_end = min(len(js), pos + 50)
            snippet = js[ctx_start:ctx_end]
            print(f"  POS {pos}: ...{snippet}...")
            print()

        browser.close()

if __name__ == "__main__":
    main()
