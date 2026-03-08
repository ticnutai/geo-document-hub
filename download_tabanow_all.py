"""
Comprehensive TabaNow scraper for all Kfar Chabad plans.
Extracts: general metadata, plan purpose, areas, migrashim, 
gush/helka mapping, approval timeline, and related plans.
"""
import urllib.request, re, json, sys, time, html as htmlmod
from urllib.parse import quote, unquote
from pathlib import Path
from collections import OrderedDict

DATA = Path("data")
DATA.mkdir(exist_ok=True)

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
BASE = 'https://www.tabanow.co.il'
COMMITTEE = 'שדות דן'

tag_strip = re.compile(r'<[^>]+>')
ws_collapse = re.compile(r'\s+')

def clean(text):
    """Strip HTML tags and normalize whitespace"""
    t = tag_strip.sub('', text)
    t = htmlmod.unescape(t)
    t = ws_collapse.sub(' ', t).strip()
    return t

def parse_number(s):
    """Parse a Hebrew/English number string, return float or None"""
    s = s.replace(',', '').replace(' ', '').strip()
    if not s or s == '-':
        return None
    try:
        return float(s)
    except:
        return None

def parse_int(s):
    n = parse_number(s)
    return int(n) if n is not None else None

def make_url(committee, plan):
    return BASE + '/' + quote(f'תבע/{committee}/{plan}', safe='/')

def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode('utf-8'), resp.status
    except Exception as e:
        return None, str(e)

def extract_tables(html_text):
    """Extract all tables as list of list of dicts"""
    tables = []
    for table_match in re.finditer(r'<table[^>]*>(.*?)</table>', html_text, re.DOTALL):
        table_html = table_match.group(1)
        # Get headers
        headers = [clean(h) for h in re.findall(r'<th[^>]*>(.*?)</th>', table_html, re.DOTALL)]
        # Get rows
        rows = []
        for row_match in re.finditer(r'<tr[^>]*>(.*?)</tr>', table_html, re.DOTALL):
            cells = re.findall(r'<td[^>]*>(.*?)</td>', row_match.group(1), re.DOTALL)
            if cells:
                rows.append([clean(c) for c in cells])
        tables.append({'headers': headers, 'rows': rows})
    return tables

def parse_general_info(html_text):
    """Extract key-value pairs from dt/dd elements"""
    info = {}
    for m in re.finditer(r'<dt[^>]*>(.*?)</dt>\s*<dd[^>]*>(.*?)</dd>', html_text, re.DOTALL):
        key = clean(m.group(1))
        val = clean(m.group(2))
        if key and val:
            info[key] = val
    return info

def parse_plan_purpose(html_text):
    """Extract plan purpose text"""
    m = re.search(r'מטרת התוכנית</h\d>(.*?)(?:<div|<h\d)', html_text, re.DOTALL)
    if m:
        return clean(m.group(1))
    return None

def parse_areas(tables):
    """Parse the areas summary table (ייעוד, שטח, %, מגרשים, מגורים, יח"ד)"""
    for t in tables:
        if any('% מהשטח' in h or 'מהשטח' in h for h in t['headers']):
            areas = []
            for row in t['rows']:
                if len(row) >= 3:
                    area = {
                        'yeud': row[0],
                        'shetach_dunam': parse_number(row[1]) if len(row) > 1 else None,
                        'percent': parse_number(row[2]) if len(row) > 2 else None,
                        'migrashim_count': parse_int(row[3]) if len(row) > 3 else None,
                    }
                    # Some area tables have more columns
                    if len(row) > 4:
                        area['megurim_sqm'] = parse_int(row[4])
                    if len(row) > 5:
                        area['yehidot_diur'] = parse_int(row[5])
                    areas.append(area)
            return areas
    return []

def parse_migrashim(tables):
    """Parse migrash tables (may be multiple sub-tables per yeud category)"""
    migrashim = []
    for t in tables:
        # Check if this is a migrash table (has מגרש and ייעוד columns)
        if not t['headers']:
            continue
        h = ' '.join(t['headers'])
        if 'מגרש' in h and 'ייעוד' in h and 'שטח' in h:
            # Skip if it's the areas summary table
            if '% מהשטח' in h or 'מהשטח' in h:
                continue
            for row in t['rows']:
                if len(row) >= 2 and row[0]:
                    mg = {
                        'migrash': row[0],
                        'yeud': row[1] if len(row) > 1 else '',
                        'shetach_dunam': parse_number(row[2]) if len(row) > 2 else None,
                        'megurim_sqm': parse_int(row[3]) if len(row) > 3 else None,
                        'yehidot_diur': parse_int(row[4]) if len(row) > 4 else None,
                        'lo_megurim_sqm': parse_int(row[5]) if len(row) > 5 else None,
                    }
                    migrashim.append(mg)
    return migrashim

def parse_approval_timeline(tables):
    """Parse approval timeline table (סטטוס, תאריך, הערה)"""
    for t in tables:
        h = ' '.join(t['headers'])
        if 'סטטוס' in h and 'תאריך' in h:
            # Skip document status tables
            if 'תקנון' in h or 'תשריט' in h:
                continue
            timeline = []
            for row in t['rows']:
                if len(row) >= 2:
                    entry = {
                        'status': row[0],
                        'date': row[1],
                    }
                    if len(row) > 2:
                        entry['note'] = row[2]
                    timeline.append(entry)
            return timeline
    return []

def parse_gush_helka(tables):
    """Parse gush/helka mapping table"""
    for t in tables:
        h = ' '.join(t['headers'])
        if 'גוש' in h and 'חלקה' in h and 'מגרש' not in h:
            mapping = []
            for row in t['rows']:
                if len(row) >= 2:
                    mapping.append({
                        'gush': row[0],
                        'helkot': row[1],
                    })
            return mapping
    return []

def parse_related_plans(tables):
    """Parse related plans tables (תוכניות משתנות/משנות)"""
    related = []
    for t in tables:
        h = ' '.join(t['headers'])
        if "מס' תוכנית" in h or 'תוכנית' in h and 'סוג יחס' in h:
            for row in t['rows']:
                if len(row) >= 2:
                    related.append({
                        'plan': row[0],
                        'relation_type': row[1] if len(row) > 1 else '',
                        'status': row[2] if len(row) > 2 else '',
                    })
    return related

def parse_documents(tables):
    """Parse document status table"""
    for t in tables:
        h = ' '.join(t['headers'])
        if 'תקנון' in h or 'תשריט' in h:
            docs = {}
            if t['rows']:
                row = t['rows'][0]
                for i, header in enumerate(t['headers']):
                    if i < len(row):
                        docs[header] = row[i]
            return docs
    return {}

def scrape_plan(committee, plan_name):
    """Scrape a single plan from TabaNow, return dict or None"""
    url = make_url(committee, plan_name)
    html_text, status = fetch(url)
    if not html_text or status != 200:
        return None
    
    tables = extract_tables(html_text)
    
    # Extract title (plan purpose from h2)
    title_match = re.search(r'<h2[^>]*>(.*?)</h2>', html_text, re.DOTALL)
    title = clean(title_match.group(1)) if title_match else ''
    
    result = {
        'plan_name': plan_name,
        'committee': committee,
        'title': title,
        'url': url,
        'general': parse_general_info(html_text),
        'purpose': parse_plan_purpose(html_text),
        'documents': parse_documents(tables),
        'areas': parse_areas(tables),
        'migrashim': parse_migrashim(tables),
        'approval_timeline': parse_approval_timeline(tables),
        'gush_helka': parse_gush_helka(tables),
        'related_plans': parse_related_plans(tables),
    }
    
    # Also extract any plan links for discovery
    plan_links = re.findall(r'href="(/תבע/[^"]+)"', html_text)
    plan_links += re.findall(r'href="(/%D7%AA%D7%91%D7%A2/[^"]+)"', html_text)
    result['_discovered_links'] = [unquote(l) for l in set(plan_links)]
    
    return result

def main():
    # Get all plan names from L21
    l21_path = DATA / "gisnet_layers" / "L21_P13_מספרי_מגרשים.geojson"
    with open(l21_path, 'r', encoding='utf-8') as f:
        l21 = json.load(f)
    
    plan_names = set()
    for feat in l21['features']:
        t = feat['properties'].get('TABA', '').strip()
        if t:
            plan_names.add(t)
    
    print(f"Found {len(plan_names)} unique plan names from L21")
    
    # Add known plans from related plans discovery
    extra_plans = [
        'גז/21/525', 'גז/מק/28/525', 'גז/מק/30/525',
        'גז/23/525א', 'גז/מק/32/525', 'גז/מק/34/525',
        'גז/38/525', 'על/37/525', 'על/מק/40/525',
    ]
    for p in extra_plans:
        plan_names.add(p)
    
    plan_names = sorted(plan_names)
    print(f"Total plans to try: {len(plan_names)}")
    
    all_results = {}
    found_count = 0
    errors = []
    discovered_plans = set()
    
    for i, plan in enumerate(plan_names):
        print(f"[{i+1}/{len(plan_names)}] {plan}...", end=' ', flush=True)
        result = scrape_plan(COMMITTEE, plan)
        if result:
            found_count += 1
            mg_count = len(result['migrashim'])
            area_count = len(result['areas'])
            print(f"OK ({mg_count} migrashim, {area_count} areas)")
            all_results[plan] = result
            # Collect discovered plan links
            for link in result.get('_discovered_links', []):
                # Extract plan name from link /תבע/שדות דן/xxx
                parts = link.split('/')
                if len(parts) >= 4:
                    discovered = '/'.join(parts[3:])
                    if discovered and discovered not in plan_names:
                        discovered_plans.add(discovered)
            # Also check related plans
            for rp in result.get('related_plans', []):
                rp_name = rp.get('plan', '')
                if rp_name and rp_name not in plan_names and rp_name not in all_results:
                    discovered_plans.add(rp_name)
        else:
            print("not found")
            errors.append(plan)
        
        time.sleep(0.3)  # Be polite
    
    # Try discovered plans
    if discovered_plans:
        print(f"\nDiscovered {len(discovered_plans)} additional plans from links/related:")
        for plan in sorted(discovered_plans):
            if plan in all_results or plan == 'חיפוש':
                continue
            print(f"  [extra] {plan}...", end=' ', flush=True)
            result = scrape_plan(COMMITTEE, plan)
            if result:
                found_count += 1
                mg_count = len(result['migrashim'])
                print(f"OK ({mg_count} migrashim)")
                all_results[plan] = result
            else:
                print("not found")
            time.sleep(0.3)
    
    # Summary
    total_migrashim = sum(len(r['migrashim']) for r in all_results.values())
    total_areas = sum(len(r['areas']) for r in all_results.values())
    total_gush = sum(len(r['gush_helka']) for r in all_results.values())
    
    print(f"\n{'='*60}")
    print(f"RESULTS: {found_count} plans found out of {len(plan_names)} tried")
    print(f"  Total migrashim: {total_migrashim}")
    print(f"  Total area entries: {total_areas}")
    print(f"  Total gush/helka mappings: {total_gush}")
    print(f"  Plans not found: {len(errors)}")
    if errors:
        print(f"  Not found: {errors}")
    
    # Save comprehensive data
    output = {
        'source': 'tabanow.co.il',
        'committee': COMMITTEE,
        'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S'),
        'stats': {
            'plans_found': found_count,
            'plans_tried': len(plan_names),
            'total_migrashim': total_migrashim,
            'total_areas': total_areas,
            'total_gush_helka': total_gush,
        },
        'plans': {}
    }
    
    for plan_name, result in sorted(all_results.items()):
        # Remove internal discovery data
        result.pop('_discovered_links', None)
        output['plans'][plan_name] = result
    
    out_file = DATA / 'tabanow_all_plans.json'
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\nSaved to {out_file}")
    
    # Also save a flat migrashim list for easy use
    flat_migrashim = []
    for plan_name, result in sorted(all_results.items()):
        for mg in result['migrashim']:
            mg_copy = dict(mg)
            mg_copy['plan'] = plan_name
            mg_copy['source'] = 'tabanow'
            flat_migrashim.append(mg_copy)
    
    flat_file = DATA / 'tabanow_all_migrashim.json'
    with open(flat_file, 'w', encoding='utf-8') as f:
        json.dump({
            'count': len(flat_migrashim),
            'source': 'tabanow',
            'migrashim': flat_migrashim
        }, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(flat_migrashim)} flat migrashim to {flat_file}")

if __name__ == '__main__':
    main()
