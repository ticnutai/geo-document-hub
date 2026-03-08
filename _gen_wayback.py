import urllib.request, json, sys, re
sys.stdout = open(sys.stdout.fileno(), 'w', encoding='utf-8', closefd=False)
url = 'https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
data = json.loads(urllib.request.urlopen(req, timeout=15).read())
releases = []
for vid, info in data.items():
    title = info.get('itemTitle','')
    m = re.search(r'(\d{4}-\d{2}-\d{2})', title)
    if m:
        date = m.group(1)
        releases.append((date, vid))
releases.sort()

# Select best dates: first, mid-year, last per year
selected = []
for year in range(2014, 2027):
    yr = str(year)
    yr_items = [(d,v) for d,v in releases if d.startswith(yr)]
    if not yr_items:
        continue
    selected.append(yr_items[0])
    target = yr + '-07-01'
    mid = min(yr_items, key=lambda x: abs(int(x[0].replace('-','')) - int(target.replace('-',''))))
    if mid != yr_items[0]:
        selected.append(mid)
    if yr_items[-1] not in selected:
        selected.append(yr_items[-1])

selected = list(dict.fromkeys(selected))
selected.sort()
print(f'Selected {len(selected)} dates:')

months_he = {
    '01':'ינואר','02':'פברואר','03':'מרץ','04':'אפריל',
    '05':'מאי','06':'יוני','07':'יולי','08':'אוגוסט',
    '09':'ספטמבר','10':'אוקטובר','11':'נובמבר','12':'דצמבר'
}

# Output all releases as JSON for use in the app
all_releases = []
for d, v in releases:
    yr = d[:4]
    mo = months_he[d[5:7]]
    all_releases.append({
        'date': d,
        'id': v,
        'year': int(yr),
        'label_he': f'צילום אוויר {yr} ({mo})',
    })

# Save full list
with open('data/wayback_releases.json', 'w', encoding='utf-8') as f:
    json.dump(all_releases, f, ensure_ascii=False, indent=2)
print(f'Saved {len(all_releases)} releases to data/wayback_releases.json')

# Output selected JS entries
print('\n// Selected JS basemap entries:')
for d, v in selected:
    yr = d[:4]
    mo = months_he[d[5:7]]
    label = f'צילום אוויר {yr} ({mo})'
    url_t = f'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/{v}/' + '{z}/{y}/{x}'
    print(f"  '{label}': [{v}, '{d}'],")
