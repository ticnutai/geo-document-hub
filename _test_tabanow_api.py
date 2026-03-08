"""Quick test of TabaNow API endpoint"""
import urllib.request, json
from pathlib import Path
out = []
try:
    with urllib.request.urlopen('http://localhost:3000/api/tabanow', timeout=10) as r:
        data = json.loads(r.read())
        out.append(f'Status: OK')
        out.append(f'Plans: {len(data.get("plans", []))}')
        out.append(f'Stats: {data.get("stats", {})}')
        if data.get('plans'):
            p = data['plans'][0]
            out.append(f'First plan: {p.get("plan_name")} - {p.get("migrashim_count")} migrashim')
except Exception as e:
    out.append(f'Error: {e}')

Path('_test_api_result.txt').write_text('\n'.join(out), encoding='utf-8')
print('\n'.join(out))
