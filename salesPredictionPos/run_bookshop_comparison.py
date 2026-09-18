import os
import json
import urllib.request
import urllib.error

# Look for payload file
possible_paths = [
    r"C:\Users\Prasantha\Downloads\bookshop_feature_comparison_payload.json",
    r"D:\SalePredictionPos\salesPredictionPos\bookshop_feature_comparison_payload.json",
    r"D:\SalePredictionPos\bookshop_feature_comparison_payload.json",
]

payload_path = None
for p in possible_paths:
    if os.path.exists(p):
        payload_path = p
        break

if not payload_path:
    print(f"Error: Payload file not found in: {possible_paths}")
    exit(1)

print(f"Found payload at: {payload_path} ({os.path.getsize(payload_path)} bytes)")

with open(payload_path, "r", encoding="utf-8") as f:
    payload_data = json.load(f)

history_len = len(payload_data.get("history", []))
print(f"Loaded payload with {history_len} history items.")

url = "http://127.0.0.1:8001/evaluate/feature-comparison"
req_data = json.dumps(payload_data).encode("utf-8")
req = urllib.request.Request(
    url,
    data=req_data,
    headers={"Content-Type": "application/json"}
)

print(f"POSTing to {url}...")
try:
    with urllib.request.urlopen(req, timeout=300) as response:
        resp_bytes = response.read()
        resp_json = json.loads(resp_bytes.decode("utf-8"))
        
        # Save output in project root and salesPredictionPos
        out_paths = [
            r"D:\SalePredictionPos\salesPredictionPos\bookshop_feature_comparison_result.json",
            r"D:\SalePredictionPos\bookshop_feature_comparison_result.json"
        ]
        for op in out_paths:
            try:
                with open(op, "w", encoding="utf-8") as out_f:
                    json.dump(resp_json, out_f, indent=2)
                print(f"Saved response to: {op}")
            except Exception as ex:
                print(f"Could not save to {op}: {ex}")

        print("\n--- FULL RESPONSE JSON ---")
        print(json.dumps(resp_json, indent=2))

except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
