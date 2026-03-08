#!/usr/bin/env python3
"""
Try to fetch GIS boundary for old plan גז/525/12 (MP_ID=4063057)
from multiple sources:
1. iPlan Xplan MapServer Layer 1 (plan boundaries)
2. iPlan Xplan MapServer with MP_ID filter
3. MAVAT SV4 endpoint
4. Fallback: union of cadastre blocks
"""
import urllib.request, urllib.parse, json, sys, os

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
MP_ID = 4063057
PLAN_NUMBER = "גז/ 525/ 12"


def fetch_json(url, params=None, timeout=30):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url)
    req.add_header("User-Agent", UA)
    try:
        r = urllib.request.urlopen(req, timeout=timeout)
        return json.loads(r.read())
    except Exception as e:
        print(f"  ERROR: {e}")
        return None


def try_xplan_layer1():
    """Query Xplan Layer 1 (plan boundaries) by pl_number"""
    print("\n=== 1. Xplan Layer 1 by pl_number ===")
    url = "https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer/1/query"
    
    # Try different WHERE clauses
    queries = [
        f"pl_number = '{PLAN_NUMBER}'",
        "pl_number LIKE '%525%12%'",
        f"mp_id = {MP_ID}",
        f"OBJECTID = {MP_ID}",
    ]
    for where in queries:
        print(f"  WHERE: {where}")
        data = fetch_json(url, {
            "where": where,
            "outFields": "*",
            "outSR": "4326",
            "f": "json",
            "returnGeometry": "true",
        })
        if data:
            feats = data.get("features", [])
            print(f"  Features: {len(feats)}")
            if feats:
                for feat in feats[:3]:
                    attrs = feat.get("attributes", {})
                    geom = feat.get("geometry", {})
                    print(f"    pl_number={attrs.get('pl_number')}, mp_id={attrs.get('mp_id')}")
                    print(f"    geom keys: {list(geom.keys())}")
                    if "rings" in geom:
                        print(f"    rings: {len(geom['rings'])} ring(s), first ring points: {len(geom['rings'][0])}")
                return feats
            err = data.get("error", {})
            if err:
                print(f"  Error: {err}")
    return []


def try_xplan_all_layers():
    """Try Xplan layers 0-6 with MP_ID filter"""
    print("\n=== 2. All Xplan layers with MP_ID ===")
    base = "https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer"
    
    for layer_id in range(7):
        url = f"{base}/{layer_id}/query"
        data = fetch_json(url, {
            "where": f"mp_id = {MP_ID}",
            "outFields": "mp_id,pl_number,pl_name,entity_subtype_desc",
            "outSR": "4326",
            "f": "json",
            "returnGeometry": "true",
            "returnCountOnly": "true",
        })
        if data:
            count = data.get("count", 0)
            if count > 0:
                print(f"  Layer {layer_id}: {count} features!")
                # Fetch actual data
                data2 = fetch_json(url, {
                    "where": f"mp_id = {MP_ID}",
                    "outFields": "*",
                    "outSR": "4326",
                    "f": "json",
                    "returnGeometry": "true",
                })
                if data2:
                    feats = data2.get("features", [])
                    for feat in feats[:3]:
                        attrs = feat.get("attributes", {})
                        geom = feat.get("geometry", {})
                        print(f"    {attrs.get('pl_number')} | {attrs.get('entity_subtype_desc','')}")
                        print(f"    geom: {list(geom.keys())}")
            else:
                print(f"  Layer {layer_id}: 0")


def try_mavat_sv4():
    """Try MAVAT SV4 service"""
    print("\n=== 3. MAVAT SV4 ===")
    # SV4 is the plan viewer endpoint 
    url = f"https://mavat.iplan.gov.il/SV4/1/{MP_ID}/310"
    print(f"  URL: {url}")
    try:
        req = urllib.request.Request(url)
        req.add_header("User-Agent", UA)
        r = urllib.request.urlopen(req, timeout=30)
        ct = r.headers.get("Content-Type", "")
        data = r.read()
        print(f"  Status: {r.status}, Content-Type: {ct}, Size: {len(data)} bytes")
        if "json" in ct:
            j = json.loads(data)
            print(f"  JSON keys: {list(j.keys()) if isinstance(j, dict) else type(j)}")
        else:
            print(f"  First 500 bytes: {data[:500]}")
    except Exception as e:
        print(f"  ERROR: {e}")


def try_iplan_entities():
    """Try iPlan entities service"""
    print("\n=== 4. iPlan Entities Service ===")
    urls = [
        f"https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer/1/query",
    ]
    # Try querying by plan_county_name (like Kfar Chabad) + plan number
    data = fetch_json(urls[0], {
        "where": "plan_county_name LIKE '%חב_ד%' AND pl_number LIKE '%525%'",
        "outFields": "pl_number,pl_name,mp_id",
        "outSR": "4326",
        "f": "json",
        "returnGeometry": "true",
    })
    if data:
        feats = data.get("features", [])
        print(f"  Features with county=Chabad + 525: {len(feats)}")
        for feat in feats[:10]:
            attrs = feat.get("attributes", {})
            geom = feat.get("geometry", {})
            has_geom = bool(geom and (geom.get("rings") or geom.get("paths") or geom.get("x")))
            print(f"    {attrs.get('pl_number')} | {attrs.get('pl_name','')} | mp_id={attrs.get('mp_id')} | geom={has_geom}")


def try_govmap_wfs():
    """Try GovMap WFS service for plan boundaries"""
    print("\n=== 5. GovMap WFS ===")
    # The GovMap WFS/WMS endpoint for TABA (planning) 
    url = "https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer/527/query"
    # This is Tel Aviv specific, let's try the national one
    url = "https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer/1/query"
    
    # Query by different ID types
    for field, val in [("pl_number", f"'{PLAN_NUMBER}'"), ("mp_id", str(MP_ID))]:
        data = fetch_json(url, {
            "where": f"{field} = {val}",
            "outFields": "*",
            "outSR": "4326",
            "f": "json",
            "returnGeometry": "true",
        })
        if data:
            feats = data.get("features", [])
            print(f"  {field}={val}: {len(feats)} features")
            if feats:
                return feats
    return []


def try_iplan_6991():
    """Try Xplan_6991 service (alternative Xplan with different plan set)"""
    print("\n=== 6. Xplan_6991 MapServer ===")
    base = "https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan_6991/MapServer"
    
    # First check what layers exist
    data = fetch_json(base, {"f": "json"})
    if data:
        layers = data.get("layers", [])
        print(f"  Layers: {len(layers)}")
        for lyr in layers:
            print(f"    {lyr.get('id')}: {lyr.get('name')}")
    
    # Try layer 1 (usually plan boundaries)
    for lid in [0, 1]:
        url = f"{base}/{lid}/query"
        data = fetch_json(url, {
            "where": f"mp_id = {MP_ID}",
            "outFields": "*",
            "outSR": "4326",
            "f": "json",
            "returnGeometry": "true",
            "returnCountOnly": "true",
        })
        if data:
            count = data.get("count", 0)
            print(f"  Layer {lid} with mp_id={MP_ID}: {count} features")
            if count > 0:
                data2 = fetch_json(url, {
                    "where": f"mp_id = {MP_ID}",
                    "outFields": "*",
                    "outSR": "4326",
                    "f": "json",
                    "returnGeometry": "true",
                })
                if data2:
                    return data2.get("features", [])
    return []


def build_block_union():
    """Build boundary from union of cadastre blocks"""
    print("\n=== 7. Block union from cadastre ===")
    try:
        from shapely.geometry import shape
        from shapely.ops import unary_union
    except ImportError:
        print("  shapely not available")
        return None

    target_blocks = [6256, 6258, 6260, 6261, 6262, 6269, 6272, 6280]

    with open("data/cadastre/blocks_kfar_chabad.geojson", "r", encoding="utf-8") as f:
        blocks = json.load(f)
    
    polygons = []
    for feat in blocks["features"]:
        gn = feat["properties"].get("GUSH_NUM")
        if gn in target_blocks:
            try:
                poly = shape(feat["geometry"])
                if poly.is_valid:
                    polygons.append(poly)
                else:
                    polygons.append(poly.buffer(0))
            except Exception as e:
                print(f"  Error with block {gn}: {e}")
    
    print(f"  Found {len(polygons)} block polygons")
    if not polygons:
        return None
    
    union = unary_union(polygons)
    print(f"  Union type: {union.geom_type}")
    print(f"  Bounds: {union.bounds}")
    
    # Convert to GeoJSON
    from shapely.geometry import mapping
    geojson = {
        "type": "Feature",
        "properties": {
            "pl_number": PLAN_NUMBER,
            "pl_name": "שינוי תכנית מיתאר מקומית מס' גז/12/525",
            "source": "cadastre_block_union",
            "blocks": target_blocks,
        },
        "geometry": mapping(union),
    }
    
    # Save
    os.makedirs("data/plan_boundaries", exist_ok=True)
    out_path = "data/plan_boundaries/gz_525_12.geojson"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    print(f"  Saved to {out_path}")
    
    return geojson


if __name__ == "__main__":
    # Try online sources first
    result = try_xplan_layer1()
    if not result:
        try_xplan_all_layers()
    if not result:
        try_mavat_sv4()
    if not result:
        result = try_iplan_entities()
    if not result:
        result = try_iplan_6991()
    
    # Always build block union as reference
    geojson = build_block_union()
    
    print("\n=== SUMMARY ===")
    if result:
        print("Found boundary from online source!")
    elif geojson:
        print("Built boundary from block union (cadastre)")
    else:
        print("No boundary available")
