import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {originalGroupCollection,originalEditionLabel,originalFamilyHref} from '../original-product-groups';
import {knownProductVariant,knownReviewProductVariant,LOCAL_SEED_ITEMS} from './catalog';
import identities from './original-review-identities.json';

describe('grouped original review identities',()=>{
  it('exactly covers the authoritative family/edition snapshot without granting inventory identity',()=>{
    const source=readFileSync('src/lib/original-product-groups.snapshot.json');
    expect(identities.sourceSha256).toBe(createHash('sha256').update(source).digest('hex'));
    const expected=Object.fromEntries(['pack-weapons','pack-wheels','pack-avatars'].flatMap(slug=>originalGroupCollection(slug)!.families.map(family=>[
      `original-family:${family.chainId}:${family.contract}:${family.id}`,family.variants.map(variant=>variant.id),
    ])));
    expect(identities.families).toEqual(expected);
    const expectedPresentation=Object.fromEntries(['pack-weapons','pack-wheels','pack-avatars'].flatMap(slug=>originalGroupCollection(slug)!.families.map(family=>[
      `original-family:${family.chainId}:${family.contract}:${family.id}`,{name:family.name,href:originalFamilyHref(slug,family.id),editionLabels:family.variants.map(originalEditionLabel)},
    ])));
    expect(identities.presentation).toEqual(expectedPresentation);
    expect(Object.keys(expected)).toHaveLength(174);
    expect(Object.values(expected).flat()).toHaveLength(2005);
    for(const [productId,variants] of Object.entries(expected)){
      expect(knownReviewProductVariant(productId)).toBe(true);
      expect(knownProductVariant(productId)).toBe(false);
      for(const variantId of variants){expect(knownReviewProductVariant(productId,variantId)).toBe(true);expect(knownProductVariant(productId,variantId)).toBe(false);}
    }
  });

  it('rejects unknown families, namespaces and editions from another family',()=>{
    const [[productId,variants],[,otherVariants]]=Object.entries(identities.families);
    for(const id of ['original-family:unknown',productId.replace(':9369:',':1:'),productId.toUpperCase(),'__proto__','constructor'])expect(knownReviewProductVariant(id,variants[0])).toBe(false);
    expect(knownReviewProductVariant(productId,otherVariants[0])).toBe(false);
    expect(knownReviewProductVariant(productId,'unknown-edition')).toBe(false);
    expect(knownReviewProductVariant(productId,'')).toBe(false);
    for(const item of LOCAL_SEED_ITEMS){expect(knownReviewProductVariant(item.productId,item.variantId)).toBe(true);expect(knownProductVariant(item.productId,item.variantId)).toBe(true);}
  });
});
