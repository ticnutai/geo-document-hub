"""
Scrape migrash data for ALL parcels in block 7188 from Complot gush2 page.
Uses Playwright to render the SPA and extract data.
"""
import json
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUTPUT_DIR = Path("data/complot_kfar_chabad")
SITE_URL = "https://sdan.complot.co.il/gush2/"

# Load parcels from cadastre
with open("data/cadastre/parcels_kfar_chabad.geojson", "r", encoding="utf-8") as f:
    parcels_data = json.load(f)

# Group by gush
gush_parcels = {}
for feat in parcels_data["features"]:
    gush = feat["properties"]["GUSH_NUM"]
    helka = feat["properties"]["PARCEL"]
    if gush not in gush_parcels:
        gush_parcels[gush] = []
    gush_parcels[gush].append(helka)

# Sort
for gush in gush_parcels:
    gush_parcels[gush].sort()

print(f"Total gushim: {len(gush_parcels)}")
print(f"Gush 7188: {len(gush_parcels.get(7188, []))} parcels")

# Focus on gushim that have migrashim according to SOAP data
# But first, let's intercept API calls to understand the data flow

def scrape_parcels(gush_num, helkot):
    """Scrape migrash data for all parcels in a gush."""
    results = {}
    api_calls = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = context.new_page()

        # Intercept network requests to find the actual data API
        def on_response(response):
            url = response.url
            if 'handasi' in url or 'complot' in url:
                if 'magicscripts' in url or 'api' in url.lower() or 'ws' in url.lower():
                    try:
                        body = response.text()
                    except:
                        body = "(binary)"
                    api_calls.append({
                        'url': url,
                        'status': response.status,
                        'content_type': response.headers.get('content-type', ''),
                        'body_preview': body[:500] if isinstance(body, str) else str(body)[:500],
                    })

        page.on('response', on_response)

        # Navigate to the gush2 page first
        print(f"\n  Navigating to gush2 page...")
        page.goto(SITE_URL, timeout=60000, wait_until='networkidle')
        page.wait_for_timeout(3000)

        # Now iterate through helkot
        total = len(helkot)
        for i, helka in enumerate(helkot):
            print(f"  [{i+1}/{total}] Gush {gush_num} Helka {helka}...", end="", flush=True)
            
            # Navigate to the specific parcel via hash route
            page.evaluate(f"window.location.hash = 'gush/{gush_num}/{helka}'")
            page.wait_for_timeout(1200)  # Wait for content to load

            # Extract the data from the rendered page
            try:
                # Get the main content area
                content = page.inner_text('#MainContainerHandasa')
                
                # Parse migrash number
                migrash_match = re.search(r'מגרש\s+(\S+(?:\s*\([^)]+\))?)', content)
                yeud_match = re.search(r'יעוד\s+(.+?)(?:\n|$)', content)
                shetach_match = re.search(r'שטח\s+([\d,.]+\s*מ"ר)', content)
                
                migrash = migrash_match.group(1).strip() if migrash_match else None
                yeud = yeud_match.group(1).strip() if yeud_match else None
                shetach = shetach_match.group(1).strip() if shetach_match else None

                results[helka] = {
                    "gush": gush_num,
                    "helka": helka,
                    "migrash": migrash,
                    "yeud": yeud,
                    "shetach": shetach,
                }
                
                status = f" migrash={migrash}" if migrash else " (no migrash)"
                print(status)
                
            except Exception as e:
                print(f" ERROR: {e}")
                results[helka] = {
                    "gush": gush_num,
                    "helka": helka,
                    "error": str(e),
                }

            # Small delay to avoid overwhelming the server
            if (i + 1) % 20 == 0:
                time.sleep(0.5)

        # Save API calls log
        if api_calls:
            api_log_path = OUTPUT_DIR / f"api_calls_gush_{gush_num}.json"
            with open(api_log_path, "w", encoding="utf-8") as f:
                json.dump(api_calls[:50], f, ensure_ascii=False, indent=2)
            print(f"\n  Saved {len(api_calls)} API call logs")

        browser.close()

    return results


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Start with gush 7188 (the main one asked about)
    gush_num = 7188
    helkot = gush_parcels.get(gush_num, [])
    
    print(f"Scraping gush {gush_num}: {len(helkot)} parcels")
    results = scrape_parcels(gush_num, helkot)
    
    # Save results
    out_path = OUTPUT_DIR / f"migrash_data_gush_{gush_num}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    # Summary
    total = len(results)
    with_migrash = sum(1 for v in results.values() if v.get("migrash"))
    print(f"\n{'='*60}")
    print(f"Gush {gush_num}: {with_migrash}/{total} parcels have migrash data")
    print(f"Saved to {out_path}")
    
    # Print all results
    print(f"\n{'='*60}")
    print(f"Full migrash mapping for gush {gush_num}:")
    print(f"{'='*60}")
    for helka in sorted(results.keys()):
        r = results[helka]
        migrash = r.get("migrash", "?")
        yeud = r.get("yeud", "")
        shetach = r.get("shetach", "")
        print(f"  Helka {helka:>3} → Migrash {migrash or '---':>15}  {yeud or '':>20}  {shetach or ''}")
    
    # Now do all other gushim that have migrashim
    # Load SOAP migrash data to know which gushim have migrashim
    soap_path = OUTPUT_DIR / "all_migrashim_by_gush.json"
    if soap_path.exists():
        with open(soap_path, "r", encoding="utf-8") as f:
            soap_data = json.load(f)
        
        gushim_with_migrashim = [int(g) for g, items in soap_data.items() if items and g != str(gush_num)]
        print(f"\n\nOther gushim with migrashim: {len(gushim_with_migrashim)}")
        
        all_results = {str(gush_num): results}
        
        for g in sorted(gushim_with_migrashim):
            if g not in gush_parcels:
                continue
            helkot = gush_parcels[g]
            print(f"\n{'='*60}")
            print(f"Scraping gush {g}: {len(helkot)} parcels")
            g_results = scrape_parcels(g, helkot)
            all_results[str(g)] = g_results
            
            # Save individual results
            out_path = OUTPUT_DIR / f"migrash_data_gush_{g}.json"
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(g_results, f, ensure_ascii=False, indent=2)
            
            with_migrash = sum(1 for v in g_results.values() if v.get("migrash"))
            print(f"  {with_migrash}/{len(g_results)} parcels have migrash data")
        
        # Save combined results
        combined_path = OUTPUT_DIR / "all_migrash_data.json"
        with open(combined_path, "w", encoding="utf-8") as f:
            json.dump(all_results, f, ensure_ascii=False, indent=2)
        
        total_all = sum(len(v) for v in all_results.values())
        with_migrash_all = sum(
            1 for g_results in all_results.values()
            for v in g_results.values()
            if v.get("migrash")
        )
        print(f"\n{'='*60}")
        print(f"TOTAL: {with_migrash_all}/{total_all} parcels have migrash data")
        print(f"Saved to {combined_path}")


if __name__ == "__main__":
    main()
