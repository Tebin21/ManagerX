import json

with open('/Users/tebin_faruq/.gemini/antigravity/brain/1b72c913-7fc3-47e5-bd7b-7c75b28d4091/scratch/receipt_pairs.json') as f:
    pairs = json.load(f)

# Let's inspect all pairs to create the complete dictionary
print(f"Loaded {len(pairs)} pairs")
