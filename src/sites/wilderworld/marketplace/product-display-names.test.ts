import { describe, expect, it } from 'vitest';
import names from './product-display-names.json';
import registry from '../collections/registry.json';
import { registryProducts } from '../collections/store-registry';
import { marketProducts } from './catalog';
import { productDisplayName } from './product-display-names';

describe('custom rim and sculpture names',()=>{
  it('covers every retained rim and sculpture with one unique display name',()=>{
    const scoped=marketProducts.filter(p=>p.subcategory==='rims'||p.department==='statues');
    expect(scoped).toHaveLength(23);
    expect(scoped.filter(p=>p.subcategory==='rims')).toHaveLength(8);
    expect(scoped.every(p=>Object.hasOwn(names.products,p.id))).toBe(true);
    expect(new Set(scoped.map(p=>p.name)).size).toBe(23);
    expect(marketProducts.find(product=>product.id==='guild-memelord')?.name).toBe('The Meme Lord');
    expect(names.products['guild-memelord'].sourceName).toBe('Memelord');
    expect(scoped.every(p=>p.name!==names.products[p.id as keyof typeof names.products].sourceName)).toBe(true);
  });
  it('keeps source identifiers and token data while registry display names change',()=>{
    for(const source of registry.products.filter(p=>p.id.startsWith('rim-preview-'))){
      const current=registryProducts.find(p=>p.id===source.id)!;
      expect({...current,name:source.name}).toEqual(source);
      expect(current.name).toBe(productDisplayName(source.id,source.name));
      const displayed=marketProducts.find(p=>p.id===source.id)!;
      expect(displayed.sourceIds).toEqual(source.sourceIds);
      expect(displayed.sourceAssets).toEqual(source.sourceAssets);
    }
  });
  it('does not rename unknown or excluded products by inference',()=>{
    expect(productDisplayName('rim-modular-f1-road','Original source name')).toBe('Original source name');
    expect(productDisplayName('unrelated-product','Original')).toBe('Original');
  });
});
