import {describe,expect,it} from 'vitest';
import {campaignMedia,campaignScenesForProduct} from './campaign-media';
import {filterProducts,marketProducts,findMarketProduct} from './catalog';

describe('exact product object lifestyle coverage',()=>{
  it('gives every retained furniture object, sculpture and rim an assigned scene without changing material images',()=>{
    const objects=[...filterProducts(marketProducts,{department:'furniture'}),...filterProducts(marketProducts,{department:'statues'}),...filterProducts(marketProducts,{department:'rims'})];
    expect(objects).toHaveLength(46);
    for(const product of objects){
      const scenes=campaignScenesForProduct(product.id);
      expect(scenes.length,product.id).toBeGreaterThan(0);
      expect(scenes.every(scene=>scene.image!==product.image&&!product.variants.some(variant=>variant.image===scene.image)),product.id).toBe(true);
    }
  });
  it('adds seventeen reviewed scenes for forty exact products while preserving the approved rim cover',()=>{
    const scenes=Object.values(campaignMedia).flatMap(cover=>cover.series??[]).filter(scene=>scene.id?.startsWith('wiami-object-')&&!scene.id.endsWith('-v2'));
    expect(scenes).toHaveLength(17);
    expect(new Set(scenes.flatMap(scene=>scene.productIds)).size).toBe(40);
    expect(campaignMedia.rims.image).toBe('/images/marketplace/wiami-campaign-v1/rims-upright-v2.webp');
    for(const scene of scenes){
      expect(scene.kind).toBe('product-scene');
      expect(scene.productIds.every(id=>Boolean(findMarketProduct(id)))).toBe(true);
      expect(new Set(scene.productIds).size).toBe(scene.productIds.length);
    }
  });
});
