#!/usr/bin/env python3
"""Check the iPlan server's native CRS and compare datum transformations."""
import json
import ssl
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.ssl_ import create_urllib3_context
import urllib3
import pyproj

urllib3.disable_warnings()

class _IplanSSLAdapter(HTTPAdapter):
    def init_poolmanager(self, *a, **kw):
        ctx = create_urllib3_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        ctx.set_ciphers('DEFAULT:@SECLEVEL=1')
        kw['ssl_context'] = ctx
        return super().init_poolmanager(*a, **kw)

s = requests.Session()
s.mount('https://ags.iplan.gov.il', _IplanSSLAdapter())
s.verify = False

BASE = 'https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer/1'

# 1. Check layer spatial reference
print("=== Layer Spatial Reference ===\n")
r = s.get(BASE, params={'f': 'json'}, timeout=30)
data = r.json()
sr = data.get('extent', {}).get('spatialReference', {})
print(f"WKID: {sr.get('wkid')}")
print(f"Latest WKID: {sr.get('latestWkid')}")
ext = data.get('extent', {})
print(f"Extent: xmin={ext.get('xmin')}, ymin={ext.get('ymin')}")
print(f"        xmax={ext.get('xmax')}, ymax={ext.get('ymax')}")
print()

# 2. Query same plan in EPSG:2039 AND EPSG:4326
WHERE = "plan_county_name LIKE '%חב_ד%'"

r2039 = s.get(BASE + '/query', params={
    'where': WHERE, 'outFields': 'PLAN_NUMBER', 'outSR': '2039',
    'returnGeometry': 'true', 'resultRecordCount': '1', 'f': 'json'
}, timeout=30)
d2039 = r2039.json()

r4326 = s.get(BASE + '/query', params={
    'where': WHERE, 'outFields': 'PLAN_NUMBER', 'outSR': '4326',
    'returnGeometry': 'true', 'resultRecordCount': '1', 'f': 'json'
}, timeout=30)
d4326 = r4326.json()

print("=== Comparison: Server's 2039 vs 4326 ===\n")

if d2039.get('features') and d4326.get('features'):
    ring2039 = d2039['features'][0]['geometry']['rings'][0][0]
    ring4326 = d4326['features'][0]['geometry']['rings'][0][0]
    plan_num = d2039['features'][0]['attributes'].get('PLAN_NUMBER', '?')

    print(f"Plan: {plan_num}")
    print(f"Server EPSG:2039: ({ring2039[0]:.3f}, {ring2039[1]:.3f})")
    print(f"Server EPSG:4326: ({ring4326[0]:.8f}, {ring4326[1]:.8f})")
    print()

    # Our conversions
    WGS84 = pyproj.CRS('EPSG:4326')
    
    # WITH towgs84 (Israel 1993 datum -> WGS84)
    crs_with = pyproj.CRS.from_proj4(
        '+proj=tmerc +lat_0=31.73439361111111 +lon_0=35.20451694444445 '
        '+k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 '
        '+towgs84=23.772,17.49,17.859,-0.3132,-1.85274,1.67299,-5.4262 '
        '+units=m +no_defs')
    
    # WITHOUT towgs84 (IG05/12 - same projection on WGS84 ellipsoid)
    crs_without = pyproj.CRS.from_proj4(
        '+proj=tmerc +lat_0=31.73439361111111 +lon_0=35.20451694444445 '
        '+k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 '
        '+units=m +no_defs')

    t_with = pyproj.Transformer.from_crs(crs_with, WGS84, always_xy=True)
    t_without = pyproj.Transformer.from_crs(crs_without, WGS84, always_xy=True)

    x, y = ring2039[0], ring2039[1]
    lng_w, lat_w = t_with.transform(x, y)
    lng_wo, lat_wo = t_without.transform(x, y)

    server_lng, server_lat = ring4326[0], ring4326[1]

    print("=== Results ===\n")
    print(f"Server's own WGS84 (outSR=4326): {server_lat:.8f}N, {server_lng:.8f}E")
    print(f"Our WITH towgs84 (Israel 1993):  {lat_w:.8f}N, {lng_w:.8f}E")
    print(f"Our WITHOUT towgs84 (IG05/12):   {lat_wo:.8f}N, {lng_wo:.8f}E")
    print()

    d1_lat = (lat_w - server_lat) * 111320
    d1_lng = (lng_w - server_lng) * 111320 * 0.85
    d2_lat = (lat_wo - server_lat) * 111320
    d2_lng = (lng_wo - server_lng) * 111320 * 0.85

    total1 = (d1_lat**2 + d1_lng**2)**0.5
    total2 = (d2_lat**2 + d2_lng**2)**0.5

    print(f"WITH towgs84 vs server:    {d1_lat:+.2f}m lat, {d1_lng:+.2f}m lng = {total1:.2f}m total")
    print(f"WITHOUT towgs84 vs server: {d2_lat:+.2f}m lat, {d2_lng:+.2f}m lng = {total2:.2f}m total")
    print()

    if total1 < total2:
        print(">>> WITH towgs84 is CLOSER to server's conversion <<<")
        print(">>> Data IS in Israel 1993 datum — current code is CORRECT <<<")
    else:
        print(">>> WITHOUT towgs84 is CLOSER to server's conversion <<<")
        print(">>> Data is in IG05/12 — should REMOVE towgs84 <<<")
    
    print()
    print(f"Google Maps (server):  https://www.google.com/maps?q={server_lat},{server_lng}&z=19")
    print(f"Google Maps (with):    https://www.google.com/maps?q={lat_w},{lng_w}&z=19")
    print(f"Google Maps (without): https://www.google.com/maps?q={lat_wo},{lng_wo}&z=19")
else:
    print("ERROR: Could not fetch features")
    if d2039.get('error'):
        print(f"2039 error: {d2039['error']}")
    if d4326.get('error'):
        print(f"4326 error: {d4326['error']}")
