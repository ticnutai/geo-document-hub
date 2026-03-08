"""Fix Complot SOAP calls with correct namespace."""
import requests, os

ws_url = "https://handasi.complot.co.il/wsComplotPublicData/ComplotPublicData.asmx"
ns = "https://handasi.complot.co.il"
output_dir = "data/complot_kfar_chabad"

operations = [
    ("GetTabaNumbers", "<web:site_id>31</web:site_id>"),
    ("GetTabaNames", "<web:site_id>31</web:site_id>"),
    ("GetTabaStatusTypes", "<web:site_id>31</web:site_id>"),
    ("GetTabaTypes", "<web:site_id>31</web:site_id>"),
    ("GetGushim", "<web:site_id>31</web:site_id>"),
    ("GetYeshuvim", "<web:site_id>31</web:site_id>"),
    ("GetClients", "<web:site_id>31</web:site_id>"),
    ("GetShchunot", "<web:site_id>31</web:site_id>"),
]

for op, params in operations:
    envelope = f'''<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:web="{ns}">
  <soap:Body>
    <web:{op}>
      {params}
    </web:{op}>
  </soap:Body>
</soap:Envelope>'''

    try:
        r = requests.post(ws_url, data=envelope.encode("utf-8"),
                          headers={
                              "Content-Type": "text/xml; charset=utf-8",
                              "SOAPAction": f"{ns}/{op}",
                          }, timeout=30)
        print(f"{op}: HTTP {r.status_code} ({len(r.text)} chars)")
        if r.status_code == 200 and len(r.text) > 300:
            path = os.path.join(output_dir, f"soap_{op}.xml")
            with open(path, "w", encoding="utf-8") as f:
                f.write(r.text)
            print(f"  Saved -> {path}")
        elif r.status_code != 200:
            print(f"  {r.text[:300]}")
    except Exception as e:
        print(f"{op}: Error {e}")
