import { describe,it,expect } from 'vitest';
import { marketProducts,browseProducts,filterProducts,findMarketProduct } from './catalog';
import { clothingFit,clothingFitFamilies,groupClothingStyles } from './clothing-fit';
import { resolveBagProduct } from '../accessories/useDemoBag';

describe('fit-specific catalog identities',()=>{
  it('groups only the ten reviewed pairs without deleting any of the 166 clothing SKUs',()=>{
    expect(clothingFitFamilies).toHaveLength(10);
    expect(filterProducts(marketProducts,{department:'clothing'})).toHaveLength(166);
    expect(browseProducts(marketProducts,{department:'clothing'})).toHaveLength(156);
    expect(browseProducts(marketProducts,{})).toHaveLength(211);
    for(const family of clothingFitFamilies){
      const products=family.fits.map(fit=>findMarketProduct(fit.productId)!);
      expect(products.every(Boolean)).toBe(true);
      expect(groupClothingStyles(products)).toHaveLength(1);
      const ids=products.flatMap(product=>product.variants.map(v=>v.id));
      expect(ids).toHaveLength(18);expect(new Set(ids).size).toBe(18);
      for(const product of products){
        const variant=product.variants[8];
        const bag=resolveBagProduct({productId:product.id,colorwayId:variant.id});
        expect(bag?.href).toContain(product.id);expect(bag?.href).toContain(variant.id);
      }
    }
  });
  it('uses the selected fit before grouping and never guesses from a suffix',()=>{
    expect(browseProducts(marketProducts,{department:'clothing',gender:'Women'}).some(p=>p.id==='BTWR_001_F')).toBe(true);
    expect(browseProducts(marketProducts,{department:'clothing',gender:'Women'}).some(p=>p.id==='BTWR_001')).toBe(false);
    expect(clothingFit('JCKT_001_F')).toEqual({fits:[],basis:'unconfirmed'});
    expect(clothingFit('BTWR_001_A').fits).toEqual(['Men','Women']);
    expect(clothingFit('HDWR_011_A').fits).toEqual([]);
    expect(browseProducts(marketProducts,{query:'BTWR_002_A_F'}).map(p=>p.id)).toContain('BTWR_002_A_F');
  });
  it('keeps separate designs, exclusions and restored female cuts intact',()=>{
    const ids=browseProducts(marketProducts,{department:'clothing'}).map(p=>p.id);
    for(const id of ['BTWR_001_A','BTWR_001_B','TPWR_003','TPWR_003_A','TPWR_003_F','BTWR_003_F','TPWR_005','TPWR_006','FTWR_004_A'])expect(ids).toContain(id);
    for(const id of ['FTWR_004','BTWR_003','FTWR_002_A','FTWR_003_A'])expect(findMarketProduct(id)).toBeUndefined();
    expect(new Set(marketProducts.flatMap(p=>p.variants.map(v=>v.id))).size).toBe(1989);
  });
});
