import json

with open('/Users/tebin_faruq/.gemini/antigravity/brain/1b72c913-7fc3-47e5-bd7b-7c75b28d4091/scratch/receipt_pairs.json') as f:
    pairs = json.load(f)

for i, p in enumerate(pairs):
    print(f"[{i}] KU: {p['ku']} || EN: {p['en']}")
