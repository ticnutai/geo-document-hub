#!/usr/bin/env python3
"""
Extract plan boundaries from KML files and SHP ZIPs into a single GeoJSON.

Sources:
  1. KML files (גבול התכנית) in data/docs/*/  – already WGS84
  2. SHP ZIPs (קבצי התכנית SHP) in data/docs/*/ – MVT_GVUL layer, ITM→WGS84

Output: data/plan_boundaries.geojson
"""
import json, os, glob, re, zipfile, tempfile, shutil
import xml.etree.ElementTree as ET
from pathlib import Path

# ── GIS imports ──
import shapefile  # pyshp
from pyproj import Transformer

DATA_DIR = Path(__file__).parent / "data"
DOCS_DIR = DATA_DIR / "docs"
OUT_PATH = DATA_DIR / "plan_boundaries.geojson"

# ITM (EPSG:2039) → WGS84
transformer = Transformer.from_crs("EPSG:2039", "EPSG:4326", always_xy=True)

# ── Helpers ──

def folder_to_plan_number(folder_name: str) -> str:
    """Convert folder name like 'גז_ 525_ 12' back to plan number 'גז/ 525/ 12'."""
    return folder_name.replace("_", "/")


def parse_kml_coordinates(kml_path: str) -> list:
    """Parse KML file and return list of polygon coordinate rings [[lng,lat], ...]."""
    try:
        tree = ET.parse(kml_path)
    except ET.ParseError:
        return []
    root = tree.getroot()
    ns = "http://www.opengis.net/kml/2.2"
    
    polygons = []
    
    # Try to find Polygon elements
    for polygon in root.iter(f"{{{ns}}}Polygon"):
        outer = polygon.find(f".//{{{ns}}}outerBoundaryIs/{{{ns}}}LinearRing/{{{ns}}}coordinates")
        if outer is not None and outer.text:
            ring = parse_coord_text(outer.text)
            if ring:
                poly = {"outer": ring, "holes": []}
                # Inner boundaries (holes)
                for inner in polygon.findall(f".//{{{ns}}}innerBoundaryIs/{{{ns}}}LinearRing/{{{ns}}}coordinates"):
                    if inner.text:
                        hole = parse_coord_text(inner.text)
                        if hole:
                            poly["holes"].append(hole)
                polygons.append(poly)
    
    # Fallback: try raw coordinates tags (some KMLs have LineString or Point only)
    if not polygons:
        for coords_el in root.iter(f"{{{ns}}}coordinates"):
            if coords_el.text:
                ring = parse_coord_text(coords_el.text)
                if ring and len(ring) >= 3:
                    polygons.append({"outer": ring, "holes": []})
    
    return polygons


def parse_coord_text(text: str) -> list:
    """Parse KML coordinate text 'lng,lat,alt lng,lat,alt ...' → [[lng,lat],...]."""
    coords = []
    for pt in text.strip().split():
        parts = pt.strip().split(",")
        if len(parts) >= 2:
            try:
                lng, lat = float(parts[0]), float(parts[1])
                coords.append([lng, lat])
            except ValueError:
                continue
    return coords


def polygons_to_geojson_geometry(polygons: list) -> dict:
    """Convert list of polygon dicts to GeoJSON geometry."""
    if not polygons:
        return None
    
    if len(polygons) == 1:
        p = polygons[0]
        rings = [p["outer"]]
        rings.extend(p["holes"])
        return {"type": "Polygon", "coordinates": rings}
    else:
        multi = []
        for p in polygons:
            rings = [p["outer"]]
            rings.extend(p["holes"])
            multi.append(rings)
        return {"type": "MultiPolygon", "coordinates": multi}


def extract_shp_boundary(zip_path: str) -> dict:
    """Extract MVT_GVUL or MVT_PLAN boundary from SHP ZIP, convert ITM→WGS84."""
    tmpdir = tempfile.mkdtemp()
    try:
        with zipfile.ZipFile(zip_path) as zf:
            # Look for MVT_GVUL first, then MVT_PLAN
            members = zf.namelist()
            target = None
            for layer_name in ["MVT_GVUL", "MVT_PLAN"]:
                needed = [f"{layer_name}.shp", f"{layer_name}.shx", f"{layer_name}.dbf"]
                if all(any(m.endswith(f"/{n}") or m == n for m in members) for n in needed):
                    target = layer_name
                    break
            
            if not target:
                return None
            
            # Extract needed files
            for m in members:
                base = os.path.basename(m)
                if base.startswith(target):
                    zf.extract(m, tmpdir)
            
            # Find the .shp file
            shp_files = glob.glob(os.path.join(tmpdir, "**", f"{target}.shp"), recursive=True)
            if not shp_files:
                return None
            
            sf = shapefile.Reader(shp_files[0])
            shapes = sf.shapes()
            if not shapes:
                return None
            
            # Convert all shapes
            polygons = []
            for shape in shapes:
                if shape.shapeType in (5, 15, 25):  # Polygon types
                    # Convert ITM → WGS84
                    wgs_points = []
                    for x, y in shape.points:
                        lng, lat = transformer.transform(x, y)
                        wgs_points.append([lng, lat])
                    
                    # Handle parts (rings)
                    parts = list(shape.parts) + [len(wgs_points)]
                    rings = []
                    for i in range(len(parts) - 1):
                        ring = wgs_points[parts[i]:parts[i+1]]
                        rings.append(ring)
                    
                    if rings:
                        polygons.append({"outer": rings[0], "holes": rings[1:]})
            
            return polygons_to_geojson_geometry(polygons)
    
    except Exception as e:
        print(f"  ERROR reading SHP ZIP {os.path.basename(zip_path)}: {e}")
        return None
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def compute_centroid(geometry: dict) -> tuple:
    """Compute centroid (lat, lng) from GeoJSON geometry."""
    try:
        from shapely.geometry import shape
        s = shape(geometry)
        c = s.centroid
        return (c.y, c.x)  # lat, lng
    except:
        # Fallback: average of first ring
        coords = geometry.get("coordinates", [])
        if geometry["type"] == "MultiPolygon":
            coords = coords[0][0] if coords else []
        elif geometry["type"] == "Polygon":
            coords = coords[0] if coords else []
        if coords:
            lats = [c[1] for c in coords]
            lngs = [c[0] for c in coords]
            return (sum(lats)/len(lats), sum(lngs)/len(lngs))
        return (None, None)


def main():
    features = {}  # plan_number → feature
    
    print("=" * 60)
    print("Extracting plan boundaries from KML and SHP files")
    print("=" * 60)
    
    # ── 1. KML files ──
    print("\n── Phase 1: KML files ──")
    kml_pattern = str(DOCS_DIR / "**" / "*גבול התכנית(KML)*.kml")
    kml_files = glob.glob(kml_pattern, recursive=True)
    print(f"Found {len(kml_files)} KML boundary files")
    
    kml_ok = 0
    for kml_path in kml_files:
        folder = os.path.basename(os.path.dirname(kml_path))
        plan_num = folder_to_plan_number(folder)
        
        # Skip _gen_ duplicates if we already have the original
        fname = os.path.basename(kml_path)
        is_gen = "_gen_" in fname
        if is_gen and plan_num in features:
            continue
        
        polygons = parse_kml_coordinates(kml_path)
        geom = polygons_to_geojson_geometry(polygons)
        if geom:
            lat, lng = compute_centroid(geom)
            features[plan_num] = {
                "type": "Feature",
                "properties": {
                    "plan_number": plan_num,
                    "source": "kml",
                    "lat": lat,
                    "lng": lng
                },
                "geometry": geom
            }
            kml_ok += 1
    
    print(f"  Extracted {kml_ok} boundaries from KML")
    
    # ── 2. SHP ZIPs ──
    print("\n── Phase 2: SHP ZIP files ──")
    shp_pattern = str(DOCS_DIR / "**" / "*SHP*.zip")
    shp_zips = glob.glob(shp_pattern, recursive=True)
    # Deduplicate (skip _gen_ if original exists)
    seen_folders = set()
    unique_zips = []
    for z in shp_zips:
        folder = os.path.basename(os.path.dirname(z))
        fname = os.path.basename(z)
        is_gen = "_gen_" in fname
        key = folder
        if key not in seen_folders or not is_gen:
            seen_folders.add(key)
            unique_zips.append(z)
    
    print(f"Found {len(unique_zips)} unique SHP ZIPs")
    
    shp_ok = 0
    shp_skip = 0
    for z in unique_zips:
        folder = os.path.basename(os.path.dirname(z))
        plan_num = folder_to_plan_number(folder)
        
        # Skip if already have KML boundary
        if plan_num in features:
            shp_skip += 1
            continue
        
        geom = extract_shp_boundary(z)
        if geom:
            lat, lng = compute_centroid(geom)
            features[plan_num] = {
                "type": "Feature",
                "properties": {
                    "plan_number": plan_num,
                    "source": "shp",
                    "lat": lat,
                    "lng": lng
                },
                "geometry": geom
            }
            shp_ok += 1
            print(f"  + {plan_num} (SHP)")
    
    print(f"  Extracted {shp_ok} boundaries from SHP ({shp_skip} already had KML)")
    
    # ── 3. Save combined GeoJSON ──
    geojson = {
        "type": "FeatureCollection",
        "features": list(features.values())
    }
    
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'=' * 60}")
    print(f"DONE: {len(features)} plan boundaries → {OUT_PATH}")
    print(f"  KML: {kml_ok}  |  SHP: {shp_ok}  |  Total: {len(features)}")
    
    # Show summary of old plans (non 425-*)
    old = [k for k in features.keys() if not k.startswith("425-")]
    print(f"\n  Old plans with boundaries: {len(old)}")
    for p in sorted(old)[:20]:
        src = features[p]["properties"]["source"]
        print(f"    {p} ({src})")
    if len(old) > 20:
        print(f"    ... and {len(old)-20} more")


if __name__ == "__main__":
    main()
