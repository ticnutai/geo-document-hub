"""
Download missing מגרשים (plots) and חלקות (parcels) from GIS-NET.
Re-downloads: L8 (גושים), L9 (חלקות), L21 (מספרי מגרשים with wider area).
Also verifies L20 and L25 completeness.
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
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


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
            rings = geom["rings"]
            if len(rings) == 1:
                geojson_geom = {"type": "Polygon", "coordinates": rings}
            else:
                geojson_geom = {"type": "MultiPolygon", "coordinates": [[r] for r in rings]}
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


async def query_layer(page, layer_id, geometry=None, offset=0, limit=1000):
    """Query a layer through GIS-NET proxy."""
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
                count: (data.features || []).length,
                fields: data.fields || [],
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


async def count_features(page, layer_id, geometry=None):
    """Count features."""
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
            return JSON.stringify({count: data.count != null ? data.count : 0});
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
    fields = []
    offset = 0
    batch = 1000
    while True:
        print(f"    Fetching offset={offset}...", end=" ", flush=True)
        result = await query_layer(page, layer_id, geometry=geometry, offset=offset, limit=batch)
        if result.get("error"):
            print(f"ERROR: {result['error']}")
            break
        features = result.get("features", [])
        if not fields and result.get("fields"):
            fields = result["fields"]
        print(f"{len(features)} features")
        if not features:
            break
        all_features.extend(features)
        if len(all_features) >= max_features:
            print(f"    Reached max_features={max_features}")
            break
        if not result.get("exceeded"):
            break
        offset += batch
        await asyncio.sleep(0.5)
    return all_features, fields


async def main():
    print("=" * 70)
    print("GIS-NET Download: מגרשים וחלקות")
    print("=" * 70)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = await ctx.new_page()

        print("\nOpening GIS-NET...")
        await page.goto(SITE_URL, wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)
        try:
            btn = page.get_by_role("button", name="אישור")
            if await btn.is_visible(timeout=3000):
                await btn.click()
                await page.wait_for_timeout(2000)
        except Exception:
            pass

        download_plan = [
            # (layer_id, output_name, parent_id, bbox, description)
            (8, "L8_P7_גושים.geojson", 7, KFAR_CHABAD_BBOX, "גושים - Cadastral blocks"),
            (9, "L9_P7_חלקות.geojson", 7, KFAR_CHABAD_BBOX, "חלקות - Cadastral parcels"),
            (21, "L21_P13_מספרי_מגרשים.geojson", 13, None, "מספרי מגרשים - Plot numbers (ALL, no bbox filter)"),
        ]

        results = []

        for layer_id, filename, parent_id, bbox, desc in download_plan:
            print(f"\n{'─'*60}")
            print(f"Layer {layer_id}: {desc}")
            print(f"  File: {filename}")
            print(f"  BBox: {bbox or 'NONE (all features)'}")

            outfile = OUTPUT_DIR / filename

            # Get count first
            count_data = await count_features(page, layer_id, bbox)
            expected_count = count_data.get("count", 0)
            print(f"  Expected features: {expected_count}")

            if expected_count == 0:
                print(f"  SKIPPING: No features found")
                continue

            # Download
            features, fields = await download_all_features(page, layer_id, geometry=bbox)
            print(f"  Downloaded: {len(features)} features")

            if not features:
                print(f"  ERROR: No features downloaded despite count={expected_count}")
                continue

            # Show field info
            if fields:
                field_names = [f.get("name", "?") for f in fields]
                print(f"  Fields ({len(field_names)}): {', '.join(field_names)}")

            # Show sample properties
            sample = features[0].get("attributes", {})
            print(f"  Sample props: {json.dumps(sample, ensure_ascii=False)[:200]}")

            # Convert and save
            geojson = esri_to_geojson(features, "", filename.split("_")[2].replace(".geojson", ""))
            with open(outfile, "w", encoding="utf-8") as f:
                json.dump(geojson, f, ensure_ascii=False)

            sz = outfile.stat().st_size
            fc = len(geojson["features"])
            print(f"  ✓ Saved: {filename} ({sz:,} bytes, {fc} features)")

            if fc < expected_count:
                print(f"  ⚠️ WARNING: Got {fc} but expected {expected_count} — might be incomplete!")
            elif fc == expected_count:
                print(f"  ✓ Complete: {fc}/{expected_count}")

            results.append({
                "id": layer_id, "name": desc, "file": filename,
                "features": fc, "expected": expected_count, "size": sz,
            })

            await asyncio.sleep(1)

        # Now verify existing key layers
        print(f"\n{'─'*60}")
        print("Verifying existing layers...")
        verify_layers = [
            (20, "גבולות מגרש תב\"ע", KFAR_CHABAD_BBOX),
            (25, "חלקות מקור", KFAR_CHABAD_BBOX),
        ]

        for layer_id, name, bbox in verify_layers:
            count_data = await count_features(page, layer_id, bbox)
            expected = count_data.get("count", 0)

            # Find our file
            for f in OUTPUT_DIR.glob(f"L{layer_id}_*.geojson"):
                d = json.load(open(f, "r", encoding="utf-8"))
                actual = len(d.get("features", []))
                status = "✓ OK" if actual >= expected else f"⚠️ INCOMPLETE ({actual}/{expected})"
                print(f"  L{layer_id} ({name}): {actual} downloaded, {expected} on server → {status}")
                break

        # Check L9 vs L25 overlap
        print(f"\n{'─'*60}")
        print("Comparing L9 (חלקות) vs L25 (חלקות מקור)...")
        l9_file = OUTPUT_DIR / "L9_P7_חלקות.geojson"
        l25_files = list(OUTPUT_DIR.glob("L25_*.geojson"))

        if l9_file.exists() and l25_files:
            d9 = json.load(open(l9_file, "r", encoding="utf-8"))
            d25 = json.load(open(l25_files[0], "r", encoding="utf-8"))
            n9 = len(d9["features"])
            n25 = len(d25["features"])
            props9 = set(d9["features"][0]["properties"].keys()) if n9 > 0 else set()
            props25 = set(d25["features"][0]["properties"].keys()) if n25 > 0 else set()
            print(f"  L9:  {n9} features, fields: {sorted(props9)}")
            print(f"  L25: {n25} features, fields: {sorted(props25)}")
            only9 = props9 - props25
            only25 = props25 - props9
            common = props9 & props25
            if only9:
                print(f"  Fields ONLY in L9: {sorted(only9)}")
            if only25:
                print(f"  Fields ONLY in L25: {sorted(only25)}")
            print(f"  Common fields: {sorted(common)}")

        # Check L8 vs cadastre blocks
        print(f"\n{'─'*60}")
        print("Comparing L8 (GIS-NET גושים) vs cadastre blocks...")
        l8_file = OUTPUT_DIR / "L8_P7_גושים.geojson"
        cad_blocks = Path(__file__).parent / "data" / "cadastre" / "blocks_kfar_chabad.geojson"

        if l8_file.exists() and cad_blocks.exists():
            d8 = json.load(open(l8_file, "r", encoding="utf-8"))
            dc = json.load(open(cad_blocks, "r", encoding="utf-8"))
            n8 = len(d8["features"])
            nc = len(dc["features"])
            props8 = set(d8["features"][0]["properties"].keys()) if n8 > 0 else set()
            propsc = set(dc["features"][0]["properties"].keys()) if nc > 0 else set()
            print(f"  L8 (GIS-NET):  {n8} features, fields: {sorted(props8)}")
            print(f"  Cadastre:      {nc} features, fields: {sorted(propsc)}")
            only8 = props8 - propsc
            onlyc = propsc - props8
            if only8:
                print(f"  Fields ONLY in GIS-NET: {sorted(only8)}")
            if onlyc:
                print(f"  Fields ONLY in Cadastre: {sorted(onlyc)}")

        await browser.close()

    print(f"\n{'='*70}")
    print("Summary:")
    for r in results:
        status = "✓" if r["features"] >= r["expected"] else "⚠️"
        print(f"  {status} L{r['id']}: {r['name']} — {r['features']} features, {r['size']:,} bytes")
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
