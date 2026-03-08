"""
Check GIS-NET data completeness for מגרשים (plots) and חלקות (parcels).
Compares what GIS-NET actually has vs what we downloaded.
"""
import asyncio
import json
import os
import sys
import io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from playwright.async_api import async_playwright

SITE_URL = "https://v5.gis-net.co.il/v5/Sdot_dan"
PROXY_URL = "https://v5.gis-net.co.il/proxy/proxy.ashx"
MAPSERVER = "http://arcgis005/arcgis/rest/services/Emek_Lod/Emek_lod_public/MapServer"
KFAR_CHABAD_BBOX = "187000,655000,192000,660000"
WIDER_BBOX = "180000,650000,200000,665000"
OUTPUT_DIR = Path(__file__).parent / "data" / "gisnet_layers"

# Layers we care about for this check
CHECK_LAYERS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27]


async def fetch_json(page, url_suffix):
    """Fetch JSON through browser proxy."""
    result = await page.evaluate("""
    async (args) => {
        const {proxyUrl, url} = args;
        const guid = crypto.randomUUID();
        try {
            const resp = await fetch(`${proxyUrl}?${url}&guid=${guid}`);
            if (!resp.ok) return JSON.stringify({error: `HTTP ${resp.status}`});
            return await resp.text();
        } catch(e) {
            return JSON.stringify({error: e.message});
        }
    }
    """, {"proxyUrl": PROXY_URL, "url": url_suffix})
    return json.loads(result)


async def get_layer_info(page, layer_id):
    """Get layer metadata."""
    url = f"{MAPSERVER}/{layer_id}?f=json"
    return await fetch_json(page, url)


async def count_features(page, layer_id, bbox=None):
    """Count features with optional bbox filter."""
    url = f"{MAPSERVER}/{layer_id}/query?f=json&where=1%3D1&returnCountOnly=true"
    if bbox:
        url += f"&geometry={bbox}&geometryType=esriGeometryEnvelope&inSR=2039&spatialRel=esriSpatialRelIntersects"
    data = await fetch_json(page, url)
    return data.get("count", -1)


async def get_all_layers(page):
    """Get full MapServer layer listing."""
    url = f"{MAPSERVER}?f=json"
    data = await fetch_json(page, url)
    return data.get("layers", [])


async def main():
    print("=" * 70)
    print("GIS-NET Completeness Check - מגרשים וחלקות")
    print("=" * 70)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = await ctx.new_page()

        print("\n1. Opening GIS-NET site...")
        await page.goto(SITE_URL, wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)
        try:
            btn = page.get_by_role("button", name="אישור")
            if await btn.is_visible(timeout=3000):
                await btn.click()
                await page.wait_for_timeout(2000)
        except Exception:
            pass

        # Get all layers from MapServer
        print("\n2. Getting MapServer layer listing...")
        all_layers = await get_all_layers(page)
        print(f"   Total layers in MapServer: {len(all_layers)}")

        # Print ALL layers with their groups
        print("\n   ALL MapServer layers:")
        for l in all_layers:
            prefix = "  " * (l.get("parentLayerId", -1) != -1)
            gtype = ""
            if l.get("subLayerIds"):
                gtype = " [GROUP]"
            print(f"   {prefix}L{l['id']:>3}: {l['name']}{gtype}")

        # Focus on parcel/plot related layers
        print("\n3. Checking parcel/plot layers in detail...")
        print(f"   {'ID':<5} {'Name':<35} {'Type':<15} {'Total':>8} {'KfarChabad':>12} {'Wider':>8} {'Downloaded':>12}")
        print("   " + "-" * 100)

        for lid in CHECK_LAYERS:
            info = await get_layer_info(page, lid)
            if info.get("error"):
                print(f"   L{lid:<3}: ERROR - {info['error']}")
                continue

            name = info.get("name", "?")
            gtype = info.get("geometryType", "none")
            gtype_short = gtype.replace("esriGeometry", "") if gtype else "Group"

            if gtype_short == "Group" or not gtype:
                print(f"   L{lid:<3}: {name:<35} [GROUP]")
                continue

            total = await count_features(page, lid)
            kc_count = await count_features(page, lid, bbox=KFAR_CHABAD_BBOX)
            wider = await count_features(page, lid, bbox=WIDER_BBOX)

            # Check what we downloaded
            dl_count = "—"
            for f in OUTPUT_DIR.glob(f"L{lid}_*.geojson"):
                d = json.load(open(f, "r", encoding="utf-8"))
                dl_count = str(len(d.get("features", [])))
                break

            missing = ""
            if dl_count == "—":
                missing = " ⚠️ NOT DOWNLOADED"
            elif dl_count != "—" and int(dl_count) < kc_count:
                missing = f" ⚠️ MISSING {kc_count - int(dl_count)}"

            print(f"   L{lid:<3}: {name:<35} {gtype_short:<15} {total:>8} {kc_count:>12} {wider:>8} {dl_count:>12}{missing}")
            await asyncio.sleep(0.3)

        # Check layers 2-7 too (might have additional cadastre/parcel data)
        print("\n4. Checking cadastre-area layers (0-10)...")
        for lid in range(0, 11):
            if lid in CHECK_LAYERS:
                continue
            info = await get_layer_info(page, lid)
            if info.get("error"):
                continue
            name = info.get("name", "?")
            gtype = info.get("geometryType", "")
            if not gtype:
                continue
            total = await count_features(page, lid)
            kc_count = await count_features(page, lid, bbox=KFAR_CHABAD_BBOX)
            print(f"   L{lid}: {name} ({gtype.replace('esriGeometry','')}) total={total} kfar_chabad={kc_count}")
            await asyncio.sleep(0.3)

        # Also check what the app's internal layer listing says
        print("\n5. App internal layer listing (myFilterLayers)...")
        app_layers = await page.evaluate("""
        () => {
            const fl = window.$sys && window.$sys.globals3 && window.$sys.globals3.myFilterLayers;
            if (!fl) return '[]';
            const layers = [];
            for (const [k, v] of Object.entries(fl)) {
                if (!v || typeof v !== 'object') continue;
                layers.push({
                    id: v.id, name: v.name,
                    geomType: v.geometryType || 'group',
                    parent: v.parentLayer ? v.parentLayer.id : null,
                });
            }
            return JSON.stringify(layers);
        }
        """)
        app_layers = json.loads(app_layers)
        parcel_related = [l for l in app_layers if any(kw in (l.get("name", "") or "") for kw in
            ["מגרש", "חלק", "גוש", "helk", "parcel", "migr", "cadastr", "קדסטר"])]
        print(f"   Parcel-related layers in app: {len(parcel_related)}")
        for l in parcel_related:
            print(f"   L{l['id']} (parent={l['parent']}): {l['name']} ({l['geomType']})")

        # Check ALL layers we haven't downloaded at all
        print("\n6. All layers NOT in our download...")
        downloaded_ids = set()
        for f in OUTPUT_DIR.glob("L*_P*.geojson"):
            try:
                lid = int(f.name.split("_")[0][1:])
                downloaded_ids.add(lid)
            except:
                pass

        for l in all_layers:
            lid = l["id"]
            if lid in downloaded_ids:
                continue
            sublayers = l.get("subLayerIds")
            if sublayers:
                continue  # skip group layers
            print(f"   L{lid}: {l['name']} — NOT DOWNLOADED")

        await browser.close()

    print("\n" + "=" * 70)
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
