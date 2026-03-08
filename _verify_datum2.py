#!/usr/bin/env python3
"""Test cadastre service datum by querying same parcel in 2039 and 4326."""
import json
import requests
import pyproj
from urllib.parse import quote

WGS84 = pyproj.CRS('EPSG:4326')

parcels_url = "https://services8.arcgis.com/JcXY3lLZni6BK4El/arcgis/rest/services/%D7%97%D7%9C%D7%A7%D7%95%D7%AA/FeatureServer/0/query"

# Query 1 parcel in EPSG:2039
r2039 = requests.get(parcels_url, params={
    'where': 'GUSH_NUM=7187 AND PARCEL=43',
    'outFields': 'GUSH_NUM,PARCEL',
    'outSR': '2039',
    'returnGeometry': 'true',
    'f': 'json'
}, timeout=30)

# Query same parcel in EPSG:4326
r4326 = requests.get(parcels_url, params={
    'where': 'GUSH_NUM=7187 AND PARCEL=43',
    'outFields': 'GUSH_NUM,PARCEL',
    'outSR': '4326',
    'returnGeometry': 'true',
    'f': 'json'
}, timeout=30)

d2039 = r2039.json()
d4326 = r4326.json()

print("=== Cadastre Service Spatial Reference ===\n")
if 'spatialReference' in d2039:
    sr = d2039['spatialReference']
    print(f"2039 response SR: wkid={sr.get('wkid')}, latestWkid={sr.get('latestWkid')}")
if 'spatialReference' in d4326:
    sr4 = d4326['spatialReference']
    print(f"4326 response SR: wkid={sr4.get('wkid')}, latestWkid={sr4.get('latestWkid')}")
print()

if d2039.get('features') and d4326.get('features'):
    # Get first coordinate of first ring
    ring2039 = d2039['features'][0]['geometry']['rings'][0][0]
    ring4326 = d4326['features'][0]['geometry']['rings'][0][0]
    
    print(f"Parcel: Gush 7187, Helka 43")
    print(f"Server EPSG:2039: ({ring2039[0]:.3f}, {ring2039[1]:.3f})")
    print(f"Server EPSG:4326: ({ring4326[0]:.8f}, {ring4326[1]:.8f})")
    print()
    
    # Convert 2039 point ourselves WITH towgs84
    crs_with = pyproj.CRS.from_proj4(
        '+proj=tmerc +lat_0=31.73439361111111 +lon_0=35.20451694444445 '
        '+k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 '
        '+towgs84=23.772,17.49,17.859,-0.3132,-1.85274,1.67299,-5.4262 '
        '+units=m +no_defs')
    
    # WITHOUT towgs84 (IG05/12)
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
    
    print("=== Which conversion matches the server? ===\n")
    print(f"Server's WGS84 (outSR=4326):   {server_lat:.8f}N, {server_lng:.8f}E")
    print(f"Our WITH towgs84 (Israel 1993): {lat_w:.8f}N, {lng_w:.8f}E")
    print(f"Our WITHOUT towgs84 (IG05/12):  {lat_wo:.8f}N, {lng_wo:.8f}E")
    print()
    
    d1_lat = (lat_w - server_lat) * 111320
    d1_lng = (lng_w - server_lng) * 111320 * 0.85
    d2_lat = (lat_wo - server_lat) * 111320
    d2_lng = (lng_wo - server_lng) * 111320 * 0.85
    
    total1 = (d1_lat**2 + d1_lng**2)**0.5
    total2 = (d2_lat**2 + d2_lng**2)**0.5
    
    print(f"WITH towgs84 vs server:    {total1:.2f}m")
    print(f"WITHOUT towgs84 vs server: {total2:.2f}m")
    print()
    
    if total2 < total1:
        print(">>> CONCLUSION: Data is IG05/12 — towgs84 should be REMOVED <<<")
        print(f">>> The towgs84 parameters add {total1:.0f}m of error! <<<")
    else:
        print(">>> CONCLUSION: Data IS Israel 1993 — towgs84 is CORRECT <<<")
else:
    print("ERROR fetching features")
    if d2039.get('error'):
        print(f"2039: {d2039['error']}")
    if d4326.get('error'):
        print(f"4326: {d4326['error']}")

# Also check the layer metadata
print("\n=== Layer Metadata ===\n")
meta_url = "https://services8.arcgis.com/JcXY3lLZni6BK4El/arcgis/rest/services/%D7%97%D7%9C%D7%A7%D7%95%D7%AA/FeatureServer/0"
rm = requests.get(meta_url, params={'f': 'json'}, timeout=30)
md = rm.json()
ext = md.get('extent', {})
sr_native = ext.get('spatialReference', {})
print(f"Native SR: wkid={sr_native.get('wkid')}, latestWkid={sr_native.get('latestWkid')}")
print(f"Extent: {ext.get('xmin')}, {ext.get('ymin')} to {ext.get('xmax')}, {ext.get('ymax')}")
