import re, sys, json
sys.stdout.reconfigure(encoding='utf-8')
with open('_mavat_main.js','r',encoding='utf-8') as f:
    js = f.read()

# Print the plans model constructor
print(js[1661300:1662800])
print("\n\n===== getSelectedModelParams =====")
# Find getSelectedModelParams
idx = js.find('getSelectedModelParams')
print(js[idx:idx+500])
