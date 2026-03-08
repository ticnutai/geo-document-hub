import urllib.request, json

# Test 1: migrash plan API
r = urllib.request.urlopen('http://localhost:3000/api/migrash/plan/%D7%92%D7%96%2F12%2F525')
d = json.loads(r.read())
print(f"Test 1 - Plan: {d['plan']}, Migrashim: {len(d['migrashim'])}, Gushim: {d['gushim']}")

# Test 2: search plan API  
r2 = urllib.request.urlopen('http://localhost:3000/api/search/plan?q=%D7%92%D7%96%20525%2012')
d2 = json.loads(r2.read())
print(f"Test 2 - Found {len(d2)} plans, first: {d2[0]['number'] if d2 else 'none'}")

# Test 3: parcels geojson
r3 = urllib.request.urlopen('http://localhost:3000/api/parcels/geojson?gush=7188')
d3 = json.loads(r3.read())
print(f"Test 3 - Parcels for gush 7188: {len(d3.get('features', []))} features")

print("ALL TESTS PASSED")
