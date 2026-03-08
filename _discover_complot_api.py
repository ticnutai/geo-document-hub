import urllib.request, ssl, re, json, sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def fetch(url):
    req = urllib.request.Request(url, headers=headers)
    return urllib.request.urlopen(req, context=ctx, timeout=20).read().decode('utf-8')

# Step1: get page, find scripts
html = fetch('https://sdan.complot.co.il/gush2/')
scripts = re.findall(r'src="([^"]+)"', html)
with open('_complot_discovery.txt', 'w', encoding='utf-8') as out:
    out.write(f"Scripts ({len(scripts)}):\n")
    for s in scripts:
        out.write(f"  {s}\n")
    
    # Fetch JS bundles
    for s in scripts:
        if not s.endswith('.js'):
            continue
        full = s if s.startswith('http') else f'https://sdan.complot.co.il{s}'
        out.write(f"\n--- JS: {full} ---\n")
        try:
            js = fetch(full)
            out.write(f"  Size: {len(js)}\n")
            # Find API URL patterns
            apis = re.findall(r'["\'](/(?:api|ws|services?|data|gush|chelka)[^"\']{3,100})["\']', js, re.I)
            apis += re.findall(r'["\']([^"\']*(?:GetChelka|getChelka|GetGush|getGush|GetInfo|getUnified|GetMigrash|getMigrash)[^"\']*)["\']', js, re.I)
            apis += re.findall(r'["\']([^"\']*(?:WCF|asmx|ashx|svc|aspx)[^"\']*)["\']', js, re.I)
            unique = sorted(set(apis))
            out.write(f"  API patterns ({len(unique)}):\n")
            for a in unique:
                out.write(f"    {a}\n")
        except Exception as e:
            out.write(f"  Error: {e}\n")
    
    # Also search inline scripts in HTML
    inline_js = re.findall(r'<script[^>]*>(.*?)</script>', html, re.S)
    out.write(f"\nInline scripts: {len(inline_js)}\n")
    for i, js in enumerate(inline_js):
        if len(js.strip()) > 0:
            out.write(f"\n--- Inline script {i} ({len(js)} bytes) ---\n")
            out.write(js[:3000])
            out.write("\n")

print("Done - check _complot_discovery.txt")
