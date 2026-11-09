import {describe,expect,it} from 'vitest';
import {curatedSourceProducts,findMarketProduct,featuredMaterial} from './catalog';
import {reviewedBottomwearPresentation} from './bottomwear-presentation';
import {resolveBagProduct} from '../accessories/useDemoBag';

describe('reviewed bottomwear color refresh',()=>{
  it('delivers nine distinct reviewed palettes for each requested style with a different lead color',()=>{
    const ids=['BTWR_007','BTWR_010','BTWR_010_A','BTWR_010_B','BTWR_010_C','BTWR_010_D','BTWR_010_E','BTWR_010_F','BTWR_010_G'];
    const products=ids.map(id=>findMarketProduct(id)!);
    expect(new Set(products.map(product=>featuredMaterial(product)?.name)).size).toBe(9);
    for(const product of products){
      expect(product.variants).toHaveLength(9);
      expect(new Set(product.variants.map(variant=>variant.name)).size).toBe(9);
      expect(new Set(product.variants.map(variant=>variant.image)).size).toBe(9);
      expect(product.variants.every(variant=>Boolean(variant.image)&&'renderMethod' in variant&&variant.renderMethod==='image_concept')).toBe(true);
      const source=curatedSourceProducts.find(candidate=>candidate.id===product.id)!;
      expect(product.sourceVariants).toEqual(source.variants);
      expect(product.variants.slice(0,3).map(variant=>variant.id)).toEqual(source.variants.map(variant=>variant.id));
    }
  });
  it('preserves original identifiers and photographs while replacing the displayed colors',()=>{
    const source=curatedSourceProducts.find(p=>p.id==='BTWR_007')!;
    const product=findMarketProduct(source.id)!;
    expect(product.sourceVariants).toEqual(source.variants);
    expect(product.variants.slice(0,3).map(v=>v.id)).toEqual(source.variants.map(v=>v.id));
    expect(product.variants).toHaveLength(9);
    expect(product.variants[0].name).toBe('Porcelain / Navy');
    expect(product.defaultVariantId).toBe(source.variants[0].id);
    expect(product.image).toBe(product.variants[0].image);
    expect(featuredMaterial(product)).toBe(product.variants[0]);
    expect(product.variants.slice(0,3).every(v=>!source.variants.some(original=>original.image===v.image))).toBe(true);
    expect(product.variants.every(v=>v.materialSpec?.roughness===null&&v.materialSpec?.metallic===null)).toBe(true);
    expect(product.sourceIds).toEqual(source.sourceIds);
  });
  it('requires approved original photo provenance for the replacement instead of accepting a source mismatch',()=>{
    const source=curatedSourceProducts.find(p=>p.id==='BTWR_007')!;
    const originals=source.variants.flatMap(v=>v.image?[v.image]:[]);
    expect(reviewedBottomwearPresentation(source.id,originals)?.variants).toHaveLength(3);
    expect(reviewedBottomwearPresentation(source.id,['/unrelated.webp'])).toBeUndefined();
    expect(reviewedBottomwearPresentation('unknown',originals)).toBeUndefined();
  });
  it('keeps saved bag identities but resolves the reviewed photo and color name',()=>{
    const product=findMarketProduct('BTWR_007')!;
    for(const variant of product.variants){
      const resolved=resolveBagProduct({productId:product.id,colorwayId:variant.id})!;
      expect(resolved.image).toBe(variant.image);
      expect(resolved.detail).toBe(variant.name);
      expect(resolved.href).toContain(encodeURIComponent(variant.id));
    }
  });
});
