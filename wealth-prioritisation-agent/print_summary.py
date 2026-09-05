import json

with open(r'C:\Users\Lenovo\Desktop\Personal Project\Singhacks\wealth-prioritisation-agent\output\bundling_recommendations.json') as f:
    data = json.load(f)

for r in data['client_recommendations']:
    primary = r['primary_bundle']
    comps = ', '.join([c['bundle_name'] for c in r['complementary_bundles']])
    print(f"{r['client_id']} | {r['name']:<30} | AUM: ${r['aum_usd']:>12,.0f} | Primary: {primary['bundle_name']} (score: {primary['fit_score']}) | Complementary: {comps}")