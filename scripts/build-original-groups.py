"""Build a browse-only product index from complete, provenance-preserved explorer walks."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parents[2] / 'outputs/ww-originals-grouping-20261108'
DEST = ROOT / 'src/lib/original-product-groups.snapshot.json'
VARIANT_TRAITS = {'Rarity', 'Primary Material', 'Secondary Color', 'Accent Color'}
REQUIRED = {'Industry', 'Season', 'Group', 'Category', 'Type', 'Item'} | VARIANT_TRAITS

def key(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()

def build():
    collections = {}
    for slug in ['pack-weapons', 'pack-wheels', 'pack-avatars']:
        path = SOURCE / f'{slug}-inventory.json'
        source = json.loads(path.read_text(encoding='utf-8'))
        assert source['complete'] and not source['errors'], 'Never group an incomplete inventory'
        contract = source['contract'].lower()
        families, identities = {}, set()
        for item in source['items']:
            identity = (source['chainId'], contract, item['id'])
            assert item['token']['address_hash'].lower() == contract and identity not in identities
            identities.add(identity)
            metadata = item.get('metadata') or {}
            traits = sorted([(t['trait_type'], t['value']) for t in metadata.get('attributes', [])], key=lambda t: json.dumps(t, sort_keys=True))
            names = [t[0] for t in traits]
            complete = bool(metadata.get('asset_id') and metadata.get('name') and REQUIRED.issubset(names) and len(set(names)) == len(names))
            base = [source['chainId'], contract, metadata.get('asset_id'), metadata.get('name'), [(t,v) for t,v in traits if t not in VARIANT_TRAITS]]
            # Unknown/missing metadata never gets merged speculatively.
            if not complete: base.append(item['id'])
            family_id = key(['original-family-v1', *base])
            variant_id = key(['original-edition-v1', *base, traits])
            family = families.setdefault(family_id, {'id':family_id, 'slug':slug, 'chain':'zchain', 'chainId':source['chainId'], 'contract':contract, 'sourceAssetId':metadata.get('asset_id'), 'name':metadata.get('name') or 'Original item', 'image':metadata.get('image') or item.get('image_url'), 'description':metadata.get('description') or '', 'traits':[{'type':t,'value':str(v)} for t,v in traits if t not in VARIANT_TRAITS], 'variants':{}, 'observedAt':source['finishedAt']})
            variant = family['variants'].setdefault(variant_id, {'id':variant_id, 'traits':[{'type':t,'value':str(v)} for t,v in traits], 'image':metadata.get('image') or item.get('image_url'), 'animationUrl':metadata.get('animation_url'), 'members':[]})
            variant['members'].append({'tokenId':item['id'], 'tag':str(metadata.get('tag',''))})
        for family in families.values():
            family['variants'] = sorted(family['variants'].values(), key=lambda v: v['id'])
            family['count'] = sum(len(v['members']) for v in family['variants'])
        collections[slug] = {'observedAt':source['finishedAt'], 'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(), 'itemCount':len(identities), 'families':sorted(families.values(),key=lambda f:f['name'])}
    result = {'schemaVersion':1, 'mode':'observed-catalog-snapshot', 'notSupplyCaps':True, 'notLiveListings':True, 'collections':collections}
    DEST.write_text(json.dumps(result, separators=(',',':'), ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps({slug:{'products':len(c['families']), 'variants':sum(len(f['variants']) for f in c['families']), 'items':c['itemCount']} for slug,c in collections.items()},indent=2))

if __name__ == '__main__': build()
