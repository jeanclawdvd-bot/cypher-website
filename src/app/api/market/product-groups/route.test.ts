import {describe,expect,it} from 'vitest';
import {GET} from './route';
import {originalGroupCollection,originalGroupTraitCategories} from '@/lib/original-product-groups';
import type {MarketNft} from '@/lib/opensea';
import type {TraitCategory} from '@/app/api/market/traits/route';
import {originalItemHref} from '@/app/store/market/originals';

type Page={items:MarketNft[];next:string|null;totalProducts:number;totalObservedItems:number;mode:string;observedAt:string;traitCategories:TraitCategory[]};
const request=(params:Record<string,string>)=>new Request('http://localhost/api/market/product-groups?'+new URLSearchParams(params));
async function page(params:Record<string,string>){const response=await GET(request(params));expect(response.status).toBe(200);return response.json() as Promise<Page>;}

describe('grouped original catalog API',()=>{
  it('paginates the entire catalog exactly once, retaining stable snapshot quantities',async()=>{
    const collection=originalGroupCollection('pack-wheels')!;
    const seen:string[]=[];
    let cursor:string|null=null,pages=0;
    do{
      const result=await page({slug:'pack-wheels',...(cursor?{next:cursor}:{})});
      expect(result.items.length).toBeLessThanOrEqual(24);
      expect(result).toMatchObject({totalProducts:113,totalObservedItems:8170,mode:'catalog-snapshot',observedAt:collection.observedAt});
      seen.push(...result.items.map(item=>item.productGroup!.id));cursor=result.next;pages++;
      expect(pages).toBeLessThan(10);
    }while(cursor);
    expect(pages).toBe(5);
    expect(new Set(seen).size).toBe(113);
    expect(seen).toEqual(collection.families.map(f=>f.id));
    expect((await page({slug:'pack-wheels',next:'113'})).items).toEqual([]);
  });

  it('searches and sorts the complete catalog before pagination, including late-page products',async()=>{
    const source=originalGroupCollection('pack-wheels')!.families;
    const target=source.at(-1)!;
    expect(source.findIndex(f=>f.id===target.id)).toBeGreaterThan(24);
    const result=await page({slug:'pack-wheels',q:`  ${target.name.toUpperCase()}  `});
    expect(result.totalProducts).toBe(1);
    expect(result.items[0].productGroup?.id).toBe(target.id);
    const named=await page({slug:'pack-wheels',sort:'name',next:'24'});
    expect(named.items.map(item=>item.name)).toEqual([...source].sort((a,b)=>a.name.localeCompare(b.name)).slice(24,48).map(f=>f.name));
    expect((await page({slug:'pack-wheels',q:'no matching model anywhere'})).totalProducts).toBe(0);
  });

  it('requires the same version to match query plus filters and ANDs different trait types',async()=>{
    const family=originalGroupCollection('pack-weapons')!.families.find(f=>f.name==='AR-AM S1')!;
    const rare=await page({slug:'pack-weapons',q:'Aluminum',attributes:JSON.stringify({Rarity:['Rare']})});
    expect(rare.items.some(item=>item.productGroup?.id===family.id)).toBe(false);
    const impossible=await page({slug:'pack-weapons',q:'AR-AM S1',attributes:JSON.stringify({'Primary Material':['Aluminum'],Rarity:['Rare']})});
    expect(impossible.totalProducts).toBe(0);
    const valid=await page({slug:'pack-weapons',q:'AR-AM S1',attributes:JSON.stringify({'Primary Material':['Aluminum'],Rarity:['Common','Rare']})});
    expect(valid.items.map(item=>item.productGroup?.id)).toEqual([family.id]);
    expect((await page({slug:'pack-weapons',attributes:JSON.stringify({Unknown:['missing']})})).totalProducts).toBe(0);
    expect((await page({slug:'pack-weapons',attributes:JSON.stringify({Rarity:[]})})).totalProducts).toBe(37);
  });

  it('provides complete, copy-weighted facets independent of search, filters, and page',async()=>{
    const full=await page({slug:'pack-weapons'});
    const filtered=await page({slug:'pack-weapons',q:'Aluminum',next:'24',attributes:JSON.stringify({Rarity:['Common']})});
    expect(filtered.traitCategories).toEqual(full.traitCategories);
    expect(full.traitCategories).toEqual(originalGroupTraitCategories('pack-weapons'));
    expect(full.traitCategories.find(t=>t.type==='Rarity')!.values.reduce((sum,v)=>sum+v.count,0)).toBe(8170);
    expect(full.traitCategories.find(t=>t.type==='Item')!.values.length).toBe(37);
  });

  it('opens the exact matching finish from filtered cards without shrinking family counts',async()=>{
    const family=originalGroupCollection('pack-weapons')!.families.find(f=>f.variants.length>1)!;
    const edition=family.variants.at(-1)!;
    const attributes=Object.fromEntries(edition.traits.filter(trait=>['Rarity','Primary Material','Secondary Color','Accent Color'].includes(trait.type)).map(trait=>[trait.type,[trait.value]]));
    const result=await page({slug:family.slug,q:family.name,attributes:JSON.stringify(attributes)});
    const item=result.items.find(item=>item.productGroup?.id===family.id)!;
    expect(item).toMatchObject({identifier:edition.members[0].tokenId,image:edition.image,traits:edition.traits,productGroup:{id:family.id,selectedEditionId:edition.id,editionCount:family.variants.length,observedCount:family.count}});
    expect(item.productGroup!.selectedEditionId).not.toBe(family.variants[0].id);
    const href=new URL(originalItemHref(family.slug,item),'http://localhost');
    expect(href.pathname).toBe(`/store/market/${family.slug}/group/${family.id}`);
    expect(href.searchParams.get('variant')).toBe(edition.id);
    expect(result.totalObservedItems).toBe(8170);
  });

  it('rejects unsupported and inherited collection names without throwing',async()=>{
    for(const slug of ['', 'packs','wilderworld','missing','__proto__','constructor','toString'])expect((await GET(request({slug}))).status).toBe(404);
  });

  it('rejects noncanonical, unsafe, or negative cursors and malformed filters',async()=>{
    for(const next of ['', '-1','1.5','NaN','Infinity','9007199254740992','0x10','1e2',' 24','+24','024'])expect((await GET(request({slug:'pack-weapons',next}))).status).toBe(400);
    for(const attributes of ['{','[]','null','42','{"Rarity":"Rare"}','{"Rarity":[1]}','{"Rarity":[{}]}'])expect((await GET(request({slug:'pack-weapons',attributes}))).status).toBe(400);
  });
});
