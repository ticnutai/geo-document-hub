"""
Download layers from GIS-NET V5 Sdot Dan via Playwright (browser context).
Bypasses WAF by using real browser session.
Only downloads layers NOT already available from national sources.
"""
import asyncio
import json
import os
import sys
import time
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("Installing playwright...")
    os.system(f"{sys.executable} -m pip install playwright")
    from playwright.async_api import async_playwright

# Fix Windows console encoding
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = DATA_DIR / "gisnet_layers"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SITE_URL = "https://v5.gis-net.co.il/v5/Sdot_dan"
PROXY_URL = "https://v5.gis-net.co.il/proxy/proxy.ashx"
MAPSERVER = "http://arcgis005/arcgis/rest/services/Emek_Lod/Emek_lod_public/MapServer"

# Kfar Chabad bounding box in ITM (EPSG:2039)
KFAR_CHABAD_BBOX = "187000,655000,192000,660000"
WIDER_BBOX = "180000,650000,200000,665000"

# Layers to SKIP (already have from other sources)
SKIP_LAYER_IDS = set()
# תת"ל layers (already have as ttl_* in gis_layers)
SKIP_LAYER_IDS.update(range(58, 96))
# מח" plans
SKIP_LAYER_IDS.update(range(96, 101))
# תמ"מ 21/3 layers (already have as tmm321_*)
SKIP_LAYER_IDS.update(range(101, 133))
# תמ"א various + תמ"א 35 + תמ"א 1 (already have as tama*)
SKIP_LAYER_IDS.update(range(133, 196))
# Group container layer
SKIP_LAYER_IDS.add(196)
# Note: L8 (גושים) and L9 (חלקות) are now downloaded — not skipped.
# They provide GIS-NET cadastral blocks and parcels with GUSH/HELKA fields.


def esri_to_geojson(esri_features, geometry_type="", layer_name=""):
    """Convert Esri JSON features to GeoJSON."""
    features = []
    for feat in esri_features:
        geom = feat.get("geometry")
        attrs = feat.get("attributes", {})
        if not geom:
            continue
        geojson_geom = None
        if "rings" in geom:
            geojson_geom = {"type": "Polygon", "coordinates": geom["rings"]}
        elif "paths" in geom:
            paths = geom["paths"]
            if len(paths) == 1:
                geojson_geom = {"type": "LineString", "coordinates": paths[0]}
            else:
                geojson_geom = {"type": "MultiLineString", "coordinates": paths}
        elif "x" in geom and "y" in geom:
            geojson_geom = {"type": "Point", "coordinates": [geom["x"], geom["y"]]}
        elif "points" in geom:
            geojson_geom = {"type": "MultiPoint", "coordinates": geom["points"]}
        if geojson_geom:
            features.append({
                "type": "Feature",
                "properties": attrs,
                "geometry": geojson_geom,
            })
    return {
        "type": "FeatureCollection",
        "name": layer_name,
        "features": features,
    }


def safe_filename(name):
    safe = name.replace(" ", "_").replace("/", "_").replace("\\", "_")
    safe = safe.replace('"', '').replace("'", "").replace("(", "").replace(")", "")
    safe = safe.replace(",", "").replace(":", "").replace(".", "")
    return safe


async def query_layer(page, layer_id, geometry=None, offset=0, limit=1000):
    """Query a layer through the browser's fetch API."""
    result = await page.evaluate("""
    async (args) => {
        const {proxyUrl, mapServer, layerId, geometry, offset, limit} = args;
        const guid = crypto.randomUUID();
        let url = `${proxyUrl}?${mapServer}/${layerId}/query?f=json&where=${encodeURIComponent('1=1')}&returnGeometry=true&outFields=*&outSR=4326&resultOffset=${offset}&resultRecordCount=${limit}&guid=${guid}`;
        if (geometry) {
            url += `&geometry=${encodeURIComponent(geometry)}&geometryType=esriGeometryEnvelope&inSR=2039&spatialRel=esriSpatialRelIntersects`;
        }
        try {
            const resp = await fetch(url);
            if (!resp.ok) return JSON.stringify({error: `HTTP ${resp.status}`});
            const data = await resp.json();
            return JSON.stringify({
                features: data.features || [],
                exceeded: data.exceededTransferLimit || false,
                geomType: data.geometryType || '',
                count: (data.features || []).length,
                error: data.error ? data.error.message : null,
            });
        } catch(e) {
            return JSON.stringify({error: e.message});
        }
    }
    """, {
        "proxyUrl": PROXY_URL, "mapServer": MAPSERVER,
        "layerId": layer_id, "geometry": geometry,
        "offset": offset, "limit": limit,
    })
    return json.loads(result)


async def count_layer(page, layer_id, geometry=None):
    """Get feature count."""
    result = await page.evaluate("""
    async (args) => {
        const {proxyUrl, mapServer, layerId, geometry} = args;
        const guid = crypto.randomUUID();
        let url = `${proxyUrl}?${mapServer}/${layerId}/query?f=json&where=${encodeURIComponent('1=1')}&returnCountOnly=true&guid=${guid}`;
        if (geometry) {
            url += `&geometry=${encodeURIComponent(geometry)}&geometryType=esriGeometryEnvelope&inSR=2039&spatialRel=esriSpatialRelIntersects`;
        }
        try {
            const resp = await fetch(url);
            if (!resp.ok) return JSON.stringify({count: -1, error: `HTTP ${resp.status}`});
            const data = await resp.json();
            return JSON.stringify({count: data.count != null ? data.count : 0, error: data.error ? data.error.message : null});
        } catch(e) {
            return JSON.stringify({count: -1, error: e.message});
        }
    }
    """, {
        "proxyUrl": PROXY_URL, "mapServer": MAPSERVER,
        "layerId": layer_id, "geometry": geometry,
    })
    return json.loads(result)


async def download_all_features(page, layer_id, geometry=None, max_features=50000):
    """Download all features with pagination."""
    all_features = []
    offset = 0
    batch = 1000
    while True:
        print(f"    offset={offset}...", end=" ", flush=True)
        result = await query_layer(page, layer_id, geometry=geometry, offset=offset, limit=batch)
        if result.get("error"):
            print(f"ERR: {result['error']}")
            break
        features = result.get("features", [])
        print(f"{len(features)} feats")
        if not features:
            break
        all_features.extend(features)
        if len(all_features) >= max_features:
            break
        if not result.get("exceeded"):
            break
        offset += batch
        await asyncio.sleep(0.5)
    return all_features


async def main():
    print("=" * 60)
    print("GIS-NET V5 Sdot Dan - Layer Download (Playwright)")
    print("=" * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = await ctx.new_page()

        print("Opening site...")
        await page.goto(SITE_URL, wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)

        # Dismiss welcome
        try:
            btn = page.get_by_role("button", name="אישור")
            if await btn.is_visible(timeout=3000):
                await btn.click()
                await page.wait_for_timeout(2000)
        except Exception:
            pass

        # Get layers from app globals
        layers_json = await page.evaluate("""
        () => {
            const fl = window.$sys && window.$sys.globals3 && window.$sys.globals3.myFilterLayers;
            if (!fl) return '[]';
            const layers = [];
            for (const [k, v] of Object.entries(fl)) {
                if (!v || typeof v !== 'object' || !v.geometryType) continue;
                layers.push({
                    id: v.id, name: v.name, type: v.type,
                    geomType: v.geometryType,
                    parent: v.parentLayer ? v.parentLayer.id : null,
                });
            }
            return JSON.stringify(layers);
        }
        """)
        all_layers = json.loads(layers_json)
        print(f"Found {len(all_layers)} feature layers")

        # Deduplicate & filter
        seen = set()
        download_queue = []
        skipped = []

        for layer in all_layers:
            lid = layer["id"]
            name = layer["name"]
            parent = layer.get("parent")
            key = (lid, parent)
            if key in seen:
                continue
            seen.add(key)

            if lid in SKIP_LAYER_IDS:
                skipped.append((lid, name, "national/cadastre duplicate"))
                continue

            # Skip iPlan layers (parent=null, specific names)
            if parent is None and name in [
                "ישויות נקודתיות", "ישויות קוויות", "ישויות פוליגונליות",
                "יעודי קרקע", "קוים כחולים-תכניות מקוונות"
            ]:
                skipped.append((lid, name, "iPlan duplicate"))
                continue

            download_queue.append(layer)

        print(f"Skipping: {len(skipped)} | Downloading: {len(download_queue)}")

        results = {"downloaded": [], "empty": [], "errors": []}

        for i, layer in enumerate(download_queue):
            lid = layer["id"]
            name = layer["name"]
            parent = layer.get("parent")

            print(f"\n[{i+1}/{len(download_queue)}] L{lid}: {name}")

            fname = safe_filename(name)
            outfile = OUTPUT_DIR / f"L{lid}_P{parent}_{fname}.geojson"
            if outfile.exists() and outfile.stat().st_size > 100:
                print(f"  cached ({outfile.stat().st_size:,} B)")
                results["downloaded"].append({"id": lid, "name": name, "file": outfile.name, "size": outfile.stat().st_size, "status": "cached"})
                continue

            try:
                # L21 (מספרי מגרשים) needs wider coverage since label points
                # may be outside the narrow bbox even though their plots intersect it
                WIDER_LAYERS = {21}
                use_bbox = None if lid in WIDER_LAYERS else KFAR_CHABAD_BBOX
                cr = await count_layer(page, lid, geometry=use_bbox)
                count = cr.get("count", 0)
                if cr.get("error"):
                    print(f"  count error: {cr['error']}")
                    results["errors"].append({"id": lid, "name": name, "error": cr["error"]})
                    continue

                geom_filter = use_bbox
                if count == 0 and use_bbox is not None:
                    wr = await count_layer(page, lid, geometry=WIDER_BBOX)
                    wc = wr.get("count", 0)
                    if wc == 0:
                        tr = await count_layer(page, lid)
                        tc = tr.get("count", 0)
                        print(f"  empty in area (total={tc})")
                        results["empty"].append({"id": lid, "name": name, "total": tc})
                        continue
                    count = wc
                    geom_filter = WIDER_BBOX
                print(f"  {count} features")

                feats = await download_all_features(page, lid, geometry=geom_filter)
                if not feats:
                    results["empty"].append({"id": lid, "name": name})
                    continue

                geojson = esri_to_geojson(feats, layer.get("geomType", ""), name)
                with open(outfile, "w", encoding="utf-8") as f:
                    json.dump(geojson, f, ensure_ascii=False)

                sz = outfile.stat().st_size
                fc = len(geojson["features"])
                print(f"  [OK] {outfile.name} ({sz:,} B, {fc} feats)")
                results["downloaded"].append({"id": lid, "name": name, "file": outfile.name, "features": fc, "size": sz, "status": "new"})
                await asyncio.sleep(1)

            except Exception as e:
                print(f"  ERROR: {e}")
                results["errors"].append({"id": lid, "name": name, "error": str(e)})
                await asyncio.sleep(2)

        await browser.close()

    # Summary
    new_dl = [r for r in results["downloaded"] if r.get("status") == "new"]
    cached = [r for r in results["downloaded"] if r.get("status") == "cached"]
    print(f"\n{'='*60}")
    print(f"New: {len(new_dl)} | Cached: {len(cached)} | Empty: {len(results['empty'])} | Errors: {len(results['errors'])}")
    if new_dl:
        print(f"Total size: {sum(r.get('size',0) for r in new_dl):,} B")
        print(f"Total features: {sum(r.get('features',0) for r in new_dl):,}")
    if results["empty"]:
        print("\nEmpty:")
        for e in results["empty"]:
            print(f"  [{e['id']}] {e['name']} (total={e.get('total','?')})")
    if results["errors"]:
        print("\nErrors:")
        for e in results["errors"]:
            print(f"  [{e['id']}] {e['name']}: {e['error']}")

    summary_file = OUTPUT_DIR / "_download_summary.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nSummary: {summary_file}")


if __name__ == "__main__":
    asyncio.run(main())
