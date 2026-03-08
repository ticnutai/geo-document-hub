import glob
import importlib
import math
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

try:
    import ezdxf
except ImportError:
    ezdxf = None

EXPORT_FORMATS = ["pdf", "dxf", "dwg", "dwf"]


def _as_feature_list(geojson):
    if not isinstance(geojson, dict):
        return []
    gtype = geojson.get("type")
    if gtype == "FeatureCollection":
        return geojson.get("features", [])
    if gtype == "Feature":
        return [geojson]
    if gtype in ("Polygon", "MultiPolygon", "LineString", "MultiLineString", "Point", "MultiPoint"):
        return [{"type": "Feature", "geometry": geojson, "properties": {}}]
    return []


def _collect_points_for_bbox(features):
    points = []
    for feat in features:
        geom = feat.get("geometry") or {}
        gtype = geom.get("type")
        coords = geom.get("coordinates")
        if not coords:
            continue
        if gtype == "Point":
            points.append(coords)
        elif gtype == "MultiPoint":
            points.extend(coords)
        elif gtype == "LineString":
            points.extend(coords)
        elif gtype == "MultiLineString":
            for ln in coords:
                points.extend(ln)
        elif gtype == "Polygon":
            for ring in coords:
                points.extend(ring)
        elif gtype == "MultiPolygon":
            for poly in coords:
                for ring in poly:
                    points.extend(ring)
    points = [p for p in points if isinstance(p, (list, tuple)) and len(p) >= 2]
    return points


def export_layer_to_pdf(layer_geojson, out_path, title="Layer Export"):
    try:
        colors_mod = importlib.import_module("reportlab.lib.colors")
        pages_mod = importlib.import_module("reportlab.lib.pagesizes")
        pdfgen_mod = importlib.import_module("reportlab.pdfgen.canvas")
        HexColor = colors_mod.HexColor
        A4 = pages_mod.A4
        landscape = pages_mod.landscape
        canvas = pdfgen_mod.Canvas
    except ImportError as exc:
        raise ImportError("reportlab is required for PDF export. Install: pip install reportlab") from exc

    features = _as_feature_list(layer_geojson)
    c = canvas(out_path, pagesize=landscape(A4))
    width, height = landscape(A4)
    margin = 24

    c.setTitle(title)
    c.setAuthor("Gush Helka Map")
    c.setFont("Helvetica-Bold", 13)
    c.drawString(margin, height - margin + 2, title)

    points = _collect_points_for_bbox(features)
    if not points:
        c.setFont("Helvetica", 10)
        c.drawString(margin, height - margin - 16, "No geometry to export")
        c.save()
        return out_path

    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    span_x = max(max_x - min_x, 1e-9)
    span_y = max(max_y - min_y, 1e-9)

    draw_w = width - 2 * margin
    draw_h = height - 2 * margin - 12
    scale = min(draw_w / span_x, draw_h / span_y)

    def tx(pt):
        x, y = pt[0], pt[1]
        dx = margin + (x - min_x) * scale
        dy = margin + (y - min_y) * scale
        return dx, dy

    c.setStrokeColor(HexColor("#1f2937"))
    c.setFillColor(HexColor("#93c5fd"))
    c.setLineWidth(0.6)

    def draw_linestring(coords):
        coords = [p for p in coords if isinstance(p, (list, tuple)) and len(p) >= 2]
        if len(coords) < 2:
            return
        path = c.beginPath()
        x0, y0 = tx(coords[0])
        path.moveTo(x0, y0)
        for pt in coords[1:]:
            x, y = tx(pt)
            path.lineTo(x, y)
        c.drawPath(path, stroke=1, fill=0)

    def draw_polygon(rings):
        if not rings:
            return
        outer = [p for p in rings[0] if isinstance(p, (list, tuple)) and len(p) >= 2]
        if len(outer) < 3:
            return
        path = c.beginPath()
        x0, y0 = tx(outer[0])
        path.moveTo(x0, y0)
        for pt in outer[1:]:
            x, y = tx(pt)
            path.lineTo(x, y)
        path.close()
        c.drawPath(path, stroke=1, fill=1)

    for feat in features:
        geom = feat.get("geometry") or {}
        gtype = geom.get("type")
        coords = geom.get("coordinates")
        if not coords:
            continue
        if gtype == "Point":
            x, y = tx(coords)
            c.circle(x, y, 1.8, stroke=1, fill=1)
        elif gtype == "MultiPoint":
            for pt in coords:
                x, y = tx(pt)
                c.circle(x, y, 1.6, stroke=1, fill=1)
        elif gtype == "LineString":
            draw_linestring(coords)
        elif gtype == "MultiLineString":
            for line in coords:
                draw_linestring(line)
        elif gtype == "Polygon":
            draw_polygon(coords)
        elif gtype == "MultiPolygon":
            for poly in coords:
                draw_polygon(poly)

    c.save()
    return out_path


def export_layer_to_dxf(layer_geojson, out_path):
    if ezdxf is None:
        raise ImportError("ezdxf is required for DXF export. Install: pip install ezdxf")

    features = _as_feature_list(layer_geojson)
    doc = ezdxf.new("R2018")
    msp = doc.modelspace()

    def add_line(coords):
        coords = [p for p in coords if isinstance(p, (list, tuple)) and len(p) >= 2]
        if len(coords) < 2:
            return
        for i in range(len(coords) - 1):
            a, b = coords[i], coords[i + 1]
            msp.add_line((float(a[0]), float(a[1])), (float(b[0]), float(b[1])))

    def add_polyline(coords, closed=False):
        pts = [(float(p[0]), float(p[1])) for p in coords if isinstance(p, (list, tuple)) and len(p) >= 2]
        if len(pts) < 2:
            return
        msp.add_lwpolyline(pts, close=closed)

    for feat in features:
        geom = feat.get("geometry") or {}
        gtype = geom.get("type")
        coords = geom.get("coordinates")
        if not coords:
            continue
        if gtype == "Point":
            msp.add_point((float(coords[0]), float(coords[1])))
        elif gtype == "MultiPoint":
            for pt in coords:
                if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                    msp.add_point((float(pt[0]), float(pt[1])))
        elif gtype == "LineString":
            add_polyline(coords, closed=False)
        elif gtype == "MultiLineString":
            for ln in coords:
                add_polyline(ln, closed=False)
        elif gtype == "Polygon":
            if coords:
                add_polyline(coords[0], closed=True)
        elif gtype == "MultiPolygon":
            for poly in coords:
                if poly:
                    add_polyline(poly[0], closed=True)

    doc.saveas(out_path)
    return out_path


def export_dxf_to_dwg_or_dwf(dxf_path, out_path, fmt="DWG"):
    oda_exe = find_oda_converter()
    if not oda_exe:
        raise RuntimeError("ODA File Converter not found")

    in_dir = tempfile.mkdtemp(prefix="oda_in_")
    out_dir = tempfile.mkdtemp(prefix="oda_out_")
    try:
        src_name = "layer_export.dxf"
        src_path = os.path.join(in_dir, src_name)
        shutil.copyfile(dxf_path, src_path)

        cmd = [oda_exe, in_dir, out_dir, "ACAD2018", fmt.upper(), "0", "1"]
        result = subprocess.run(cmd, capture_output=True, timeout=180)
        if result.returncode != 0:
            msg = result.stderr.decode(errors="ignore")[:1000] if result.stderr else "Unknown ODA error"
            raise RuntimeError(f"ODA conversion failed: {msg}")

        candidates = list(Path(out_dir).glob(f"*.{fmt.lower()}"))
        if not candidates:
            candidates = list(Path(out_dir).glob("**/*" + f".{fmt.lower()}"))
        if not candidates:
            raise RuntimeError(f"ODA did not produce a {fmt} file")

        shutil.copyfile(str(candidates[0]), out_path)
        return out_path
    finally:
        shutil.rmtree(in_dir, ignore_errors=True)
        shutil.rmtree(out_dir, ignore_errors=True)


def find_oda_converter():
    for base in [r"C:\Program Files\ODA", r"C:\Program Files (x86)\ODA"]:
        matches = glob.glob(os.path.join(base, "**", "ODAFileConverter.exe"), recursive=True)
        if matches:
            return matches[0]
    return shutil.which("ODAFileConverter")


def export_layer(layer_geojson, out_path, fmt="pdf", title="Layer Export"):
    fmt = (fmt or "pdf").lower().strip()
    if fmt == "pdf":
        return export_layer_to_pdf(layer_geojson, out_path, title=title)
    if fmt == "dxf":
        return export_layer_to_dxf(layer_geojson, out_path)
    if fmt in ("dwg", "dwf"):
        with tempfile.NamedTemporaryFile(suffix=".dxf", delete=False) as tmp:
            tmp_dxf = tmp.name
        try:
            export_layer_to_dxf(layer_geojson, tmp_dxf)
            return export_dxf_to_dwg_or_dwf(tmp_dxf, out_path, fmt.upper())
        finally:
            try:
                os.remove(tmp_dxf)
            except Exception:
                pass
    raise ValueError(f"Unsupported export format: {fmt}")
