# Comprehensive Research Report: gushim_halakot_project

## Workspace Overview

This workspace is a GIS data collection and analysis project focused on **כפר חב"ד (Kfar Chabad)** urban planning data. It aggregates plan boundaries, cadastral data, land-use zoning, and plan documents from multiple Israeli government GIS services.

---

## 1. Data Sources & APIs

### 1.1 iPlan Xplan MapServer (Primary Boundary Source)

- **URL**: `https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer`
- **Layers**:
  | ID | Name | Description |
  |----|------|-------------|
  | 0  | ישויות נקודתיות | Point entities |
  | 1  | קוים כחולים-תכניות מקוונות | **Blue lines – online plan boundaries** (primary) |
  | 2  | ישויות קוויות | Line entities |
  | 3  | ישויות פוליגונליות | Polygonal entities |
  | 4  | יעודי קרקע | Land use designations |

- **Total plans in Layer 1**: 35,083 (nationwide)
- **כפר חב"ד plans with boundaries**: 24 plans (all modern `425-XXXXXXX` format)
- **CRS**: EPSG:2039 (Israel TM Grid / ITM)
- **Auth**: Requires custom SSL adapter with `ctx.set_ciphers("DEFAULT:@SECLEVEL=1")` and `verify=False`
- **Pagination**: Uses `objectid >` cursor with `resultRecordCount`
- **Key fields**: `pl_number`, `mp_id`, `pl_name`, `station_desc`, `plan_county_name`, `pl_landuse_string`, `pl_area_dunam`, `pl_url`, `shape` (geometry)

**Critical finding**: Layer 1 contains **only modern-format plans** (`425-XXXXXXX`). No old-format plans (`גז/525/*`, `על/525/*`, etc.) exist in this layer. Querying by old MP_IDs (7-digit like `4063057`) returns 0 results.

### 1.2 iPlan Additional MapServer Services

45 MapServer services available under `PlanningPublic/`. Key ones used:

| Service | Content | Files Downloaded |
|---------|---------|-----------------|
| `Xplan` | Plan boundaries + land use | `xplan_polygons.geojson`, `xplan_lines.geojson`, `xplan_points.geojson`, `xplan_land_use.geojson` |
| `tmm_3_21` | District plan תמ"מ 3/21 | ~30 layers (roads, land use, borders, etc.) |
| `TAMA_1` | National plan תמ"א 1 | 12 layers (electricity, flood, forest, roads, etc.) |
| `Tama_35_1` | National plan תמ"א 35 | 13 layers (conservation, corridors, landscape, etc.) |
| `gvulot_retzef` | Administrative boundaries | 5 layers (districts, municipalities, planning areas) |
| `ttl_all_blue_lines` | TTL plan blue lines | 1 layer |
| `Shimour` | Conservation sites | 2 layers (points + polygons) |
| `road_compilation` | Road network | 3 layers (roads, interchanges, detailed) |
| `train_compilation` | Rail network | 1 layer |

### 1.3 MAVAT (מבא"ת) – Plan Search Portal

- **URL**: `https://mavat.iplan.gov.il/SV3` (search) / `SV4` (plan details)
- **Type**: Angular SPA – no direct REST API for boundary data
- **Access method**: Playwright browser automation (`_search_all_blocks.py`)
- **Searched blocks**: 6256, 6258, 6260, 6261, 6262, 6269, 6272, 6280, 7187, 7188, 7196, 7311
- **Plan detail URL pattern**: `/SV4/1/{MP_ID}/310`
- **Data obtained**: Plan metadata only (PL_NUMBER, PL_NAME, MP_ID, STATION_DESC, LOCATION)
- **No boundary geometry available from MAVAT**

### 1.4 Complot SOAP API

- **Data file**: `data/complot_kfar_chabad/complot_parsed.json`
- **Content**: Pure metadata – plan names, plan numbers, gush lists, yeshuv lists
- **No geometry/boundary data whatsoever**
- **Functions**: `GetTabaNames` (634 items), `GetTabaNumbers` (729), `GetGushim` (10), `GetYeshuvim` (17)

### 1.5 MMG (מ"מ"ג) – Plan SHP Files

- **Source**: SHP ZIP files attached to plans on MAVAT/iPlan
- **Extraction**: `extract_mmg_geojson.py` reads SHP from ZIPs in `data/docs/{plan}/`
- **Layers**: MVT_GVUL (boundary), MVT_PLAN, MVT_PARCEL, MVT_GUSH, MVT_LABEL, MVT_ARC, MVT_POL, etc.
- **Output**: `data/mmg/{plan_number}/` subdirectories

**Status**:
- 30 MMG subdirectories created, but only **6 plans** have `MVT_GVUL.geojson` (boundary polygons):
  - `425-0117390` (15 geojson files)
  - `425-0449702` (8 files)
  - `425-0498865` (11 files)
  - `425-0541870` (8 files)
  - `425-0589184` (7 files)
  - `425-0486316` (7 files)
  - `425-1308469` (8 files)
  - `תמא_ 4_ 2_ א_ 2` (8 files)
  - `תתל_ 33` (8 files)
  - `תתל_ 66` (13 files)
- SHP ZIPs exist for **34 plan directories** (all modern 425-* plans, plus national plans)
- **Zero old-format plans have SHP data**

### 1.6 Cadastre Data

- **Directory**: `data/cadastre/`
- **Content**: Block (גוש) and parcel (חלקה) polygons for the כפר חב"ד area
- **Source**: Government cadastral service

---

## 2. Plan Inventory

### 2.1 Summary

| Category | Count | Have Boundary Polygons? |
|----------|-------|------------------------|
| Modern plans (`425-*`) in Xplan | 24 | ✅ Yes (from Xplan Layer 1) |
| Modern plans (`425-*`) in block search | 29 | ✅ 24 of 29 |
| Old-format plans (גז, על, גמ, etc.) | 42 | ❌ **No** |
| **Total unique plans** | **71** | 24 with boundaries |

### 2.2 Old-Format Plans (No Boundary Data Available)

All 42 old-format plans with their MP_IDs:

| PL_NUMBER | MP_ID | Type |
|-----------|-------|------|
| גז/ 525/ 2 | 4077141 | Local |
| גז/ 525/ 2/ א | 4000208385 | Local amendment |
| גז/ 525/ 3 | 4000208063 | Local |
| גז/ 525/ 4 | 4078584 | Local |
| גז/ 525/ 12 | 4063057 | Local |
| גז/ 525/ 18 | 4053042 | Local |
| גז/ 525/ 21 | 4053050 | Local |
| גז/ 525/ 23 | 4053045 | Local |
| גז/ 525/ 23/ א | 4053040 | Local amendment |
| גז/ 525/ 27/ א | 4053041 | Local amendment |
| גז/ 45 | 4078586 | Local |
| גז/ 62 | 4000209579 | Local |
| גז/ 624 | 4000211049 | Local |
| גז/ במ/ 525/ 19 | 4052920 | Local |
| גז/ מק/ 525/ 28 | 4052863 | Local |
| גז/ מק/ 525/ 30 | 4052870 | Local |
| גז/ מק/ 525/ 34 | 4066502 | Local |
| גז/ מק/ 525/ 39 | 4100443 | Local |
| על/ 525/ 2/ א | 4000205265 | Local amendment |
| על/ 525/ 43 | 4104668 | Local |
| על/ 525/ 48 | 4000232647 | Local |
| על/ מק/ 525/ 40 | 4101873 | Local |
| על/ מק/ 525/ 48 | 4000216989 | Local |
| גמ/ 525 | 4000210219 | Local |
| גמ/ 548 | 4077325 | Local |
| יד/ מק/ 6137 | 4052285 | Local |
| יוש/ 51/ 51 | 7005221710 | Local |
| מח/ 150 | 4059059 | Local |
| מח/ 150/ 1 | 4070916 | Local |
| משמ/ 115/ גז | 4078045 | Local |
| פת/ 1205/ 22 | 4089512 | Local |
| 455-0812289 | 4005042224 | Modern alt-district |
| 6/ 03/ 230 | 6000223579 | Old numeric |
| תמא/ 4/ 2/ א/ 2 | 99000395267 | National |
| תמא/ 5 | 99001749 | National |
| תממ/ 3/ 21/ 42 | 99000991251 | District |
| תתל/ 18 | 99003683 | National infrastructure |
| תתל/ 26/ 202 | 99005712 | National infrastructure |
| תתל/ 33 | 99000310859 | National infrastructure |
| תתל/ 66 | 4000266689 | National infrastructure |
| תתל/ 130 | 99005180460 | National infrastructure |
| תתל/ 131 | 99005203792 | National infrastructure |

### 2.3 MP_ID Format Discrepancy

| Source | MP_ID Format | Range | Example |
|--------|-------------|-------|---------|
| Xplan Layer 1 (modern) | 10-digit | 4000426053 – 4005519122 | `425-1308469` → `4005363502` |
| all_plans_by_block (old local) | 7-digit | 4052285 – 4104668 | `גז/ 525/ 12` → `4063057` |
| all_plans_by_block (national) | 11-digit | 99000310859 – 99005203792 | `תתל/ 33` → `99000310859` |

The old-plan MP_IDs (7-digit) are in a **completely different numeric range** from Xplan MP_IDs (10-digit). This confirms the old plans were never digitized/uploaded to the Xplan GIS layer.

---

## 3. GIS Data Files

### 3.1 Primary Output Files

| File | Records | Source | Content |
|------|---------|--------|---------|
| `data/taba_kfar_chabad.geojson` | 24-25 features | Xplan Layer 1 | Plan boundary polygons (modern plans only) |
| `data/all_plans_by_block.json` | 71 plans | MAVAT SV3 scraping | Plan metadata for all plans touching כפר חב"ד blocks |
| `data/gis_layers/*.geojson` | 95 files | Various iPlan MapServer services | Land use, infrastructure, boundaries, etc. |
| `data/mmg/*/MVT_GVUL.geojson` | ~10 plans | SHP ZIPs from plan docs | Plan boundaries from digital submissions |
| `data/cadastre/*.geojson` | blocks+parcels | Cadastral service | Gush/helka boundaries |
| `data/complot_kfar_chabad/` | metadata only | SOAP API | Plan names/numbers, no geometry |

### 3.2 Directory Structure

```
data/
├── taba_kfar_chabad.geojson        # 24 plan boundaries from Xplan
├── all_plans_by_block.json         # 71 plans metadata (MAVAT)
├── gis_layers/                     # 95 GeoJSON files from iPlan services
│   ├── xplan_polygons.geojson
│   ├── xplan_land_use.geojson
│   ├── tmm321_*.geojson (30 layers)
│   ├── tama1_*.geojson (12 layers)
│   ├── tama35_*.geojson (13 layers)
│   ├── gvulot_*.geojson (5 layers)
│   └── ...
├── mmg/                            # Extracted SHP→GeoJSON per plan
│   ├── 425-0117390/MVT_GVUL.geojson
│   ├── 425-1308469/MVT_GVUL.geojson
│   ├── ...
│   └── mmg_index.json (1 entry only)
├── cadastre/                       # Block/parcel boundaries
├── docs/                           # Downloaded plan documents + ZIPs
│   ├── 425-0117390/
│   ├── 425-0449702/
│   └── ... (34 dirs with ZIPs)
├── complot_kfar_chabad/            # SOAP metadata (no geo)
└── migrash/                        # Migrash (plot) data
```

---

## 4. Key Scripts & How They Work

### 4.1 `download_taba_kfar_chabad.py` — Plan Boundary Downloader

**Purpose**: Downloads plan boundary polygons from iPlan Xplan MapServer Layer 1.

**How it works**:
1. Creates custom `_IplanSSLAdapter` for TLS compatibility with `ags.iplan.gov.il`
2. Queries Layer 1 with `WHERE plan_county_name LIKE '%חב_ד%'`
3. Paginates using `objectid >` cursor (1000 records/page)
4. Converts Esri JSON `rings` geometry → GeoJSON Polygon/MultiPolygon
5. Outputs `data/taba_kfar_chabad.geojson`

**Adaptable for**: Any plan query by changing the `WHERE` clause. Could query by `mp_id` or `pl_number` for specific plans.

### 4.2 `_search_all_blocks.py` — MAVAT Block Search Scraper

**Purpose**: Finds ALL plans associated with כפר חב"ד block numbers via MAVAT SV3 advanced search.

**How it works**:
1. Launches headless Chromium via Playwright
2. Navigates to `https://mavat.iplan.gov.il/SV3`
3. Opens advanced search form
4. For each block number (12 blocks), fills the `blockNumber` input and submits
5. Intercepts XHR responses containing plan data
6. Paginates through results
7. Deduplicates and saves to `data/all_plans_by_block.json`

**Output fields**: `PL_NUMBER`, `PL_NAME`, `MP_ID`, `STATION_DESC`, `ENTITY_SUBTYPE_DESC`, `LOCATION`

### 4.3 `download_iplan_layers.py` — Multi-Layer GIS Downloader

**Purpose**: Downloads 90+ GIS layers from various iPlan MapServer services.

**How it works**:
1. Defines comprehensive layer list covering Xplan, TMM 3/21, TAMA 1, TAMA 35, gvulot, TTL, Shimour, etc.
2. Uses spatial extent filter (EPSG:2039 bbox for כפר חב"ד area)
3. Paginates each layer query
4. Converts Esri JSON → GeoJSON with coordinate transformation
5. Outputs to `data/gis_layers/`

### 4.4 `extract_mmg_geojson.py` — SHP-to-GeoJSON Extractor

**Purpose**: Extracts SHP files from plan ZIP archives and converts to GeoJSON.

**How it works**:
1. Scans `data/docs/{plan}/` for files named `*SHP*.zip`
2. Extracts SHP/SHX/DBF into temp directory
3. Uses `shapefile` library to read geometries
4. Transforms from EPSG:2039 → EPSG:4326 via pyproj
5. Outputs layer GeoJSONs to `data/mmg/{plan}/`

**Layers extracted**: MVT_GVUL (boundary), MVT_PLAN, MVT_PARCEL, MVT_MIGRASH, MVT_YEUD, MVT_BLDG, MVT_ROAD, MVT_GUSH, MVT_ARC, MVT_POL, MVT_LABEL, etc.

### 4.5 `serve_ui.py` — Web UI Server

**Purpose**: Serves a web interface for viewing plan data on a map.

**Key function** `build_plan_index()` (line 346):
- Merges plans from `taba_kfar_chabad.geojson` (with geometry centroid → lat/lng) and `all_plans_by_block.json` (metadata only → lat/lng=None)
- Adds complot names from `complot_parsed.json`
- Normalizes plan numbers for matching

---

## 5. The Old-Plan Boundary Problem

### 5.1 Current State

**42 old-format plans have NO boundary polygon data from any source.**

Verified exhaustively:
- ❌ **Xplan MapServer Layer 1**: Only contains modern `425-*` plans. Query `pl_number LIKE 'גז%'` returns 0. Query `mp_id = 4063057` returns 0.
- ❌ **Xplan MapServer Layers 0-4**: No Hebrew-format plan numbers in any layer.
- ❌ **Other iPlan services**: TMM, TAMA, entities services have no old local plans.
- ❌ **Complot SOAP API**: No geometry data at all.
- ❌ **MMG/SHP ZIPs**: Only modern plans have SHP files attached. No SHP ZIPs exist for old plans.
- ❌ **MAVAT SV3/SV4**: Returns metadata only, no boundary geometry.

### 5.2 Possible Approaches to Obtain Old Plan Boundaries

#### Approach A: MAVAT Plan Page Boundary (Browser Scraping)
The MAVAT plan detail page (`/SV4/1/{MP_ID}/310`) displays plans on a map viewer. The map may load boundary geometry dynamically. A Playwright script could:
1. Navigate to `https://mavat.iplan.gov.il/SV4/1/{MP_ID}/310`
2. Intercept map tile/feature requests
3. Extract boundary geometry from the map viewer's data layer

**Feasibility**: Medium. Requires reverse-engineering the MAVAT map viewer's data loading mechanism.

#### Approach B: Plan Document Scanning
Old plans may have boundary descriptions or scanned maps in their PDF documents. OCR + georeferencing could extract approximate boundaries.

**Feasibility**: Low. Manual/semi-automated, error-prone.

#### Approach C: Cadastral Approximation
Since old plans reference specific gush (block) and helka (parcel) numbers, boundaries could be approximated by:
1. Looking up which blocks each plan covers (from `all_plans_by_block.json` block_plan_map)
2. Using cadastral parcel boundaries from `data/cadastre/`
3. Unioning relevant parcel polygons to create approximate plan boundaries

**Feasibility**: High for coarse boundaries. Block-level boundaries are readily available.

#### Approach D: Xplan Background Services
Services like `xplan_background`, `entities`, `Xplan_6991` may contain older plan data. (Could not verify due to network connectivity loss during testing.)

**Feasibility**: Unknown. Worth investigating when network is available.

---

## 6. Coordinate Reference Systems

| CRS | Usage |
|-----|-------|
| EPSG:2039 (Israel TM Grid) | Native CRS in iPlan MapServer, MMG SHP files |
| EPSG:4326 (WGS84) | Output GeoJSON, web display |
| Transformation | `pyproj.Transformer.from_crs(2039, 4326)` with `always_xy=True` |
| Datum | Israel 1993 (verified with towgs84 parameters) |

---

## 7. Technical Requirements

### Dependencies
- `requests` + custom SSL adapter (for iPlan API)
- `playwright` (for MAVAT browser automation)
- `pyproj` (coordinate transformation)
- `shapefile` (SHP file reading)

### SSL Configuration
```python
class _IplanSSLAdapter(HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        ctx = create_urllib3_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        ctx.set_ciphers("DEFAULT:@SECLEVEL=1")
        kwargs["ssl_context"] = ctx
        return super().init_poolmanager(*args, **kwargs)
```

This is **required** for all connections to `ags.iplan.gov.il`.

---

## 8. Recommendations

1. **Re-run MMG extraction** (`extract_mmg_geojson.py`) to populate all 34 plan directories that have SHP ZIPs — currently `mmg_index.json` only tracks 1 plan despite 30 directories having extracted data.

2. **Investigate MAVAT map viewer** — the plan detail page at `/SV4/1/{MP_ID}/310` likely loads boundary geometry for old plans. Intercepting these requests is the most promising path to obtaining old plan boundaries.

3. **Use cadastral approximation** as a fallback — union the block polygons from `data/cadastre/` for each old plan's associated blocks to create approximate boundaries.

4. **Check `Xplan_6991` and `entities` services** when network is available — these may contain older plan boundaries not in the main Xplan service.

5. **Fix `serve_ui.py` plan index** — currently old plans from `all_plans_by_block.json` get `mp_id: None` in the index even though the JSON has valid MP_IDs. The `build_plan_index()` function should propagate MP_IDs for block-sourced plans.
