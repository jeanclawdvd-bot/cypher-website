import { describe, expect, it } from 'vitest';
import evidence from '../accessories/female-source-evidence.json';
import historicalGenderFit from '../accessories/gender-fit.json';
import { excludedFamilies } from '../accessories/merchandising';
import { findMarketProduct, filterProducts, marketProducts } from './catalog';
import restored from './female-restorations.json';

describe('female source identity and narrow restorations',()=>{
 it('labels distinct reviewed female cuts without changing historical compatibility',()=>{
  expect(Object.keys(evidence)).toHaveLength(12);
  for(const [id,row] of Object.entries(evidence)){
   expect(findMarketProduct(id)?.gender,id).toBe('Women');
   expect(row.sourceAssets.every(asset=>asset.includes('/Human/Female/')),id).toBe(true);
   expect(row.rawAvatarCompatibility).toEqual(historicalGenderFit[id as keyof typeof historicalGenderFit].raw_avatar_compatibility);
  }
 });
 it('restores only the three specifically reviewed distinct cuts with unresolved commerce',()=>{
  expect(restored.products.map(p=>p.id)).toEqual(['BTWR_003_F','TPWR_005','TPWR_006']);
  for(const row of restored.products){
   const product=findMarketProduct(row.id)!;
   expect(product.gender).toBe('Women');expect(product.priceCents).toBe(row.id==='BTWR_003_F'?700:500);
   expect(row.priceCents).toBeNull(); // Historical restoration evidence is unchanged.
   expect(product.sourceIds).toEqual([row.id]);expect(product.variants).toHaveLength(9);
   expect(product.plannedVariants).toHaveLength(9);expect(row.purchaseEnabled).toBe(false);
   expect(Object.values(row.onchain)).toEqual([null,null,null]);
   expect(filterProducts(marketProducts,{gender:'Women'}).some(p=>p.id===row.id)).toBe(true);
   expect(excludedFamilies.has(row.id==='BTWR_003_F'?'BTWR_003':row.id)).toBe(true);
  }
  expect(findMarketProduct('BTWR_003')).toBeUndefined();
  expect(findMarketProduct('FTWR_002_A')).toBeUndefined();
  expect(findMarketProduct('FTWR_003_A')).toBeUndefined();
 });
 it('does not infer female identity merely from a trailing F',()=>{
  for(const id of ['BTWR_010_F','JCKT_001_F','JCKT_002_F','JCKT_N30_F','TPWR_002_A_F','TPWR_002_F'])expect(id in evidence).toBe(false);
 });
});
