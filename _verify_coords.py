#!/usr/bin/env python3
"""
Verify ITM-to-WGS84 coordinate accuracy for Kfar Chabad plans.
Compare our proj4 conversion with known reference points.
"""
import json
import pyproj

# EPSG:2039 — Israel 1993 / Israeli TM Grid (same as in the web app)
ITM = pyproj.CRS("EPSG:2039")
WGS84 = pyproj.CRS("EPSG:4326")
transformer = pyproj.Transformer.from_crs(ITM, WGS84, always_xy=True)

# Load taba data
with open("data/taba_kfar_chabad.geojson", "r", encoding="utf-8") as f:
    data = json.load(f)

features = data.get("features", [])
print(f"=== TABA Kfar Chabad — {len(features)} plans ===\n")

# Known reference: Kfar Chabad center is approximately:
# WGS84: 31.987, 34.853 (lat, lng)
# ITM (approx): 186900, 655700
print("--- Known Reference ---")
print("Kfar Chabad approximate center: WGS84 31.987°N, 34.853°E")
ref_lng, ref_lat = transformer.transform(186900, 655700)
print(f"ITM (186900, 655700) -> WGS84: {ref_lat:.6f}°N, {ref_lng:.6f}°E")
print()

# Check each plan
print("--- Plan Coordinate Verification ---\n")
for i, feat in enumerate(features):
    props = feat.get("properties", {})
    geom = feat.get("geometry", {})
    plan_num = props.get("PLAN_NUMBER", props.get("pl_number", ""))
    plan_name = props.get("PLAN_NAME", props.get("pl_name", ""))
    
    # Get all coordinates
    coords_raw = geom.get("coordinates", [])
    geom_type = geom.get("type", "")
    
    # Flatten to get all coordinate pairs
    def flatten_coords(c, depth=0):
        if depth > 5:
            return []
        if isinstance(c, list) and len(c) >= 2 and not isinstance(c[0], list):
            return [c]
        result = []
        if isinstance(c, list):
            for item in c:
                result.extend(flatten_coords(item, depth + 1))
        return result
    
    all_coords = flatten_coords(coords_raw)
    if not all_coords:
        print(f"Plan {plan_num}: No coordinates found!")
        continue
    
    # Check if coordinates are ITM or WGS84
    first = all_coords[0]
    is_itm = abs(first[0]) > 1000 or abs(first[1]) > 1000
    
    # Compute centroid
    xs = [c[0] for c in all_coords]
    ys = [c[1] for c in all_coords]
    cx = sum(xs) / len(xs)
    cy = sum(ys) / len(ys)
    
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    
    print(f"Plan {i+1}: {plan_num}")
    print(f"  Name: {plan_name[:60]}")
    print(f"  Type: {geom_type}, Points: {len(all_coords)}")
    print(f"  Coord system: {'ITM (EPSG:2039)' if is_itm else 'WGS84'}")
    print(f"  Raw centroid: ({cx:.2f}, {cy:.2f})")
    print(f"  Raw bbox: X[{min_x:.2f} - {max_x:.2f}], Y[{min_y:.2f} - {max_y:.2f}]")
    
    if is_itm:
        # Convert centroid to WGS84
        wgs_lng, wgs_lat = transformer.transform(cx, cy)
        print(f"  WGS84 centroid: {wgs_lat:.6f}°N, {wgs_lng:.6f}°E")
        
        # Convert bbox corners
        sw_lng, sw_lat = transformer.transform(min_x, min_y)
        ne_lng, ne_lat = transformer.transform(max_x, max_y)
        print(f"  WGS84 bbox: [{sw_lat:.6f}, {sw_lng:.6f}] to [{ne_lat:.6f}, {ne_lng:.6f}]")
        
        # Check if within Kfar Chabad area (roughly 31.97-32.00 lat, 34.84-34.87 lng)
        in_area = 31.95 < wgs_lat < 32.02 and 34.83 < wgs_lng < 34.88
        print(f"  In Kfar Chabad area: {'✓ YES' if in_area else '✗ NO — PROBLEM!'}")
    else:
        in_area = 31.95 < cy < 32.02 and 34.83 < cx < 34.88
        print(f"  In Kfar Chabad area: {'✓ YES' if in_area else '✗ NO — PROBLEM!'}")
    
    print()

# Now also verify with the web app's proj4 definition
print("\n--- Proj4 Definition Comparison ---")
print("Web app proj4 string:")
print("+proj=tmerc +lat_0=31.73439361111111 +lon_0=35.20451694444445 +k=1.0000067")
print("+x_0=219529.584 +y_0=626907.39 +ellps=GRS80")
print("+towgs84=23.772,17.49,17.859,-0.3132,-1.85274,1.67299,-5.4262 +units=m +no_defs")
print()

# Test with the web app's exact proj4 definition
web_proj4 = "+proj=tmerc +lat_0=31.73439361111111 +lon_0=35.20451694444445 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +towgs84=23.772,17.49,17.859,-0.3132,-1.85274,1.67299,-5.4262 +units=m +no_defs"
web_crs = pyproj.CRS.from_proj4(web_proj4)
web_transformer = pyproj.Transformer.from_crs(web_crs, WGS84, always_xy=True)

# Compare using a known coordinate
test_itm_x, test_itm_y = 186900, 655700
pyproj_lng, pyproj_lat = transformer.transform(test_itm_x, test_itm_y)
web_lng, web_lat = web_transformer.transform(test_itm_x, test_itm_y)

print(f"Test point ITM: ({test_itm_x}, {test_itm_y})")
print(f"  pyproj EPSG:2039 result:   {pyproj_lat:.8f}°N, {pyproj_lng:.8f}°E")
print(f"  Web app proj4 result:      {web_lat:.8f}°N, {web_lng:.8f}°E")
diff_m_lat = abs(pyproj_lat - web_lat) * 111320  # approx meters per degree
diff_m_lng = abs(pyproj_lng - web_lng) * 111320 * 0.85  # cos(32°) ≈ 0.85
print(f"  Difference: {diff_m_lat:.3f}m lat, {diff_m_lng:.3f}m lng")
print(f"  Accuracy: {'✓ GOOD (< 1m)' if max(diff_m_lat, diff_m_lng) < 1 else '⚠ CHECK' if max(diff_m_lat, diff_m_lng) < 10 else '✗ BAD'}")

# Also test first plan's first coordinate
if features:
    first_feat = features[0]
    first_coords = flatten_coords(first_feat["geometry"]["coordinates"])
    if first_coords:
        fx, fy = first_coords[0][0], first_coords[0][1]
        p_lng, p_lat = transformer.transform(fx, fy)
        w_lng, w_lat = web_transformer.transform(fx, fy)
        print(f"\nFirst plan first coord ITM: ({fx:.2f}, {fy:.2f})")
        print(f"  pyproj EPSG:2039:   {p_lat:.8f}°N, {p_lng:.8f}°E")
        print(f"  Web app proj4:      {w_lat:.8f}°N, {w_lng:.8f}°E")
        d_lat = abs(p_lat - w_lat) * 111320
        d_lng = abs(p_lng - w_lng) * 111320 * 0.85
        print(f"  Difference: {d_lat:.3f}m lat, {d_lng:.3f}m lng")

# Cross-reference with Google Maps known location
print("\n\n--- Cross-reference with Known Landmarks ---")
landmarks = [
    ("בית כנסת כפר חב\"ד (אדמו\"ר האמצעי)", 186867, 655709, 31.9870, 34.8527),
    ("צומת כפר חב\"ד (כביש 44)", 186500, 655300, 31.9833, 34.8488),
    ("770 כפר חב\"ד", 186950, 655850, 31.9883, 34.8536),
]
for name, itm_x, itm_y, expected_lat, expected_lng in landmarks:
    calc_lng, calc_lat = transformer.transform(itm_x, itm_y)
    err_lat = abs(calc_lat - expected_lat) * 111320
    err_lng = abs(calc_lng - expected_lng) * 111320 * 0.85
    print(f"\n{name}")
    print(f"  ITM: ({itm_x}, {itm_y})")
    print(f"  Calculated WGS84: {calc_lat:.6f}°N, {calc_lng:.6f}°E")
    print(f"  Expected WGS84:   {expected_lat:.6f}°N, {expected_lng:.6f}°E")
    print(f"  Error: {err_lat:.1f}m lat, {err_lng:.1f}m lng, total: {(err_lat**2+err_lng**2)**0.5:.1f}m")
