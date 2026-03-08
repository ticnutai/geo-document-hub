import json, os
f = 'data/docs/_new_plans_progress.json'
if os.path.exists(f):
    d = json.load(open(f, 'r', encoding='utf-8'))
    print(f'Plans processed: {len(d)}')
    for p in d:
        plan = p.get("plan", "?")
        dl = p.get("downloaded", 0) 
        fail = p.get("failed", 0)
        skip = p.get("skipped", 0)
        warn = p.get("warning", "")
        err = p.get("error", "")[:60] if "error" in p else ""
        status = p.get("status", "")
        print(f'  {plan}: dl={dl} fail={fail} skip={skip} {warn} {err} {status}')
else:
    print('Progress file not yet created')
