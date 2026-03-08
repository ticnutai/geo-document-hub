"""Parse Complot SOAP responses and fetch plan details for כפר חב"ד."""
import requests, os, json, re, time
from xml.etree import ElementTree as ET

ws_url = "https://handasi.complot.co.il/wsComplotPublicData/ComplotPublicData.asmx"
ns = "https://handasi.complot.co.il"
output_dir = "data/complot_kfar_chabad"


def parse_returned_items(xml_text, result_tag):
    """Parse SOAP response containing ArrayOfReturnedItem."""
    root = ET.fromstring(xml_text)
    items = []
    for item in root.iter():
        if item.tag.endswith("ReturnedItem"):
            entry = {}
            for child in item:
                tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                entry[tag] = child.text
            items.append(entry)
    return items


def soap_call(op, params_xml):
    """Make a SOAP call and return response text."""
    envelope = f'''<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:web="{ns}">
  <soap:Body>
    <web:{op}>
      {params_xml}
    </web:{op}>
  </soap:Body>
</soap:Envelope>'''
    r = requests.post(ws_url, data=envelope.encode("utf-8"),
                      headers={
                          "Content-Type": "text/xml; charset=utf-8",
                          "SOAPAction": f"{ns}/{op}",
                      }, timeout=60)
    return r


def main():
    # Parse existing SOAP responses
    print("=" * 60)
    print("Parsing SOAP responses...")
    print("=" * 60)

    results = {}
    for fname in os.listdir(output_dir):
        if fname.startswith("soap_") and fname.endswith(".xml"):
            op_name = fname[5:-4]
            path = os.path.join(output_dir, fname)
            with open(path, "r", encoding="utf-8") as f:
                xml_text = f.read()
            items = parse_returned_items(xml_text, op_name)
            results[op_name] = items
            print(f"  {op_name}: {len(items)} items")

    # Save parsed results
    path = os.path.join(output_dir, "complot_parsed.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    size_kb = os.path.getsize(path) / 1024
    print(f"\nSaved parsed data → {path} ({size_kb:.0f} KB)")

    # Show sample plan numbers
    taba_numbers = results.get("GetTabaNumbers", [])
    taba_names = results.get("GetTabaNames", [])
    print(f"\nTotal plans (numbers): {len(taba_numbers)}")
    print(f"Total plans (names): {len(taba_names)}")

    if taba_numbers:
        print("\nSample plans:")
        for t in taba_numbers[:10]:
            print(f"  {t}")

    # Now fetch individual plan details using GetBakashot
    # Check WSDL for GetBakashot params
    with open(os.path.join(output_dir, "complot_wsdl.xml"), "r", encoding="utf-8") as f:
        wsdl = f.read()

    # Find GetBakashot params
    idx = wsdl.find("GetBakashot")
    if idx > 0:
        context = wsdl[idx:idx+800]
        print(f"\nGetBakashot context:\n{context}")

    # Try GetBakashot with site_id and taba_num
    print("\n" + "=" * 60)
    print("Fetching plan details (GetBakashot)...")
    print("=" * 60)

    all_bakashot = []
    sample_plans = [t.get("Value", t.get("Key", "")) for t in taba_numbers[:5]]

    for taba_num in sample_plans:
        if not taba_num:
            continue
        print(f"\n  Plan: {taba_num}")
        params = f"<web:site_id>31</web:site_id><web:taba_number>{taba_num}</web:taba_number>"
        try:
            r = soap_call("GetBakashot", params)
            print(f"    HTTP {r.status_code} ({len(r.text)} chars)")
            if r.status_code == 200 and len(r.text) > 300:
                items = parse_returned_items(r.text, "GetBakashot")
                print(f"    Parsed: {len(items)} items")
                if items:
                    print(f"    Sample: {items[0]}")
                    all_bakashot.extend(items)
                    # Save individual response
                    path = os.path.join(output_dir, f"bakashot_{taba_num}.xml")
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(r.text)
        except Exception as e:
            print(f"    Error: {e}")
        time.sleep(0.5)

    if all_bakashot:
        path = os.path.join(output_dir, "complot_bakashot_sample.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(all_bakashot, f, ensure_ascii=False, indent=2)
        print(f"\nSaved {len(all_bakashot)} bakashot → {path}")

    # Try GetPikuachNumbers  
    print("\n" + "=" * 60)
    print("Fetching Pikuach Numbers...")
    print("=" * 60)
    try:
        params = "<web:site_id>31</web:site_id>"
        r = soap_call("GetPikuachNumbers", params)
        print(f"  HTTP {r.status_code} ({len(r.text)} chars)")
        if r.status_code == 200 and len(r.text) > 300:
            items = parse_returned_items(r.text, "GetPikuachNumbers")
            print(f"  Parsed: {len(items)} items")
            path = os.path.join(output_dir, "soap_GetPikuachNumbers.xml")
            with open(path, "w", encoding="utf-8") as f:
                f.write(r.text)
            results["GetPikuachNumbers"] = items
    except Exception as e:
        print(f"  Error: {e}")

    # Try GetBakashotInMeeting
    print("\n" + "=" * 60)
    print("Fetching BakashotInMeeting...")
    print("=" * 60)
    try:
        params = "<web:site_id>31</web:site_id>"
        r = soap_call("GetBakashotInMeeting", params)
        print(f"  HTTP {r.status_code} ({len(r.text)} chars)")
        if r.status_code == 200 and len(r.text) > 300:
            items = parse_returned_items(r.text, "GetBakashotInMeeting")
            print(f"  Parsed: {len(items)} items")
            path = os.path.join(output_dir, "soap_GetBakashotInMeeting.xml")
            with open(path, "w", encoding="utf-8") as f:
                f.write(r.text)
    except Exception as e:
        print(f"  Error: {e}")

    # Save updated parsed results
    path = os.path.join(output_dir, "complot_parsed.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    size_kb = os.path.getsize(path) / 1024
    print(f"\nFinal parsed data → {path} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
