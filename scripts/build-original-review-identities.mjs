import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Review subjects only. This index never seeds inventory or authorizes trading.
const source=new URL('../src/lib/original-product-groups.snapshot.json',import.meta.url);
const raw=readFileSync(source);
const snapshot=JSON.parse(raw);
const families=Object.fromEntries(Object.values(snapshot.collections).flatMap(collection=>collection.families.map(family=>[
  `original-family:${family.chainId}:${family.contract}:${family.id}`,
  family.variants.map(variant=>variant.id),
])));
const presentation=Object.fromEntries(Object.values(snapshot.collections).flatMap(collection=>collection.families.map(family=>[
  `original-family:${family.chainId}:${family.contract}:${family.id}`,
  {name:family.name,href:`/store/market/${encodeURIComponent(family.slug)}/group/${encodeURIComponent(family.id)}`,
    // Parallel labels avoid duplicating the 2,005 edition keys in this compact index.
    editionLabels:family.variants.map(variant=>['Rarity','Primary Material','Secondary Color','Accent Color'].map(type=>variant.traits.find(trait=>trait.type===type)?.value).filter(Boolean).join(' · '))},
])));
const output={schemaVersion:2,scope:'review-subjects-only-no-inventory-or-trading',source:'src/lib/original-product-groups.snapshot.json',sourceSha256:createHash('sha256').update(raw).digest('hex'),families,presentation};
writeFileSync(new URL('../src/lib/store-backend/original-review-identities.json',import.meta.url),JSON.stringify(output)+'\n');
console.log(`Indexed ${Object.keys(families).length} review families and ${Object.values(families).reduce((sum,ids)=>sum+ids.length,0)} edition identities. No inventory created.`);
