#!/usr/bin/env python3
"""Verify coordinate conversion accuracy with Google Maps links."""
import json
import pyproj

ITM = pyproj.CRS('EPSG:2039')
WGS84 = pyproj.CRS('EPSG:4326')
to_itm = pyproj.Transformer.from_crs(WGS84, ITM, always_xy=True)
to_wgs = pyproj.Transformer.from_crs(ITM, WGS84, always_xy=True)

print("=== Coordinate Verification for Kfar Chabad ===\n")

# Test roundtrip
lng1, lat1 = 34.8530, 31.9880
itm_x, itm_y = to_itm.transform(lng1, lat1)
rlng, rlat = to_wgs.transform(itm_x, itm_y)
print(f"Roundtrip test: WGS84->ITM->WGS84")
print(f"  Original:  ({lat1:.6f}, {lng1:.6f})")
print(f"  ITM:       ({itm_x:.2f}, {itm_y:.2f})")
print(f"  Roundtrip: ({rlat:.6f}, {rlng:.6f})")
print(f"  Error: {abs(lat1-rlat)*111320:.4f}m lat, {abs(lng1-rlng)*111320*0.85:.4f}m lng")
print()

# Check plan centroids with Google Maps
print("=== Plan Centroids -> Google Maps Links ===\n")

plans_to_check = [
    ("Plan 1: שינוי תשריט מעון יום", 186073.78, 655121.92),
    ("Plan 2: מגרש 124 דרעי", 185996.98, 655813.00),
    ("Plan 4: מגרש 140 מינסקי", 186107.96, 655589.41),
    ("Plan 12: נחלה 50", 186259.05, 655386.74),
    ("Plan 13: נחלה 30", 186394.45, 654797.39),
    ("Plan 5: מגרש 225", 186719.13, 654700.97),
]

for name, itm_x, itm_y in plans_to_check:
    wgs_lng, wgs_lat = to_wgs.transform(itm_x, itm_y)
    print(f"{name}")
    print(f"  ITM: ({itm_x:.2f}, {itm_y:.2f})")
    print(f"  WGS84: {wgs_lat:.6f}N, {wgs_lng:.6f}E")
    print(f"  Google Maps: https://www.google.com/maps?q={wgs_lat},{wgs_lng}")
    print()

# Check cadastre data
print("=== Cadastre Parcels Sample ===\n")
with open('data/cadastre/parcels_kfar_chabad.geojson', 'r', encoding='utf-8') as f:
    cad = json.load(f)
feats = cad.get('features', [])
print(f"Total parcels: {len(feats)}")

# Check first 3 parcels
for feat in feats[:3]:
    props = feat['properties']
    gush = props.get('GUSH_NUM', '?')
    helka = props.get('PARCEL', '?')
    coords = feat['geometry']['coordinates']
    # Flatten
    first = coords
    while isinstance(first[0], list):
        first = first[0]
    fx, fy = first[0], first[1]
    
    gush_int = int(gush) if gush != '?' else '?'
    helka_int = int(helka) if helka != '?' else '?'
    
    if abs(fx) > 1000:
        flng, flat = to_wgs.transform(fx, fy)
        print(f"  Gush {gush_int}, Helka {helka_int}: ITM({fx:.0f}, {fy:.0f}) -> WGS84({flat:.6f}, {flng:.6f})")
        print(f"    https://www.google.com/maps?q={flat},{flng}")
    else:
        print(f"  Gush {gush_int}, Helka {helka_int}: WGS84({fy:.6f}, {fx:.6f})")

# Compare with web app's proj4 definition
print("\n=== Web App vs pyproj Comparison ===\n")
web_proj4 = "+proj=tmerc +lat_0=31.73439361111111 +lon_0=35.20451694444445 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +towgs84=23.772,17.49,17.859,-0.3132,-1.85274,1.67299,-5.4262 +units=m +no_defs"
web_crs = pyproj.CRS.from_proj4(web_proj4)
web_to_wgs = pyproj.Transformer.from_crs(web_crs, WGS84, always_xy=True)

test_points = [
    (186073.78, 655121.92),
    (185996.98, 655813.00),
    (186719.13, 654700.97),
]

for itm_x, itm_y in test_points:
    p_lng, p_lat = to_wgs.transform(itm_x, itm_y)
    w_lng, w_lat = web_to_wgs.transform(itm_x, itm_y)
    d_lat = abs(p_lat - w_lat) * 111320
    d_lng = abs(p_lng - w_lng) * 111320 * 0.85
    total = (d_lat**2 + d_lng**2)**0.5
    status = "MATCH" if total < 0.01 else ("CLOSE" if total < 1 else "DIFF")
    print(f"  ITM({itm_x:.0f}, {itm_y:.0f}): diff={total:.4f}m [{status}]")
    print(f"    pyproj:  ({p_lat:.8f}, {p_lng:.8f})")
    print(f"    web app: ({w_lat:.8f}, {w_lng:.8f})")
