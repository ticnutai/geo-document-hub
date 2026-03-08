#!/usr/bin/env python3
"""
Gush Helka Map - Web UI Server
כפר חב"ד - גושים, חלקות ותב"עות

Usage: python serve_ui.py [port]
"""

import http.server
import json
import os
import re
import sys
import urllib.parse
import tempfile
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
BASE = Path(__file__).parent
DATA = BASE / "data"
WEB = BASE / "web"

_summary_cache = None
_analysis_cache = None
_parcel_index = {}  # {"gush-helka": {lat, lng, area, status, ...}}
_plan_index = []    # [{number, name, blocks, ...}]
_parcels_by_gush = {}  # gush_str -> [feature, ...]  (raw GeoJSON features)
_migrash_index = {}  # {"gush-helka": {migrash, plan, yeud, shetach_sqm}}
_doc_index = {}      # {doc_key: {path, plan, name, type, source, ...}}
_plan_boundaries = {}  # {plan_number: GeoJSON Feature with geometry}
_tabanow_data = None   # Full TabaNow data (loaded from tabanow_all_plans.json)
_static_file_cache = {}  # path -> (mtime_ns, data)


def _sanitize_filename(name):
    """Same sanitization used during download."""
    name = name.strip()
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    name = re.sub(r'\s+', ' ', name)
    return name[:200]


def build_doc_index():
    """Build an index mapping doc entries to local file paths."""
    global _doc_index
    docs_dir = DATA / "docs"
    if not docs_dir.exists():
        return

    # Load the full document index
    idx_file = DATA / "all_documents_index.json"
    if not idx_file.exists():
        return

    with open(idx_file, "r", encoding="utf-8") as f:
        raw = json.load(f)
    docs = raw.get("documents", raw) if isinstance(raw, dict) else raw

    for i, doc in enumerate(docs):
        plan = doc.get("plan", "")
        plan_number = doc.get("plan_number", plan)
        source = doc.get("source", "")
        doc_name = doc.get("DOC_NAME", "")
        ft = (doc.get("FILE_TYPE") or "pdf").strip().lower()
        doc_id = doc.get("ID")

        # Build expected filename based on source
        if source == "rsPlanDocsGen":
            fn = f"{plan_number}_gen_{doc_name}" if doc_name else None
        elif source == "rsDes":
            # Try protocol and decision variations
            meeting_date = doc.get("MEETING_DATE", "")
            candidates = []
            for label in ["החלטה", "פרוטוקול"]:
                fn_try = _sanitize_filename(f"{plan_number}_{label}_{meeting_date}")
                fp = docs_dir / plan / f"{fn_try}.{ft}"
                if fp.exists():
                    candidates.append(fp)
            if candidates:
                # Store all candidates
                for ci, fp in enumerate(candidates):
                    key = f"{i}_{ci}"
                    _doc_index[key] = {
                        "path": str(fp),
                        "plan": plan,
                        "name": doc_name or fp.stem,
                        "type": ft,
                        "source": source,
                        "idx": i,
                    }
            continue
        elif source == "rsMeetingsDocs":
            fn = None  # Not downloaded
        else:  # rsPlanDocs, rsPlanDocsAdd, rsPubDocs
            fn = f"{plan_number}_{doc_name}" if doc_name else None

        if fn:
            fn_safe = _sanitize_filename(fn)
            fp = docs_dir / plan / f"{fn_safe}.{ft}"
            if fp.exists():
                _doc_index[str(i)] = {
                    "path": str(fp),
                    "plan": plan,
                    "name": doc_name,
                    "type": ft,
                    "source": source,
                    "idx": i,
                }

    # Also scan for additional files on disk not in index
    for plan_dir in docs_dir.iterdir():
        if not plan_dir.is_dir():
            continue
        for fp in plan_dir.iterdir():
            if fp.name.startswith("_") or not fp.is_file():
                continue
            # Check if already indexed
            already = any(d["path"] == str(fp) for d in _doc_index.values())
            if not already:
                key = f"disk_{fp.stem}"
                _doc_index[key] = {
                    "path": str(fp),
                    "plan": plan_dir.name,
                    "name": fp.stem,
                    "type": fp.suffix.lstrip(".").lower(),
                    "source": "disk",
                    "idx": -1,
                }


def build_parcel_index():
    """Build a gush→helka lookup from the parcels GeoJSON."""
    global _parcels_by_gush
    idx = {}
    parcels_file = DATA / "cadastre" / "parcels_kfar_chabad.geojson"
    if not parcels_file.exists():
        return idx
    try:
        with open(parcels_file, "r", encoding="utf-8") as f:
            pdata = json.load(f)
        for feat in pdata.get("features", []):
            props = feat.get("properties", {})
            gush = props.get("GUSH_NUM")
            helka = props.get("PARCEL")
            if gush is None or helka is None:
                continue
            gush_str = str(int(gush))
            helka_str = str(int(helka))
            # Compute centroid from geometry
            geom = feat.get("geometry", {})
            coords = geom.get("coordinates", [])
            lat, lng = _centroid(geom)
            cx, cy = _centroid_raw(geom)
            key = f"{gush_str}-{helka_str}"
            idx[key] = {
                "gush": int(gush),
                "helka": int(helka),
                "lat": lat,
                "lng": lng,
                "itm_x": cx,  # raw ITM easting for client-side conversion
                "itm_y": cy,  # raw ITM northing for client-side conversion
                "area": props.get("LEGAL_AREA"),
                "status": props.get("STATUS_TEX", ""),
                "locality": props.get("LOCALITY_N", ""),
                "gush_helka": props.get("GushHelka", ""),
            }
            # Also store in gush-based list for partial search
            gush_key = f"g{gush_str}"
            if gush_key not in idx:
                idx[gush_key] = []
            idx[gush_key].append(int(helka))
            # Store raw features grouped by gush for GeoJSON endpoint
            if gush_str not in _parcels_by_gush:
                _parcels_by_gush[gush_str] = []
            _parcels_by_gush[gush_str].append(feat)
    except Exception as e:
        print(f"  Warning: Could not build parcel index: {e}")
    return idx


def _centroid_raw(geom):
    """Compute true area-weighted centroid of a GeoJSON geometry.
    Returns raw coordinates in the same CRS as input (ITM easting, northing)."""
    gtype = geom.get("type", "")
    coords = geom.get("coordinates", [])
    try:
        if gtype == "Polygon":
            ring = coords[0]
        elif gtype == "MultiPolygon":
            ring = coords[0][0]
        else:
            return (0, 0)
        n = len(ring)
        if n < 3:
            return (0, 0)
        # Shoelace formula for true centroid
        A = 0
        cx = 0
        cy = 0
        for i in range(n - 1):
            cross = ring[i][0] * ring[i+1][1] - ring[i+1][0] * ring[i][1]
            A += cross
            cx += (ring[i][0] + ring[i+1][0]) * cross
            cy += (ring[i][1] + ring[i+1][1]) * cross
        A /= 2
        if abs(A) < 1e-10:
            cx = sum(c[0] for c in ring) / n
            cy = sum(c[1] for c in ring) / n
        else:
            cx = cx / (6 * A)
            cy = cy / (6 * A)
        return (cx, cy)  # (easting, northing) or (lng, lat)
    except Exception:
        return (0, 0)


def _centroid(geom):
    """Compute centroid and convert to WGS84. Returns (lat, lng)."""
    cx, cy = _centroid_raw(geom)
    if cx > 100000 and cy > 100000:
        lat, lng = _itm_to_wgs84(cx, cy)
        return (lat, lng)
    return (cy, cx)  # Already WGS84 (lng, lat order in GeoJSON)


def _itm_to_wgs84(easting, northing):
    """Convert EPSG:2039 (Israel 1993 / Israeli TM Grid) to WGS84 lat/lng.
    Uses EPSG:1184 7-parameter Helmert transformation (accuracy ~1m).
    Matches the client-side proj4js definition exactly."""
    try:
        from pyproj import Transformer, CRS
        _t = getattr(_itm_to_wgs84, '_transformer', None)
        if _t is None:
            crs_itm = CRS.from_proj4(
                '+proj=tmerc +lat_0=31.73439361111111 +lon_0=35.20451694444445 '
                '+k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 '
                '+towgs84=23.772,17.49,17.859,-0.3132,-1.85274,1.67299,-5.4262 '
                '+units=m +no_defs'
            )
            _t = Transformer.from_crs(crs_itm, CRS.from_epsg(4326), always_xy=True)
            _itm_to_wgs84._transformer = _t
        lng, lat = _t.transform(easting, northing)
        return (lat, lng)
    except ImportError:
        pass
    # Fallback: manual computation (no datum shift — ~50m less accurate)
    import math
    a = 6378137.0  # GRS80 semi-major axis
    f = 1 / 298.257222101
    e2 = 2 * f - f * f
    e = math.sqrt(e2)
    e_prime2 = e2 / (1 - e2)

    # ITM projection parameters
    lon0 = math.radians(35.2045169444)  # Central meridian longitude
    lat0 = math.radians(31.7343936111)  # Latitude of origin
    k0 = 1.0000067  # Scale factor
    FE = 219529.584  # False easting
    FN = 626907.39   # False northing

    # Remove false easting/northing
    x = easting - FE
    y = northing - FN

    # Compute M0 (meridian arc to latitude of origin)
    M0 = a * (
        (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * lat0
        - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * math.sin(2 * lat0)
        + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * math.sin(4 * lat0)
        - (35 * e2 ** 3 / 3072) * math.sin(6 * lat0)
    )

    # Footprint latitude
    M = M0 + y / k0
    mu = M / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256))

    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    phi1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * math.sin(2 * mu) \
         + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * math.sin(4 * mu) \
         + (151 * e1 ** 3 / 96) * math.sin(6 * mu)

    N1 = a / math.sqrt(1 - e2 * math.sin(phi1) ** 2)
    T1 = math.tan(phi1) ** 2
    C1 = e_prime2 * math.cos(phi1) ** 2
    R1 = a * (1 - e2) / (1 - e2 * math.sin(phi1) ** 2) ** 1.5
    D = x / (N1 * k0)

    lat = phi1 - (N1 * math.tan(phi1) / R1) * (
        D ** 2 / 2
        - (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * e_prime2) * D ** 4 / 24
        + (61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * e_prime2 - 3 * C1 ** 2) * D ** 6 / 720
    )

    lon = lon0 + (
        D
        - (1 + 2 * T1 + C1) * D ** 3 / 6
        + (5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * e_prime2 + 24 * T1 ** 2) * D ** 5 / 120
    ) / math.cos(phi1)

    lat_deg = math.degrees(lat)
    lon_deg = math.degrees(lon)

    # Fallback: approximate 3-parameter datum shift (Israel 1993 → WGS84)
    # Less accurate than pyproj's 7-param Helmert (~10m error). Only used if pyproj missing.
    # towgs84 ≈ -48, 55, 52 (dX, dY, dZ in meters)
    sin_lat = math.sin(lat)
    cos_lat = math.cos(lat)
    sin_lon = math.sin(lon)
    cos_lon = math.cos(lon)
    N_val = a / math.sqrt(1 - e2 * sin_lat ** 2)
    dX, dY, dZ = -48.0, 55.0, 52.0
    dlat = (-dX * sin_lat * cos_lon - dY * sin_lat * sin_lon + dZ * cos_lat) / (R1 + 0)
    dlon = (-dX * sin_lon + dY * cos_lon) / ((N_val + 0) * cos_lat)
    lat_deg += math.degrees(dlat)
    lon_deg += math.degrees(dlon)

    return (lat_deg, lon_deg)


def _norm_plan_num(num: str) -> str:
    """Normalize plan number: strip all whitespace, keep slashes."""
    return re.sub(r'\s+', '', num)


def _flex_plan_num(num: str) -> str:
    """Flex-normalize: strip ALL whitespace, slashes and dashes.
    Allows matching regardless of how separators are written.
    e.g. 'גז/ 525/ 12' -> 'גז52512',  'גז/525/12' -> 'גז52512'"""
    return re.sub(r'[\s/\-]+', '', num)


def _slash_sep_plan_num(num: str) -> str:
    """Normalize any mix of spaces/slashes to single slash.
    e.g. 'גז 525 12' -> 'גז/525/12',  'גז/ 525/ 12' -> 'גז/525/12'"""
    return re.sub(r'[\s/]+', '/', num.strip()).strip('/')


def _alt_plan_num(num: str) -> str:
    """Return alternative ordering prefix/b/a for a prefix/a/b plan number.
    Used to match complot format (reversed sub-number order) against block_plan_map."""
    parts = [p.strip() for p in num.split('/') if p.strip()]
    if len(parts) == 3:
        return '/'.join([parts[0], parts[2], parts[1]])
    return _norm_plan_num(num)


def build_plan_index():
    """Build a searchable plan index from taba + all_plans_by_block."""
    plans = []
    taba_numbers = set()

    # From taba GeoJSON
    taba_file = DATA / "taba_kfar_chabad.geojson"
    if taba_file.exists():
        try:
            with open(taba_file, "r", encoding="utf-8") as f:
                taba = json.load(f)
            for feat in taba.get("features", []):
                p = feat.get("properties", {})
                lat, lng = _centroid(feat.get("geometry", {}))
                num = p.get("pl_number", "")
                taba_numbers.add(num)
                plans.append({
                    "number": num,
                    "name": p.get("pl_name", ""),
                    "status": p.get("station_desc") or p.get("internet_short_status", ""),
                    "entity": p.get("jurstiction_area_name", ""),
                    "area_dunam": p.get("pl_area_dunam"),
                    "landuse": p.get("pl_landuse_string", ""),
                    "lat": lat,
                    "lng": lng,
                    "mp_id": p.get("mp_id"),
                    "source": "taba",
                })
        except Exception as e:
            print(f"  Warning: Could not parse taba for plan index: {e}")

    # Build name lookup from complot GetTabaNames
    # complot label format: "גז/12/525 - שם התכנית" (reversed: prefix/sub/base)
    complot_names = {}  # normalized_number → name
    cp_file = DATA / "complot_kfar_chabad" / "complot_parsed.json"
    if cp_file.exists():
        try:
            with open(cp_file, "r", encoding="utf-8") as f:
                cp = json.load(f)
            for item in cp.get("GetTabaNames", []):
                label = (item.get("label") or "").strip()
                if " - " in label:
                    plan_part, name_part = label.split(" - ", 1)
                    norm = _norm_plan_num(plan_part)
                    complot_names[norm] = name_part.strip()
                    # also store alt-order key
                    alt = _alt_plan_num(plan_part)
                    if alt != norm:
                        complot_names[alt] = name_part.strip()
        except Exception:
            pass

    # From blocks_parcels_by_plan (plan→blocks mapping, newer 425-XXXXXXX plans)
    bp_file = DATA / "blocks_parcels_by_plan.json"
    plan_blocks = {}  # plan_number → [block ids]
    if bp_file.exists():
        with open(bp_file, "r", encoding="utf-8") as f:
            bdata = json.load(f)
        for block_id, block_plans in bdata.items():
            for bp in block_plans:
                pn = bp.get("plan", "")
                if pn not in plan_blocks:
                    plan_blocks[pn] = []
                plan_blocks[pn].append({
                    "block": block_id,
                    "parcels": bp.get("parcels_whole", ""),
                    "parcels_partial": bp.get("parcels_partial", ""),
                })

    for plan in plans:
        plan["blocks"] = plan_blocks.get(plan["number"], [])

    # From all_plans_by_block (older plans like גז/525/12)
    apb_file = DATA / "all_plans_by_block.json"
    if apb_file.exists():
        try:
            with open(apb_file, "r", encoding="utf-8") as f:
                apb = json.load(f)
            bpm = apb.get("block_plan_map", apb) if isinstance(apb, dict) else {}
            # Build plan → [blocks] for all old plans
            old_plan_blocks = {}  # plan_number → [block_id]
            for block_id, plan_list in bpm.items():
                if not isinstance(plan_list, list):
                    continue
                for pn in plan_list:
                    if not isinstance(pn, str) or not pn.strip():
                        continue
                    if pn not in old_plan_blocks:
                        old_plan_blocks[pn] = []
                    old_plan_blocks[pn].append(block_id)
            # Add plans not already in taba index
            taba_norms = {_norm_plan_num(n) for n in taba_numbers}
            for pn, blocks in sorted(old_plan_blocks.items()):
                if _norm_plan_num(pn) in taba_norms:
                    continue  # already in index from taba
                # Look up name from complot
                norm_key = _norm_plan_num(pn)
                alt_key = _alt_plan_num(pn)
                name = complot_names.get(norm_key) or complot_names.get(alt_key) or ""
                block_entries = [{"block": b, "parcels": "", "parcels_partial": ""}
                                  for b in sorted(set(blocks))]
                plans.append({
                    "number": pn,
                    "name": name,
                    "status": "",
                    "entity": "",
                    "area_dunam": None,
                    "landuse": "",
                    "lat": None,
                    "lng": None,
                    "mp_id": None,
                    "source": "block_map",
                    "blocks": block_entries,
                })
        except Exception as e:
            print(f"  Warning: Could not parse all_plans_by_block for plan index: {e}")

    # Enrich plans with KML/SHP boundary data (lat/lng centroid + hasGeo flag)
    enriched = 0
    for plan in plans:
        pn = plan.get("number", "")
        boundary = _plan_boundaries.get(pn) or _plan_boundaries.get(_norm_plan_num(pn))
        if boundary:
            bp = boundary.get("properties", {})
            # If plan has no geo from taba, fill in from boundary centroid
            if plan.get("lat") is None and bp.get("lat") is not None:
                plan["lat"] = bp["lat"]
                plan["lng"] = bp["lng"]
                enriched += 1
            plan["hasGeoBoundary"] = True
        else:
            plan["hasGeoBoundary"] = False
    if enriched:
        print(f"  Enriched {enriched} plans with KML/SHP boundary centroids")

    return plans


def build_summary():
    """Pre-compute summary data from all JSON files."""
    result = {
        "blocks": [],
        "plans": [],
        "stats": {},
        "complot": {},
        "layer_categories": {},
    }

    # ── 1. Blocks with plan counts ──
    # Start from blocks_parcels_by_plan (newer 425-XXXXXXX plans)
    bp_file = DATA / "blocks_parcels_by_plan.json"
    blocks_by_id = {}  # block_id_str → {"id", "plans": [...]}
    if bp_file.exists():
        with open(bp_file, "r", encoding="utf-8") as f:
            blocks_map = json.load(f)
        for bid, plans in blocks_map.items():
            key = str(bid)
            blocks_by_id[key] = {
                "id": int(bid) if str(bid).isdigit() else bid,
                "plans": list(plans),
            }

    # Merge older plans from all_plans_by_block (גז/525/12 etc.)
    apb_file = DATA / "all_plans_by_block.json"
    if apb_file.exists():
        try:
            with open(apb_file, "r", encoding="utf-8") as f:
                apb = json.load(f)
            bpm = apb.get("block_plan_map", apb) if isinstance(apb, dict) else {}
            for bid, plan_list in bpm.items():
                if not isinstance(plan_list, list):
                    continue
                key = str(bid)
                if key not in blocks_by_id:
                    blocks_by_id[key] = {
                        "id": int(bid) if str(bid).isdigit() else bid,
                        "plans": [],
                    }
                existing_plans = {str(p.get("plan", "")) for p in blocks_by_id[key]["plans"]}
                for pn in plan_list:
                    if isinstance(pn, str) and pn.strip() and pn not in existing_plans:
                        blocks_by_id[key]["plans"].append({"plan": pn})
                        existing_plans.add(pn)
        except Exception as e:
            print(f"  Warning: Could not merge all_plans_by_block into summary: {e}")

    # Sort blocks and build final list
    def _block_sort_key(item):
        bid = item[0]
        try:
            return (0, int(bid))
        except (ValueError, TypeError):
            return (1, str(bid))

    for bid, bdata in sorted(blocks_by_id.items(), key=_block_sort_key):
        result["blocks"].append(
            {
                "id": bdata["id"],
                "plans_count": len(bdata["plans"]),
                "plans": bdata["plans"],
            }
        )

    # ── 2. Parcel counts per block from cadastre ──
    parcels_per_block = {}
    parcels_file = DATA / "cadastre" / "parcels_kfar_chabad.geojson"
    if parcels_file.exists():
        try:
            with open(parcels_file, "r", encoding="utf-8") as f:
                pdata = json.load(f)
            for feat in pdata.get("features", []):
                gush = feat.get("properties", {}).get("GUSH_NUM")
                if gush is not None:
                    gush_str = str(int(gush))
                    parcels_per_block[gush_str] = (
                        parcels_per_block.get(gush_str, 0) + 1
                    )
        except Exception as e:
            print(f"  Warning: Could not parse parcels file: {e}")
    for block in result["blocks"]:
        block["parcels_count"] = parcels_per_block.get(str(block["id"]), 0)

    # ── 3. Plans from docs/ directory ──
    docs_dir = DATA / "docs"
    if docs_dir.exists():
        for pd_dir in sorted(docs_dir.iterdir()):
            if not pd_dir.is_dir() or pd_dir.name.startswith("_"):
                continue
            files = [
                f
                for f in pd_dir.iterdir()
                if f.is_file() and not f.name.startswith("_")
            ]
            plan = {"name": pd_dir.name, "docs_count": len(files)}

            meta_file = pd_dir / "_plan_data.json"
            if meta_file.exists():
                try:
                    with open(meta_file, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                    det = meta.get("planDetails", {})
                    plan["number"] = det.get("NUMB", pd_dir.name)
                    plan["status"] = det.get("STATUS", "")
                    plan["entity_name"] = det.get("ENTITY_NAME", "")
                    plan["station_desc"] = det.get("STATION_DESC", "")
                    plan["mp_id"] = det.get("MP_ID", "")
                except Exception:
                    pass
            result["plans"].append(plan)

    # ── 4. GIS layers by category ──
    layers_dir = DATA / "gis_layers"
    if layers_dir.exists():
        layers = []
        for f in sorted(layers_dir.iterdir()):
            if f.suffix != ".geojson":
                continue
            name = f.stem
            cat = "אחר"
            if name.startswith("xplan"):
                cat = "Xplan - תכניות באזור"
            elif name.startswith("tmm321"):
                cat = 'תמ"מ 3/21'
            elif name.startswith("tmm_merkaz"):
                cat = 'מכלול תמ"מ מרכז'
            elif name.startswith("tama1"):
                cat = 'תמ"א 1 - תשתיות'
            elif name.startswith("tama35"):
                cat = 'תמ"א 35'
            elif name.startswith("road") or name.startswith("train"):
                cat = "תחבורה"
            elif name.startswith("gas"):
                cat = "גז ודלק"
            elif name.startswith("shimour"):
                cat = "שימור"
            elif name.startswith("gvulot"):
                cat = "גבולות"
            elif name.startswith("ttl") or name.startswith("vatmal"):
                cat = 'תת"ל / ותמ"ל'
            elif name.startswith("arcgis"):
                cat = "שירותי ArcGIS"
            layers.append(
                {
                    "name": name,
                    "file": f.name,
                    "size_kb": round(f.stat().st_size / 1024, 1),
                    "category": cat,
                }
            )
        result["stats"]["total_layers"] = len(layers)

        cats = {}
        for layer in layers:
            c = layer["category"]
            if c not in cats:
                cats[c] = []
            cats[c].append(layer)
        result["layer_categories"] = cats

    # ── 4b. GIS-NET municipal layers ──
    gisnet_dir = DATA / "gisnet_layers"
    if gisnet_dir.exists():
        GISNET_CATS = {
            "P0": "כללי",
            "P7": "גושים וחלקות",
            "P10": "רישוי",
            "P13": "תכנון",
            "P26": "שימור",
            "P29": "תשתיות מוניציפליות",
            "P47": "טופוגרפיה",
            "P54": "ביטחון",
            "P56": "תקשורת",
            "P196": "בינוי",
        }
        gisnet_layers = []
        for f in sorted(gisnet_dir.iterdir()):
            if f.suffix != ".geojson":
                continue
            name = f.stem
            # Parse parent from filename: L{id}_P{parent}_{name}
            parts = name.split("_", 2)
            parent_key = parts[1] if len(parts) >= 2 else "P0"
            cat = GISNET_CATS.get(parent_key, "אחר")
            display_name = parts[2].replace("_", " ") if len(parts) >= 3 else name
            gisnet_layers.append(
                {
                    "name": display_name,
                    "file": f.name,
                    "size_kb": round(f.stat().st_size / 1024, 1),
                    "category": cat,
                }
            )
        gisnet_cats = {}
        for layer in gisnet_layers:
            c = layer["category"]
            if c not in gisnet_cats:
                gisnet_cats[c] = []
            gisnet_cats[c].append(layer)
        result["gisnet_layer_categories"] = gisnet_cats

    # ── 4b. Wayback aerial imagery releases ──
    wb_file = DATA / "wayback_releases.json"
    if wb_file.exists():
        with open(wb_file, "r", encoding="utf-8") as f:
            result["wayback_releases"] = json.load(f)

    # ── 5. Complot ──
    cp_file = DATA / "complot_kfar_chabad" / "complot_parsed.json"
    if cp_file.exists():
        with open(cp_file, "r", encoding="utf-8") as f:
            cp = json.load(f)
        result["complot"] = {k: len(v) for k, v in cp.items() if isinstance(v, list)}

    # ── 6. Stats ──
    docs_idx = DATA / "all_documents_index.json"
    if docs_idx.exists():
        with open(docs_idx, "r", encoding="utf-8") as f:
            docs = json.load(f)
        if isinstance(docs, dict):
            result["stats"]["total_documents"] = docs.get(
                "total_documents_in_metadata", 0
            )
            result["stats"]["source_statistics"] = docs.get("source_statistics", {})
            result["stats"]["file_type_distribution"] = docs.get(
                "file_type_distribution", {}
            )
        elif isinstance(docs, list):
            result["stats"]["total_documents"] = len(docs)

    result["stats"]["total_plans"] = len(result["plans"])
    result["stats"]["total_blocks"] = len(result["blocks"])
    result["stats"]["total_parcels"] = sum(parcels_per_block.values())
    result["stats"]["total_cadastre_blocks"] = len(parcels_per_block)
    result["stats"]["complot_plans"] = result["complot"].get("GetTabaNumbers", 0)

    return result


def build_analysis():
    """Build comprehensive analysis data for the analysis dashboard."""
    analysis = {}

    # ── 1. Migrash (Parcel/Lot) Analysis ──
    migrash_file = DATA / "migrash_helka_mapping.json"
    migrash_analysis = {
        "total_mapped": 0,
        "total_area_sqm": 0,
        "avg_area_sqm": 0,
        "min_area": None,
        "max_area": None,
        "median_area_sqm": 0,
        "yeud_distribution": {},
        "plan_distribution": {},
        "size_histogram": [],
        "parcels_table": [],
        "top_largest": [],
        "top_smallest": [],
    }
    if migrash_file.exists():
        with open(migrash_file, "r", encoding="utf-8") as f:
            mdata = json.load(f)
        mapping = mdata.get("mapping", [])
        meta = mdata.get("metadata", {})
        migrash_analysis["total_in_cadastre"] = meta.get("total_parcels_in_cadastre", 0)
        migrash_analysis["parcels_with_migrash"] = meta.get("parcels_with_migrash", 0)
        migrash_analysis["parcels_not_found"] = meta.get("parcels_not_found", 0)
        migrash_analysis["primary_plan"] = meta.get("primary_plan", "")

        areas = []
        for m in mapping:
            a = m.get("shetach_sqm", 0) or 0
            areas.append(a)
            yeud = m.get("yeud", "לא ידוע")
            migrash_analysis["yeud_distribution"][yeud] = migrash_analysis["yeud_distribution"].get(yeud, 0) + 1
            plan = m.get("plan", "")
            if plan:
                if plan not in migrash_analysis["plan_distribution"]:
                    migrash_analysis["plan_distribution"][plan] = {"count": 0, "total_area": 0}
                migrash_analysis["plan_distribution"][plan]["count"] += 1
                migrash_analysis["plan_distribution"][plan]["total_area"] += a

            migrash_analysis["parcels_table"].append({
                "gush": m.get("gush", ""),
                "helka": m.get("helka", ""),
                "migrash": m.get("migrash", ""),
                "yeud": yeud,
                "area_sqm": a,
                "area_dunam": round(a / 1000, 3) if a else 0,
                "plan": plan,
            })

        if areas:
            areas_sorted = sorted(areas)
            migrash_analysis["total_mapped"] = len(mapping)
            migrash_analysis["total_area_sqm"] = sum(areas)
            migrash_analysis["total_area_dunam"] = round(sum(areas) / 1000, 2)
            migrash_analysis["avg_area_sqm"] = round(sum(areas) / len(areas), 1)
            migrash_analysis["median_area_sqm"] = areas_sorted[len(areas_sorted) // 2]
            migrash_analysis["min_area"] = {"value": areas_sorted[0]}
            migrash_analysis["max_area"] = {"value": areas_sorted[-1]}

            # Find min/max details
            for m in mapping:
                a = m.get("shetach_sqm", 0) or 0
                if a == areas_sorted[0] and "migrash" not in migrash_analysis["min_area"]:
                    migrash_analysis["min_area"].update({"migrash": m.get("migrash", ""), "helka": m.get("helka", "")})
                if a == areas_sorted[-1] and "migrash" not in migrash_analysis["max_area"]:
                    migrash_analysis["max_area"].update({"migrash": m.get("migrash", ""), "helka": m.get("helka", "")})

            # Top 10 largest and smallest
            sorted_parcels = sorted(migrash_analysis["parcels_table"], key=lambda x: -x["area_sqm"])
            migrash_analysis["top_largest"] = sorted_parcels[:10]
            migrash_analysis["top_smallest"] = sorted_parcels[-10:][::-1] if len(sorted_parcels) >= 10 else sorted_parcels[::-1]

            # Size histogram buckets
            buckets = [(0, 300, "0-300"), (300, 500, "300-500"), (500, 700, "500-700"), (700, 1000, "700-1000"), (1000, float("inf"), "1000+")]
            for low, high, label in buckets:
                count = sum(1 for a in areas if low <= a < high)
                migrash_analysis["size_histogram"].append({"range": label, "count": count})

    analysis["migrash"] = migrash_analysis

    # ── 2. Building Rights Analysis ──
    br_file = DATA / "building_rights_summary.json"
    br_analysis = {
        "total_plans": 0,
        "status_distribution": {},
        "total_area_dunam": 0,
        "total_housing_units": 0,
        "total_housing_sqm": 0,
        "quantity_types": {},
        "plans_table": [],
        "top_by_area": [],
        "top_by_units": [],
    }
    if br_file.exists():
        with open(br_file, "r", encoding="utf-8") as f:
            br_data = json.load(f)
        br_analysis["total_plans"] = len(br_data)
        for pn, plan in br_data.items():
            status = plan.get("status", "לא ידוע")
            br_analysis["status_distribution"][status] = br_analysis["status_distribution"].get(status, 0) + 1
            area = plan.get("area_dunam", 0) or 0
            br_analysis["total_area_dunam"] += area

            housing_units = 0
            housing_sqm = 0
            qty_list = []
            for q in plan.get("quantities", []):
                desc = q.get("QUANTITY_DESC", "")
                unit = q.get("UNIT_DESC", "")
                auth = q.get("AUTHORISED_QUANTITY", "0")
                auth_add = q.get("AUTHORISED_QUANTITY_ADD", "")
                impl = q.get("IMPLEMENTATION", "0")

                br_analysis["quantity_types"][desc] = br_analysis["quantity_types"].get(desc, 0) + 1

                try:
                    impl_val = int(str(impl).replace("+", "").replace(",", "").strip()) if impl else 0
                except (ValueError, TypeError):
                    impl_val = 0

                if "יח\"ד" in desc or "יח\"ד" in unit:
                    housing_units += impl_val
                if "מ\"ר" in desc and "מגורים" in desc:
                    housing_sqm += impl_val

                qty_list.append({"desc": desc, "unit": unit, "auth": auth, "auth_add": auth_add, "implementation": impl})

            br_analysis["total_housing_units"] += housing_units
            br_analysis["total_housing_sqm"] += housing_sqm

            plan_entry = {
                "plan_number": pn,
                "plan_name": plan.get("plan_name", ""),
                "status": status,
                "area_dunam": round(area, 2),
                "housing_units": housing_units,
                "housing_sqm": housing_sqm,
                "quantities": qty_list,
            }
            br_analysis["plans_table"].append(plan_entry)

        # Top plans by area and units
        br_analysis["top_by_area"] = sorted(br_analysis["plans_table"], key=lambda x: -x["area_dunam"])[:10]
        br_analysis["top_by_units"] = sorted(br_analysis["plans_table"], key=lambda x: -x["housing_units"])[:10]
        br_analysis["total_area_dunam"] = round(br_analysis["total_area_dunam"], 2)

    analysis["building_rights"] = br_analysis

    # ── 3. Blocks Analysis ──
    bp_file = DATA / "blocks_parcels_by_plan.json"
    blocks_analysis = {
        "total_blocks": 0,
        "total_plan_links": 0,
        "blocks_with_most_plans": [],
        "block_type_distribution": {},
        "blocks_table": [],
    }
    if bp_file.exists():
        with open(bp_file, "r", encoding="utf-8") as f:
            blocks_map = json.load(f)
        blocks_analysis["total_blocks"] = len(blocks_map)
        for bid, plans in blocks_map.items():
            blocks_analysis["total_plan_links"] += len(plans)
            bt_counts = {}
            partiality_counts = {}
            for p in plans:
                bt = p.get("block_type", "לא ידוע") or "לא ידוע"
                blocks_analysis["block_type_distribution"][bt] = blocks_analysis["block_type_distribution"].get(bt, 0) + 1
                bt_counts[bt] = bt_counts.get(bt, 0) + 1
                part = p.get("partiality", "") or ""
                partiality_counts[part] = partiality_counts.get(part, 0) + 1
            blocks_analysis["blocks_table"].append({
                "block_id": bid,
                "plans_count": len(plans),
                "block_types": bt_counts,
                "partiality": partiality_counts,
            })
        blocks_analysis["blocks_with_most_plans"] = sorted(
            blocks_analysis["blocks_table"], key=lambda x: -x["plans_count"]
        )[:15]

    analysis["blocks"] = blocks_analysis

    # ── 4. Documents Analysis ──
    docs_file = DATA / "all_documents_index.json"
    docs_analysis = {
        "total_documents": 0,
        "total_plans": 0,
        "file_type_distribution": {},
        "source_distribution": {},
        "committee_distribution": {},
        "plans_by_doc_count": [],
    }
    if docs_file.exists():
        with open(docs_file, "r", encoding="utf-8") as f:
            docs_data = json.load(f)
        if isinstance(docs_data, dict):
            docs_analysis["total_documents"] = docs_data.get("total_documents_in_metadata", 0)
            docs_analysis["total_plans"] = docs_data.get("total_plans", 0)
            docs_analysis["file_type_distribution"] = docs_data.get("file_type_distribution", {})
            src = docs_data.get("source_statistics", {})
            for k, v in src.items():
                docs_analysis["source_distribution"][k] = v.get("docs", 0) if isinstance(v, dict) else v
            docs_analysis["committee_distribution"] = docs_data.get("committee_distribution", {})

            plan_stats = docs_data.get("plan_statistics", {})
            for pn, ps in plan_stats.items():
                docs_analysis["plans_by_doc_count"].append({
                    "plan_number": pn,
                    "plan_name": ps.get("plan_name_he", ""),
                    "status": ps.get("status", ""),
                    "metadata_docs": ps.get("metadata_docs", 0),
                    "files_on_disk": ps.get("files_on_disk", 0),
                })
            docs_analysis["plans_by_doc_count"].sort(key=lambda x: -x["metadata_docs"])

    analysis["documents"] = docs_analysis

    # ── 5. Cross-reference: Block ↔ Plan Matrix ──
    crossref = {"blocks": [], "plans": [], "matrix": []}
    apb_file = DATA / "all_plans_by_block.json"
    if apb_file.exists():
        with open(apb_file, "r", encoding="utf-8") as f:
            apb = json.load(f)
        bpm = apb.get("block_plan_map", {})
        all_plans_set = set()
        for bid, plist in bpm.items():
            for p in plist:
                all_plans_set.add(p)
        crossref["blocks"] = sorted(bpm.keys(), key=lambda x: int(x) if x.isdigit() else 0)
        crossref["plans"] = sorted(all_plans_set)
        for bid in crossref["blocks"]:
            row = []
            block_plans = set(bpm.get(bid, []))
            for p in crossref["plans"]:
                row.append(1 if p in block_plans else 0)
            crossref["matrix"].append(row)
    analysis["crossref"] = crossref

    # ── 6. Plan Instructions / Explanations ──
    pi_file = DATA / "plan_instructions_summary.json"
    plan_details = []
    if pi_file.exists():
        with open(pi_file, "r", encoding="utf-8") as f:
            pi_data = json.load(f)
        for pn, pinfo in pi_data.items():
            exp = pinfo.get("explanation", {})
            exp_text = exp.get("EXPLANATION", "") if isinstance(exp, dict) else ""
            if not exp_text:
                exp_text = ""
            instructions = pinfo.get("instructions", [])
            plan_details.append({
                "plan_number": pn,
                "plan_name": pinfo.get("plan_name", ""),
                "status": pinfo.get("status", ""),
                "explanation": exp_text[:300],
                "instructions_count": len(instructions),
                "instruction_types": [ins.get("LUT_DOC_NAME", "") for ins in instructions[:5]],
            })
    analysis["plan_details"] = plan_details

    # ── 7. Coverage Analysis ──
    coverage = {
        "migrash_mapped": migrash_analysis.get("parcels_with_migrash", 0),
        "migrash_not_found": migrash_analysis.get("parcels_not_found", 0),
        "migrash_total_cadastre": migrash_analysis.get("total_in_cadastre", 0),
        "migrash_unchecked": migrash_analysis.get("total_in_cadastre", 0)
            - migrash_analysis.get("parcels_with_migrash", 0)
            - migrash_analysis.get("parcels_not_found", 0),
        "docs_with_files": 0,
        "docs_without_files": 0,
        "plans_with_instructions": len(plan_details),
        "plans_approved": br_analysis["status_distribution"].get("אישור", 0),
        "plans_in_review": br_analysis["status_distribution"].get("בבדיקה תכנונית", 0),
        "plans_rejected": br_analysis["status_distribution"].get("נדחתה", 0),
    }
    # Doc file coverage
    if docs_file.exists():
        with open(docs_file, "r", encoding="utf-8") as f:
            docs_raw = json.load(f)
        if isinstance(docs_raw, dict):
            plan_stats = docs_raw.get("plan_statistics", {})
            for ps in plan_stats.values():
                coverage["docs_with_files"] += ps.get("files_on_disk", 0)
                coverage["docs_without_files"] += max(0, ps.get("metadata_docs", 0) - ps.get("files_on_disk", 0))
    analysis["coverage"] = coverage

    # ── 8. Unique migrash list for quick lookup ──
    migrash_lookup = {}
    for p in migrash_analysis.get("parcels_table", []):
        migrash_lookup[str(p.get("migrash", ""))] = p
    analysis["migrash_lookup"] = migrash_lookup

    # ── 9. Overall Summary Stats ──
    analysis["overview"] = {
        "total_blocks": blocks_analysis["total_blocks"],
        "total_plans_with_rights": br_analysis["total_plans"],
        "total_documents": docs_analysis["total_documents"],
        "total_migrashim": migrash_analysis["total_mapped"],
        "total_land_area_dunam": br_analysis["total_area_dunam"],
        "total_migrash_area_dunam": migrash_analysis.get("total_area_dunam", 0),
        "total_housing_units": br_analysis["total_housing_units"],
        "total_housing_sqm": br_analysis["total_housing_sqm"],
        "total_plans_with_instructions": len(plan_details),
    }

    return analysis


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        path = urllib.parse.unquote(self.path.split("?")[0])

        if path in ("/", "/index.html"):
            self._serve_file(WEB / "index.html", "text/html; charset=utf-8")
        elif path == "/api/summary":
            global _summary_cache
            if _summary_cache is None:
                _summary_cache = build_summary()
            self._serve_json(_summary_cache)
        elif path == "/api/analysis":
            global _analysis_cache
            if _analysis_cache is None:
                _analysis_cache = build_analysis()
            self._serve_json(_analysis_cache)
        elif path == "/api/documents":
            fp = DATA / "all_documents_index.json"
            if fp.exists():
                with open(fp, "r", encoding="utf-8") as f:
                    doc_data = json.load(f)
                docs_list = (
                    doc_data.get("documents", [])
                    if isinstance(doc_data, dict)
                    else doc_data
                )
                # Enrich each doc with its file availability
                for i, d in enumerate(docs_list):
                    d["_idx"] = i
                    d["_has_file"] = str(i) in _doc_index
                self._serve_json(docs_list)
            else:
                self._serve_json([])
        elif path.startswith("/api/documents/file/"):
            # Serve actual document file: /api/documents/file/{idx}
            idx = path.split("/")[-1]
            doc_entry = _doc_index.get(idx)
            if doc_entry:
                fp = Path(doc_entry["path"])
                if fp.exists():
                    ct = self._content_type(fp.suffix)
                    self.send_response(200)
                    self.send_header("Content-Type", ct)
                    self.send_header("Content-Length", fp.stat().st_size)
                    self.send_header("Content-Disposition",
                                     f'inline; filename="{urllib.parse.quote(fp.name)}"')
                    self.send_header("Cache-Control", "public, max-age=3600")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    with open(fp, "rb") as f:
                        while True:
                            chunk = f.read(65536)
                            if not chunk:
                                break
                            self.wfile.write(chunk)
                else:
                    self.send_error(404, "File not found on disk")
            else:
                self.send_error(404, f"Document index {idx} not found")
        elif path == "/api/documents/index":
            # Return the full doc index for the viewer
            result = []
            for key, entry in _doc_index.items():
                fp = Path(entry["path"])
                result.append({
                    "key": key,
                    "plan": entry["plan"],
                    "name": entry["name"],
                    "type": entry["type"],
                    "source": entry["source"],
                    "size": fp.stat().st_size if fp.exists() else 0,
                    "url": f"/api/documents/file/{key}",
                })
            self._serve_json(result)
        elif path.startswith("/api/documents/plan/"):
            # List documents for a specific plan: /api/documents/plan/{plan_id}
            plan_id = urllib.parse.unquote(path.split("/api/documents/plan/")[1])
            plan_id_flex = _flex_plan_num(plan_id)
            result = []
            for key, entry in _doc_index.items():
                if _flex_plan_num(entry["plan"]) == plan_id_flex:
                    fp = Path(entry["path"])
                    result.append({
                        "key": key,
                        "plan": entry["plan"],
                        "name": entry["name"],
                        "type": entry["type"],
                        "source": entry["source"],
                        "size": fp.stat().st_size if fp.exists() else 0,
                        "url": f"/api/documents/file/{key}",
                    })
            self._serve_json(result)
        elif path == "/api/search/parcel":
            global _parcel_index
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            gush = qs.get("gush", [""])[0].strip()
            helka = qs.get("helka", [""])[0].strip()
            if gush and helka:
                key = f"{gush}-{helka}"
                result = _parcel_index.get(key)
                if result:
                    self._serve_json({"found": True, **result})
                else:
                    self._serve_json({"found": False, "message": f"חלקה {helka} בגוש {gush} לא נמצאה"})
            elif gush:
                gush_key = f"g{gush}"
                helkot = _parcel_index.get(gush_key, [])
                if helkot:
                    self._serve_json({"found": True, "gush": int(gush), "helkot": sorted(set(helkot)), "count": len(set(helkot))})
                else:
                    self._serve_json({"found": False, "message": f"גוש {gush} לא נמצא"})
            else:
                self._serve_json({"found": False, "message": "יש להזין מספר גוש"})
        elif path == "/api/parcels/geojson":
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            gush = qs.get("gush", [""])[0].strip()
            if gush and gush in _parcels_by_gush:
                geojson = {
                    "type": "FeatureCollection",
                    "features": _parcels_by_gush[gush]
                }
                self._serve_json(geojson)
            else:
                self._serve_json({"type": "FeatureCollection", "features": []})
        elif path == "/api/search/plan":
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            q = qs.get("q", [""])[0].strip().lower()
            if not q:
                self._serve_json([])
            else:
                # Build all normalized forms of the query
                q_norm  = _norm_plan_num(q)          # strip spaces:  'גז/525/12'
                q_slash = _slash_sep_plan_num(q)     # spaces→slash: 'גז/525/12'
                q_flex  = _flex_plan_num(q)          # strip all sep: 'גז52512'
                results = []
                for plan in _plan_index:
                    num = (plan.get("number") or "").lower()
                    name = (plan.get("name") or "").lower()
                    landuse = (plan.get("landuse") or "").lower()
                    num_norm  = _norm_plan_num(num)
                    num_slash = _slash_sep_plan_num(num)
                    num_flex  = _flex_plan_num(num)
                    if (q in num
                        or q_norm in num_norm
                        or q_slash in num_slash
                        or (q_flex and q_flex in num_flex)
                        or q in name
                        or q_norm in _norm_plan_num(name)
                        or q in landuse
                        or any(q in b.get("block", "") for b in plan.get("blocks", []))):
                        results.append(plan)
                self._serve_json(results[:50])
        elif path == "/api/migrash":
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            gush = qs.get("gush", [""])[0].strip()
            helka = qs.get("helka", [""])[0].strip()
            if gush and helka:
                key = f"{gush}-{helka}"
                result = _migrash_index.get(key)
                if result:
                    self._serve_json({"found": True, **result})
                else:
                    self._serve_json({"found": False})
            else:
                # Return full mapping
                fp = DATA / "migrash_helka_mapping.json"
                if fp.exists():
                    with open(fp, "r", encoding="utf-8") as f:
                        self._serve_json(json.load(f))
                else:
                    self._serve_json({"mapping": []})
        elif path.startswith("/api/migrash/plan/"):
            # Return all migrashim for a specific plan number
            plan_q = urllib.parse.unquote(path.split("/api/migrash/plan/")[1])
            plan_flex = _flex_plan_num(plan_q)
            fp = DATA / "migrash_helka_mapping.json"
            result = {"plan": plan_q, "migrashim": [], "gushim": []}
            if fp.exists():
                try:
                    with open(fp, "r", encoding="utf-8") as f:
                        raw = json.load(f)
                    gushim = set()
                    for m in raw.get("mapping", []):
                        if _flex_plan_num(m.get("plan", "")) == plan_flex:
                            result["migrashim"].append(m)
                            gushim.add(str(m.get("gush", "")))
                    result["gushim"] = sorted(gushim)
                except Exception:
                    pass
            self._serve_json(result)
        elif path == "/api/complot":
            fp = DATA / "complot_kfar_chabad" / "complot_parsed.json"
            if fp.exists():
                with open(fp, "r", encoding="utf-8") as f:
                    self._serve_json(json.load(f))
            else:
                self._serve_json({})
        elif path.startswith("/api/plan-boundary/"):
            # Serve plan boundary GeoJSON from extracted KML/SHP data
            plan_num = urllib.parse.unquote(path.split("/api/plan-boundary/", 1)[1])
            boundary = _plan_boundaries.get(plan_num) or _plan_boundaries.get(_norm_plan_num(plan_num))
            if boundary and boundary.get("geometry"):
                self._serve_json(boundary)
            else:
                self.send_error(404, "No boundary found for this plan")
        elif path == "/api/plan-boundaries":
            # Return all plan boundaries as a FeatureCollection
            fp = DATA / "plan_boundaries.geojson"
            if fp.exists():
                with open(fp, "r", encoding="utf-8") as f:
                    self._serve_json(json.load(f))
            else:
                self._serve_json({"type": "FeatureCollection", "features": []})
        elif path == "/api/mmg":
            # Return MMG index (which plans have MMG layers)
            fp = DATA / "mmg" / "mmg_index.json"
            if fp.exists():
                with open(fp, "r", encoding="utf-8") as f:
                    self._serve_json(json.load(f))
            else:
                self._serve_json({})
        elif path.startswith("/api/mmg/"):
            # Serve specific MMG layer: /api/mmg/{plan_number}/{layer_name}.geojson
            parts = path.split("/api/mmg/")[1]
            fp = (DATA / "mmg" / parts).resolve()
            if fp.exists() and fp.is_file() and str(fp).startswith(str((DATA / "mmg").resolve())):
                with open(fp, "r", encoding="utf-8") as f:
                    data = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(data.encode("utf-8"))))
                self.end_headers()
                self.wfile.write(data.encode("utf-8"))
            else:
                self.send_error(404, "MMG layer not found")
        elif path == "/api/uploads/list":
            uploads_dir = DATA / "uploads"
            files = []
            if uploads_dir.exists():
                for f in sorted(uploads_dir.iterdir()):
                    if f.suffix == '.geojson':
                        files.append({"name": f.stem, "path": f"data/uploads/{f.name}", "size": f.stat().st_size})
            self._serve_json(files)
        elif path.startswith("/api/plan-detail/"):
            # Aggregated plan detail — merges taba, building rights, instructions,
            # documents, mavat metadata, MMG index, plan boundary
            plan_number = urllib.parse.unquote(path.split("/api/plan-detail/")[1])
            plan_flex = _flex_plan_num(plan_number)
            result = {"plan_number": plan_number, "found": False}

            # 1) Basic info from _plan_index
            for p in _plan_index:
                if _flex_plan_num(p.get("number", "")) == plan_flex:
                    result.update({
                        "found": True,
                        "name": p.get("name", ""),
                        "status": p.get("status", ""),
                        "entity": p.get("entity", ""),
                        "area_dunam": p.get("area_dunam"),
                        "landuse": p.get("landuse", ""),
                        "lat": p.get("lat"),
                        "lng": p.get("lng"),
                        "mp_id": p.get("mp_id"),
                        "source": p.get("source", ""),
                        "blocks": p.get("blocks", []),
                    })
                    break

            # 2) Taba GeoJSON properties (dates, objectives, etc.)
            taba_file = DATA / "taba_kfar_chabad.geojson"
            if taba_file.exists():
                try:
                    with open(taba_file, "r", encoding="utf-8") as f:
                        taba = json.load(f)
                    for feat in taba.get("features", []):
                        props = feat.get("properties", {})
                        num = props.get("pl_number") or props.get("PL_NUMBER", "")
                        if _flex_plan_num(str(num)) == plan_flex:
                            result["found"] = True
                            result["taba"] = {
                                "pl_name": props.get("pl_name", ""),
                                "pl_url": props.get("pl_url", ""),
                                "pl_objectives": props.get("pl_objectives", ""),
                                "pl_landuse_string": props.get("pl_landuse_string", ""),
                                "entity_subtype_desc": props.get("entity_subtype_desc", ""),
                                "district_name": props.get("district_name", ""),
                                "plan_county_name": props.get("plan_county_name", ""),
                                "plan_charactor_name": props.get("plan_charactor_name", ""),
                                "receiving_date": props.get("receiving_date"),
                                "date_saf": props.get("date_saf"),
                                "depositing_date": props.get("depositing_date"),
                                "pl_date_8": props.get("pl_date_8"),
                                "pl_date_advertise": props.get("pl_date_advertise"),
                                "pl_rejection_date": props.get("pl_rejection_date"),
                                "last_update_date": props.get("last_update_date"),
                                "shape_area": props.get("shape_area"),
                                "pq_authorised_quantity_120": props.get("pq_authorised_quantity_120"),
                                "pq_authorised_quantity_110": props.get("pq_authorised_quantity_110"),
                                "pq_authorised_quantity_105": props.get("pq_authorised_quantity_105"),
                                "quantity_delta_120": props.get("quantity_delta_120"),
                                "quantity_delta_110": props.get("quantity_delta_110"),
                            }
                            break
                except Exception:
                    pass

            # 3) Building rights
            br_file = DATA / "building_rights_summary.json"
            if br_file.exists():
                try:
                    with open(br_file, "r", encoding="utf-8") as f:
                        br = json.load(f)
                    for pn, pdata in br.items():
                        if _flex_plan_num(pn) == plan_flex:
                            result["building_rights"] = pdata
                            break
                except Exception:
                    pass

            # 4) Plan instructions
            pi_file = DATA / "plan_instructions_summary.json"
            if pi_file.exists():
                try:
                    with open(pi_file, "r", encoding="utf-8") as f:
                        pi = json.load(f)
                    for pn, pdata in pi.items():
                        if _flex_plan_num(pn) == plan_flex:
                            result["instructions"] = pdata
                            break
                except Exception:
                    pass

            # 5) Documents
            docs = []
            for key, entry in _doc_index.items():
                if _flex_plan_num(entry["plan"]) == plan_flex:
                    fp = Path(entry["path"])
                    docs.append({
                        "key": key,
                        "name": entry["name"],
                        "type": entry["type"],
                        "source": entry["source"],
                        "size": fp.stat().st_size if fp.exists() else 0,
                        "url": f"/api/documents/file/{key}",
                    })
            result["documents"] = docs

            # 6) MAVAT metadata
            mavat_file = DATA / "mavat_extracted_metadata.json"
            if mavat_file.exists():
                try:
                    with open(mavat_file, "r", encoding="utf-8") as f:
                        mavat = json.load(f)
                    plans_m = mavat.get("plans", {})
                    for pn, mdata in plans_m.items():
                        if _flex_plan_num(pn) == plan_flex:
                            result["mavat"] = {
                                "planDetails": mdata.get("planDetails"),
                                "rsBlocks": mdata.get("rsBlocks", []),
                                "rsRelation": mdata.get("rsRelation", []),
                                "rsOppositions": mdata.get("rsOppositions", []),
                                "rsOpenOpp": mdata.get("rsOpenOpp"),
                            }
                            break
                except Exception:
                    pass

            # 7) MMG layers
            mmg_idx_file = DATA / "mmg" / "mmg_index.json"
            if mmg_idx_file.exists():
                try:
                    with open(mmg_idx_file, "r", encoding="utf-8") as f:
                        mmg_idx = json.load(f)
                    for pn, layers in mmg_idx.items():
                        if _flex_plan_num(pn) == plan_flex:
                            result["mmg_layers"] = layers
                            break
                except Exception:
                    pass

            # 8) Plan boundary
            if plan_number in _plan_boundaries:
                result["has_boundary"] = True
            else:
                result["has_boundary"] = False

            self._serve_json(result)
        elif path.startswith("/api/parcel-detail"):
            # Aggregated parcel detail
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            gush = qs.get("gush", [""])[0].strip()
            helka = qs.get("helka", [""])[0].strip()
            result = {"found": False, "gush": gush, "helka": helka}
            if gush and helka:
                key = f"{gush}-{helka}"
                # Basic parcel info
                parcel = _parcel_index.get(key)
                if parcel:
                    result.update({"found": True, **parcel})
                # Migrash info
                mg = _migrash_index.get(key)
                if mg:
                    result["migrash"] = mg
                # Associated plans
                assoc_plans = []
                for p in _plan_index:
                    for b in p.get("blocks", []):
                        if str(b.get("block", "")) == str(gush):
                            pw = b.get("parcels_whole", "")
                            pp = b.get("parcels_partial", "")
                            all_parcels_str = f"{pw},{pp}"
                            if str(helka) in [x.strip() for x in all_parcels_str.split(",") if x.strip()]:
                                assoc_plans.append({
                                    "number": p.get("number", ""),
                                    "name": p.get("name", ""),
                                    "status": p.get("status", ""),
                                    "landuse": p.get("landuse", ""),
                                    "area_dunam": p.get("area_dunam"),
                                    "partial": str(helka) in [x.strip() for x in str(pp).split(",") if x.strip()],
                                })
                result["associated_plans"] = assoc_plans
                # Neighbour parcels count
                gush_key = f"g{gush}"
                helkot = _parcel_index.get(gush_key, [])
                result["total_parcels_in_gush"] = len(set(helkot)) if isinstance(helkot, list) else 0
            self._serve_json(result)
        elif path == "/api/tabanow" or path.startswith("/api/tabanow/"):
            self._handle_tabanow(path)
        elif path.startswith("/data/"):
            rel = path[6:]
            fp = (DATA / rel).resolve()
            if fp.exists() and fp.is_file() and str(fp).startswith(str(DATA.resolve())):
                ct = self._content_type(fp.suffix)
                self._serve_file(fp, ct)
            else:
                self.send_error(404)
        elif path.startswith("/web/"):
            rel = path[5:]
            fp = (WEB / rel).resolve()
            if fp.exists() and fp.is_file() and str(fp).startswith(str(WEB.resolve())):
                ct = self._content_type(fp.suffix)
                self._serve_file(fp, ct)
            else:
                self.send_error(404)
        else:
            self.send_error(404)

    def _serve_file(self, path, content_type):
        try:
            p = Path(path)
            st = p.stat()
            cache_key = str(p)
            cached = _static_file_cache.get(cache_key)
            if cached and cached[0] == st.st_mtime_ns:
                data = cached[1]
            else:
                data = p.read_bytes()
                # Keep memory bounded: cache only files up to 20MB and keep up to 128 entries
                if len(data) <= 20 * 1024 * 1024:
                    if len(_static_file_cache) > 128:
                        _static_file_cache.clear()
                    _static_file_cache[cache_key] = (st.st_mtime_ns, data)

            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", len(data))
            self.send_header("Cache-Control", "public, max-age=300")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(500, str(e))

    def _load_tabanow(self):
        global _tabanow_data
        if _tabanow_data is None:
            fp = DATA / "tabanow_all_plans.json"
            if fp.exists():
                with open(fp, "r", encoding="utf-8") as f:
                    _tabanow_data = json.load(f)
            else:
                _tabanow_data = {"plans": {}, "stats": {}}
        return _tabanow_data

    def _handle_tabanow(self, path):
        data = self._load_tabanow()
        if path == "/api/tabanow":
            # Return summary: stats + plan list (without heavy migrashim data)
            plan_list = []
            for name, p in sorted(data.get("plans", {}).items()):
                plan_list.append({
                    "plan_name": name,
                    "title": p.get("title", ""),
                    "general": p.get("general", {}),
                    "purpose": p.get("purpose"),
                    "migrashim_count": len(p.get("migrashim", [])),
                    "areas_count": len(p.get("areas", [])),
                    "gush_helka_count": len(p.get("gush_helka", [])),
                    "has_approval_timeline": bool(p.get("approval_timeline")),
                    "has_related_plans": bool(p.get("related_plans")),
                })
            self._serve_json({
                "stats": data.get("stats", {}),
                "scraped_at": data.get("scraped_at", ""),
                "plans": plan_list,
            })
        elif path.startswith("/api/tabanow/plan/"):
            plan_name = urllib.parse.unquote(path[len("/api/tabanow/plan/"):])
            plan_data = data.get("plans", {}).get(plan_name)
            if plan_data:
                self._serve_json(plan_data)
            else:
                self.send_error(404, f"Plan {plan_name} not found")
        else:
            self.send_error(404)

    def _serve_json(self, obj):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(data))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def _content_type(self, suffix):
        return {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".geojson": "application/json; charset=utf-8",
            ".csv": "text/csv; charset=utf-8",
            ".xml": "application/xml; charset=utf-8",
            ".kml": "application/vnd.google-earth.kml+xml",
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls": "application/vnd.ms-excel",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".zip": "application/zip",
            ".dwg": "application/acad",
            ".dxf": "application/dxf",
            ".msg": "application/vnd.ms-outlook",
        }.get(suffix.lower(), "application/octet-stream")

    def log_message(self, format, *args):
        pass  # Quiet logging

    def do_POST(self):
        path = urllib.parse.unquote(self.path.split("?")[0])
        if path == "/api/dxf/upload":
            self._handle_dxf_upload()
        elif path == "/api/dwg/upload":
            self._handle_dwg_upload()
        elif path == "/api/shp/upload":
            self._handle_shp_upload()
        elif path == "/api/uploads/delete":
            self._handle_upload_delete()
        elif path == "/api/uploads/rename":
            self._handle_upload_rename()
        elif path == "/api/layer/export":
            self._handle_layer_export()
        else:
            self.send_error(404)

    def _handle_layer_export(self):
        """Export a layer to PDF, DXF, DWG, or DWF."""
        try:
            from export_layer_utils import export_layer, EXPORT_FORMATS
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self._serve_json({"error": "No data received"}); return
            body = self.rfile.read(content_length)
            data = json.loads(body)
            layer_geojson = data.get("geojson")
            fmt = data.get("format", "pdf").lower()
            export_name = str(data.get("name") or "layer_export").strip() or "layer_export"
            export_name = _sanitize_filename(export_name)
            if fmt not in EXPORT_FORMATS:
                self._serve_json({"error": f"Format {fmt} not supported"}); return
            import tempfile
            out_ext = "." + fmt
            with tempfile.NamedTemporaryFile(suffix=out_ext, delete=False) as tmp:
                out_path = tmp.name
            export_layer(layer_geojson, out_path, fmt, title=export_name)
            with open(out_path, "rb") as f:
                file_bytes = f.read()
            os.remove(out_path)
            self.send_response(200)
            self.send_header("Content-Type", {
                "pdf": "application/pdf",
                "dxf": "application/dxf",
                "dwg": "application/acad",
                "dwf": "model/vnd.dwf"
            }[fmt])
            self.send_header("Content-Disposition", f'attachment; filename="{export_name}{out_ext}"')
            self.send_header("Content-Length", str(len(file_bytes)))
            self.end_headers()
            self.wfile.write(file_bytes)
        except Exception as e:
            import traceback
            traceback.print_exc()
            self._serve_json({"error": str(e)})

    def _handle_upload_delete(self):
        """Delete a saved upload file."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body)
            name = data.get("name", "").strip()
            if not name:
                self._serve_json({"error": "Missing name"})
                return
            safe_name = re.sub(r'[^\w\-.]', '_', name)
            fp = (DATA / "uploads" / f"{safe_name}.geojson").resolve()
            if not str(fp).startswith(str((DATA / "uploads").resolve())):
                self._serve_json({"error": "Invalid path"})
                return
            if fp.exists():
                fp.unlink()
                print(f"  [UPLOAD] Deleted: {fp.name}")
                self._serve_json({"ok": True})
            else:
                self._serve_json({"error": "File not found"})
        except Exception as e:
            self._serve_json({"error": str(e)})

    def _handle_upload_rename(self):
        """Rename a saved upload file."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body)
            old_name = re.sub(r'[^\w\-.]', '_', data.get("old", "").strip())
            new_name = re.sub(r'[^\w\-.]', '_', data.get("new", "").strip())
            if not old_name or not new_name:
                self._serve_json({"error": "Missing names"})
                return
            uploads_dir = (DATA / "uploads").resolve()
            old_fp = (uploads_dir / f"{old_name}.geojson").resolve()
            new_fp = (uploads_dir / f"{new_name}.geojson").resolve()
            if not str(old_fp).startswith(str(uploads_dir)) or not str(new_fp).startswith(str(uploads_dir)):
                self._serve_json({"error": "Invalid path"})
                return
            if not old_fp.exists():
                self._serve_json({"error": "File not found"})
                return
            if new_fp.exists():
                self._serve_json({"error": "Name already taken"})
                return
            old_fp.rename(new_fp)
            self._serve_json({"ok": True, "new_path": f"data/uploads/{new_name}.geojson"})
        except Exception as e:
            self._serve_json({"error": str(e)})

    def _handle_shp_upload(self):
        """Parse uploaded ZIP (shapefile) and return GeoJSON."""
        print("\n  [SHP] === Upload request received ===")
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self._serve_json({"error": "No data received"})
                return
            if content_length > 100 * 1024 * 1024:  # 100MB limit
                self._serve_json({"error": "File too large (max 100MB)"})
                return

            body = self.rfile.read(content_length)
            content_type = self.headers.get("Content-Type", "")
            if "multipart/form-data" in content_type:
                boundary = content_type.split("boundary=")[1].strip()
                file_data, filename, crs_hint = self._parse_multipart(body, boundary)
            else:
                file_data = body
                filename = "uploaded.zip"
                crs_hint = "ITM"

            if not file_data:
                self._serve_json({"error": "No file data found"})
                return

            # Write to temp file
            suffix = os.path.splitext(filename)[1] or ".zip"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(file_data)
                tmp_path = tmp.name

            try:
                from convert_shp import shp_zip_to_geojson
                source_crs = 'EPSG:2039'  # Default ITM
                if crs_hint.upper() in ('WGS84', 'EPSG:4326', '4326'):
                    source_crs = 'EPSG:4326'
                elif crs_hint.upper() in ('UTM', 'EPSG:32636', '32636'):
                    source_crs = 'EPSG:32636'
                elif crs_hint.upper() in ('WEB', 'WEBMERCATOR', 'EPSG:3857', '3857'):
                    source_crs = 'EPSG:3857'

                # Also save a copy to data/uploads
                safe_name = re.sub(r'[^\w\-.]', '_', os.path.splitext(filename)[0])
                out_path = os.path.join(str(DATA), 'uploads', f'{safe_name}.geojson')

                geojson, layer_name = shp_zip_to_geojson(tmp_path, out_path, source_crs=source_crs)
                geojson['_filename'] = filename
                geojson['_layer_name'] = layer_name
                geojson['_saved_path'] = f'data/uploads/{safe_name}.geojson'
                geojson['_crs'] = 'EPSG:4326'  # Already converted
                geojson['_total_features'] = len(geojson.get('features', []))
                print(f"  [SHP] SUCCESS: {geojson['_total_features']} features from {layer_name}")
                self._serve_json(geojson)
            finally:
                os.unlink(tmp_path)

        except Exception as e:
            import traceback
            print(f"  [SHP] EXCEPTION: {type(e).__name__}: {e}")
            traceback.print_exc()
            self._serve_json({"error": f"Shapefile parse error: {str(e)}"})

    # ── ODA File Converter paths (Windows / Linux / Mac) ───────────────────
    _ODA_SEARCH_PATHS = [
        r"C:\Program Files\ODA\ODAFileConverter\ODAFileConverter.exe",
        r"C:\Program Files (x86)\ODA\ODAFileConverter\ODAFileConverter.exe",
        r"C:\ODA\ODAFileConverter\ODAFileConverter.exe",
        # Linux / Mac
        "/usr/bin/ODAFileConverter",
        "/usr/local/bin/ODAFileConverter",
        "/opt/oda/ODAFileConverter",
    ]

    def _find_oda_converter(self):
        """Return path to ODA File Converter exe, or None."""
        import shutil, glob
        # Static paths
        for p in self._ODA_SEARCH_PATHS:
            if os.path.isfile(p):
                return p
        # Dynamic: per-user AppData install (version-agnostic glob)
        local_programs = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Programs', 'ODA')
        matches = glob.glob(os.path.join(local_programs, '**', 'ODAFileConverter.exe'), recursive=True)
        if matches:
            return matches[0]
        # System-level glob (e.g. C:\Program Files\ODA\ODAFileConverter 26.x.0\)
        for base in [r'C:\Program Files\ODA', r'C:\Program Files (x86)\ODA']:
            matches = glob.glob(os.path.join(base, '**', 'ODAFileConverter.exe'), recursive=True)
            if matches:
                return matches[0]
        # PATH
        return shutil.which('ODAFileConverter')

    def _handle_dwg_upload(self):
        """Convert uploaded DWG to DXF via ODA File Converter, then parse to GeoJSON."""
        print("\n  [DWG] === Upload request received ===")
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self._serve_json({"error": "No data received"}); return
            if content_length > 100 * 1024 * 1024:  # 100MB limit for DWG
                self._serve_json({"error": "File too large (max 100MB)"}); return

            body = self.rfile.read(content_length)

            content_type = self.headers.get("Content-Type", "")
            if "multipart/form-data" in content_type:
                boundary = content_type.split("boundary=")[1].strip()
                file_data, filename, crs_hint = self._parse_multipart_dwg(body, boundary)
            else:
                file_data = body
                filename = "uploaded.dwg"
                crs_hint = ""

            if not file_data:
                self._serve_json({"error": "No file data found"}); return

            print(f"  [DWG] File: {filename} ({len(file_data)} bytes)")

            oda_exe = self._find_oda_converter()
            if not oda_exe:
                print("  [DWG] ODA File Converter not found")
                self._serve_json({
                    "error": "לא נמצא ODA File Converter במחשב.",
                    "oda_missing": True,
                    "instructions": (
                        "הורד והתקן את ODA File Converter (חינם) מ:\n"
                        "https://www.opendesign.com/guestfiles/oda_file_converter\n"
                        "לאחר ההתקנה הפעל מחדש את השרת."
                    )
                })
                return

            print(f"  [DWG] ODA found: {oda_exe}")

            # Write DWG to temp dir, convert to DXF in another temp dir
            import tempfile, subprocess, glob
            in_dir  = tempfile.mkdtemp(prefix="dwg_in_")
            out_dir = tempfile.mkdtemp(prefix="dwg_out_")

            dwg_path = os.path.join(in_dir, filename)
            with open(dwg_path, "wb") as f:
                f.write(file_data)

            try:
                # ODAFileConverter <in_dir> <out_dir> <version> <type> [recurse] [audit]
                cmd = [oda_exe, in_dir, out_dir, "ACAD2018", "DXF", "0", "1"]
                print(f"  [DWG] Running: {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, timeout=120)
                print(f"  [DWG] ODA return code: {result.returncode}")
                if result.stderr:
                    print(f"  [DWG] ODA stderr: {result.stderr.decode(errors='ignore')[:500]}")

                # Find the output DXF
                dxf_files = glob.glob(os.path.join(out_dir, "**", "*.dxf"), recursive=True)
                if not dxf_files:
                    dxf_files = glob.glob(os.path.join(out_dir, "*.dxf"))

                if not dxf_files:
                    self._serve_json({"error": "ההמרה נכשלה — ODA לא ייצר קובץ DXF. ייתכן שהקובץ פגום."})
                    return

                dxf_path = dxf_files[0]
                print(f"  [DWG] Converted DXF: {dxf_path}")

                geojson = self._dxf_to_geojson(dxf_path, crs_hint)
                geojson["_filename"] = os.path.splitext(filename)[0] + ".dwg"
                geojson["_source"] = "DWG"
                print(f"  [DWG] SUCCESS: {geojson.get('_total_features',0)} features")
                self._serve_json(geojson)

            finally:
                import shutil
                shutil.rmtree(in_dir, ignore_errors=True)
                shutil.rmtree(out_dir, ignore_errors=True)

        except Exception as e:
            import traceback
            print(f"  [DWG] EXCEPTION: {type(e).__name__}: {e}")
            traceback.print_exc()
            self._serve_json({"error": f"DWG error: {str(e)}"})

    def _parse_multipart_dwg(self, body, boundary):
        """Multipart parser for DWG uploads (same logic, different field names)."""
        boundary_bytes = boundary.encode("utf-8")
        parts = body.split(b"--" + boundary_bytes)
        file_data = None
        filename = "uploaded.dwg"
        crs_hint = ""
        for part in parts:
            if b"Content-Disposition" not in part:
                continue
            header_end = part.find(b"\r\n\r\n")
            if header_end == -1:
                continue
            header = part[:header_end].decode("utf-8", errors="ignore")
            payload = part[header_end + 4:]
            if payload.endswith(b"\r\n"):
                payload = payload[:-2]
            if 'name="file"' in header or 'name="dwg"' in header:
                file_data = payload
                fn_match = re.search(r'filename="([^"]+)"', header)
                if fn_match:
                    filename = fn_match.group(1)
            elif 'name="crs"' in header:
                crs_hint = payload.decode("utf-8", errors="ignore").strip()
        return file_data, filename, crs_hint

    def _handle_dxf_upload(self):
        """Parse uploaded DXF file and return GeoJSON."""
        print("\n  [DXF] === Upload request received ===")
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            print(f"  [DXF] Content-Length: {content_length}")
            if content_length == 0:
                print("  [DXF] ERROR: No data received")
                self._serve_json({"error": "No data received"})
                return
            if content_length > 50 * 1024 * 1024:  # 50MB limit
                print("  [DXF] ERROR: File too large")
                self._serve_json({"error": "File too large (max 50MB)"})
                return

            body = self.rfile.read(content_length)
            print(f"  [DXF] Body read: {len(body)} bytes")

            # Parse multipart form data manually
            content_type = self.headers.get("Content-Type", "")
            print(f"  [DXF] Content-Type: {content_type[:100]}")
            if "multipart/form-data" in content_type:
                boundary = content_type.split("boundary=")[1].strip()
                print(f"  [DXF] Boundary: {boundary[:50]}")
                file_data, filename, crs_hint = self._parse_multipart(body, boundary)
                print(f"  [DXF] Parsed multipart -> filename={filename}, crs={crs_hint}, data_len={len(file_data) if file_data else 0}")
            else:
                file_data = body
                filename = "uploaded.dxf"
                crs_hint = ""
                print(f"  [DXF] Raw body (not multipart), data_len={len(file_data)}")

            if not file_data:
                print("  [DXF] ERROR: No file data found after parsing")
                self._serve_json({"error": "No file data found"})
                return

            # Write to temp file and parse
            with tempfile.NamedTemporaryFile(suffix=".dxf", delete=False) as tmp:
                tmp.write(file_data)
                tmp_path = tmp.name
            print(f"  [DXF] Temp file written: {tmp_path} ({len(file_data)} bytes)")

            try:
                print("  [DXF] Importing ezdxf...")
                import ezdxf as _test_ezdxf
                print(f"  [DXF] ezdxf version: {_test_ezdxf.__version__}")
                print(f"  [DXF] Calling _dxf_to_geojson({tmp_path}, {crs_hint})...")
                geojson = self._dxf_to_geojson(tmp_path, crs_hint)
                geojson["_filename"] = filename
                print(f"  [DXF] SUCCESS: {geojson.get('_total_features',0)} features, {geojson.get('_total_entities',0)} entities")
                print(f"  [DXF] Layers: {geojson.get('_dxf_layers',[])}")
                print(f"  [DXF] Entity counts: {geojson.get('_entity_counts',{})}")
                if geojson.get('_errors'):
                    print(f"  [DXF] Parse warnings: {geojson['_errors'][:5]}")
                self._serve_json(geojson)
            finally:
                os.unlink(tmp_path)

        except Exception as e:
            import traceback
            print(f"  [DXF] EXCEPTION: {type(e).__name__}: {e}")
            traceback.print_exc()
            self._serve_json({"error": f"DXF parse error: {str(e)}"})

    def _parse_multipart(self, body, boundary):
        """Simple multipart parser to extract file data and form fields."""
        boundary_bytes = boundary.encode("utf-8")
        parts = body.split(b"--" + boundary_bytes)
        file_data = None
        filename = "uploaded.dxf"
        crs_hint = ""

        for part in parts:
            if b"Content-Disposition" not in part:
                continue
            header_end = part.find(b"\r\n\r\n")
            if header_end == -1:
                continue
            header = part[:header_end].decode("utf-8", errors="ignore")
            payload = part[header_end + 4:]
            # Remove trailing \r\n--
            if payload.endswith(b"\r\n"):
                payload = payload[:-2]

            if 'name="file"' in header or 'name="dxf"' in header:
                file_data = payload
                fn_match = re.search(r'filename="([^"]+)"', header)
                if fn_match:
                    filename = fn_match.group(1)
            elif 'name="crs"' in header:
                crs_hint = payload.decode("utf-8", errors="ignore").strip()

        return file_data, filename, crs_hint

    def _dxf_to_geojson(self, dxf_path, crs_hint=""):
        """Convert a DXF file to GeoJSON using ezdxf."""
        import ezdxf
        from ezdxf.entities import LWPolyline, Polyline, Line, Circle, Arc, Point, Spline, Hatch, Insert, MText, Text

        doc = ezdxf.readfile(dxf_path)
        msp = doc.modelspace()

        features = []
        errors = []
        entity_counts = {}

        # Determine CRS: default to ITM (EPSG:2039) for Israeli files
        is_itm = crs_hint.upper() in ("ITM", "EPSG:2039", "2039", "")

        for entity in msp:
            etype = entity.dxftype()
            entity_counts[etype] = entity_counts.get(etype, 0) + 1
            layer_name = entity.dxf.layer if hasattr(entity.dxf, 'layer') else ""
            color = entity.dxf.color if hasattr(entity.dxf, 'color') else 7

            props = {
                "layer": layer_name,
                "type": etype,
                "color": color,
            }

            try:
                geom = None

                if etype == "LINE":
                    start = entity.dxf.start
                    end = entity.dxf.end
                    geom = {
                        "type": "LineString",
                        "coordinates": [
                            [start.x, start.y],
                            [end.x, end.y]
                        ]
                    }

                elif etype == "LWPOLYLINE":
                    pts = list(entity.get_points(format="xy"))
                    if len(pts) >= 2:
                        coords = [[p[0], p[1]] for p in pts]
                        if entity.closed:
                            coords.append(coords[0])
                            geom = {"type": "Polygon", "coordinates": [coords]}
                        else:
                            geom = {"type": "LineString", "coordinates": coords}

                elif etype == "POLYLINE":
                    pts = [(v.dxf.location.x, v.dxf.location.y) for v in entity.vertices]
                    if len(pts) >= 2:
                        coords = [[p[0], p[1]] for p in pts]
                        if entity.is_closed:
                            coords.append(coords[0])
                            geom = {"type": "Polygon", "coordinates": [coords]}
                        else:
                            geom = {"type": "LineString", "coordinates": coords}

                elif etype == "CIRCLE":
                    cx, cy = entity.dxf.center.x, entity.dxf.center.y
                    r = entity.dxf.radius
                    # Approximate circle as polygon with 36 segments
                    import math
                    coords = []
                    for i in range(37):
                        angle = 2 * math.pi * i / 36
                        coords.append([cx + r * math.cos(angle), cy + r * math.sin(angle)])
                    geom = {"type": "Polygon", "coordinates": [coords]}
                    props["radius"] = r

                elif etype == "ARC":
                    cx, cy = entity.dxf.center.x, entity.dxf.center.y
                    r = entity.dxf.radius
                    import math
                    sa = math.radians(entity.dxf.start_angle)
                    ea = math.radians(entity.dxf.end_angle)
                    if ea < sa:
                        ea += 2 * math.pi
                    n = max(12, int((ea - sa) / (2 * math.pi) * 36))
                    coords = []
                    for i in range(n + 1):
                        angle = sa + (ea - sa) * i / n
                        coords.append([cx + r * math.cos(angle), cy + r * math.sin(angle)])
                    geom = {"type": "LineString", "coordinates": coords}

                elif etype == "POINT":
                    geom = {
                        "type": "Point",
                        "coordinates": [entity.dxf.location.x, entity.dxf.location.y]
                    }

                elif etype == "SPLINE":
                    pts = list(entity.flattening(0.5))
                    if len(pts) >= 2:
                        coords = [[p.x, p.y] for p in pts]
                        geom = {"type": "LineString", "coordinates": coords}

                elif etype == "ELLIPSE":
                    import math
                    cx, cy = entity.dxf.center.x, entity.dxf.center.y
                    major = entity.dxf.major_axis
                    ratio = entity.dxf.ratio
                    a = math.sqrt(major.x**2 + major.y**2)
                    b = a * ratio
                    rot = math.atan2(major.y, major.x)
                    coords = []
                    for i in range(37):
                        angle = 2 * math.pi * i / 36
                        x = a * math.cos(angle)
                        y = b * math.sin(angle)
                        rx = cx + x * math.cos(rot) - y * math.sin(rot)
                        ry = cy + x * math.sin(rot) + y * math.cos(rot)
                        coords.append([rx, ry])
                    geom = {"type": "Polygon", "coordinates": [coords]}

                elif etype == "HATCH":
                    for bp in entity.paths:
                        pts = []
                        if hasattr(bp, 'vertices'):
                            pts = [(v.x, v.y) for v in bp.vertices]  # PolylinePath
                        elif hasattr(bp, 'edges'):
                            for edge in bp.edges:
                                if hasattr(edge, 'start') and hasattr(edge, 'end'):
                                    pts.append((edge.start.x, edge.start.y))
                        if len(pts) >= 3:
                            coords = [[p[0], p[1]] for p in pts]
                            coords.append(coords[0])
                            geom = {"type": "Polygon", "coordinates": [coords]}
                            features.append({
                                "type": "Feature",
                                "properties": {**props, "sub": "hatch_boundary"},
                                "geometry": geom
                            })
                    continue  # Already added

                elif etype in ("TEXT", "MTEXT"):
                    if hasattr(entity.dxf, 'insert'):
                        loc = entity.dxf.insert
                    elif hasattr(entity.dxf, 'location'):
                        loc = entity.dxf.location
                    else:
                        continue
                    text_val = entity.dxf.text if hasattr(entity.dxf, 'text') else ""
                    if hasattr(entity, 'plain_text'):
                        try:
                            text_val = entity.plain_text()
                        except:
                            pass
                    geom = {"type": "Point", "coordinates": [loc.x, loc.y]}
                    props["text"] = text_val

                if geom:
                    features.append({
                        "type": "Feature",
                        "properties": props,
                        "geometry": geom
                    })

            except Exception as e:
                errors.append(f"{etype} on layer {layer_name}: {str(e)}")

        # Collect DXF layer names
        dxf_layers = [ly.dxf.name for ly in doc.layers]

        return {
            "type": "FeatureCollection",
            "features": features,
            "_crs": "EPSG:2039" if is_itm else "WGS84",
            "_entity_counts": entity_counts,
            "_total_entities": sum(entity_counts.values()),
            "_total_features": len(features),
            "_dxf_layers": dxf_layers,
            "_errors": errors[:20],
        }


if __name__ == "__main__":
    print(f"\n  {'='*44}")
    print(f"  Gush Helka Map - כפר חב\"ד")
    print(f"  {'='*44}")
    print(f"  Server: http://localhost:{PORT}")
    print(f"  Data:   {DATA}")
    print(f"  {'='*44}\n")

    print("  Building summary (parsing cadastre)...")
    _summary_cache = build_summary()
    s = _summary_cache["stats"]
    print(
        f"  Done: {s['total_plans']} plans, {s['total_blocks']} blocks, "
        f"{s.get('total_layers',0)} layers, {s.get('total_documents',0)} docs, "
        f"{s.get('total_parcels',0)} parcels"
    )

    print("  Building parcel index...")
    _parcel_index = build_parcel_index()
    num_parcels = sum(1 for k in _parcel_index if not k.startswith('g'))
    num_gushim = sum(1 for k in _parcel_index if k.startswith('g'))
    print(f"  Indexed: {num_parcels} parcels across {num_gushim} gushim")

    # Load plan boundaries extracted from KML/SHP files
    _boundaries_file = DATA / "plan_boundaries.geojson"
    if _boundaries_file.exists():
        with open(_boundaries_file, "r", encoding="utf-8") as f:
            _bd = json.load(f)
        for feat in _bd.get("features", []):
            pn = feat.get("properties", {}).get("plan_number", "")
            if pn:
                _plan_boundaries[pn] = feat
                # Also store with normalized key for flexible matching
                _plan_boundaries[_norm_plan_num(pn)] = feat
        print(f"  Loaded {len(_bd.get('features',[]))} plan boundaries from KML/SHP")
    else:
        print("  No plan_boundaries.geojson found (run extract_plan_boundaries.py)")

    print("  Building plan index...")
    _plan_index = build_plan_index()
    print(f"  Indexed: {len(_plan_index)} plans")

    # Load migrash mapping
    _migrash_file = DATA / "migrash_helka_mapping.json"
    if _migrash_file.exists():
        with open(_migrash_file, "r", encoding="utf-8") as f:
            _migrash_data = json.load(f)
        for m in _migrash_data.get("mapping", []):
            key = f"{m['gush']}-{m['helka']}"
            _migrash_index[key] = m
            # Also enrich parcel index
            if key in _parcel_index:
                _parcel_index[key]["migrash"] = m.get("migrash")
                _parcel_index[key]["migrash_plan"] = m.get("plan")
                _parcel_index[key]["yeud"] = m.get("yeud")
                _parcel_index[key]["shetach_sqm"] = m.get("shetach_sqm")
        print(f"  Loaded {len(_migrash_index)} migrash mappings")
    else:
        print("  No migrash mapping file found")

    # Build document file index
    print("  Building document file index...")
    build_doc_index()
    print(f"  Indexed: {len(_doc_index)} document files on disk")

    print(f"\n  Ready! Open http://localhost:{PORT}\n")

    server = http.server.ThreadingHTTPServer(("", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Shutting down...")
        server.shutdown()
