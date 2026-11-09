import {describe,expect,it} from 'vitest';
import {familyBrowseItem,findOriginalFamily,originalEditionLabel,originalFamilyHref,originalGroupCollection,originalGroupTraitCategories} from './original-product-groups';
import countEvidence from './originals-inventory-counts.json';
import {getEntryBySlug} from './wilderCollections';

const expected=[['pack-weapons',37,1104],['pack-wheels',113,113],['pack-avatars',24,788]] as const;
const variantFields=new Set(['Rarity','Primary Material','Secondary Color','Accent Color']);
const canonical=(traits:Array<{type:string;value:string}>)=>JSON.stringify([...traits].sort((a,b)=>a.type.localeCompare(b.type)||a.value.localeCompare(b.value)));

describe('complete original product grouping snapshot',()=>{
  it('preserves all 24,510 exact instance memberships with contract namespaces and source evidence',()=>{
    const globallyScoped=new Set<string>(),bareIds=new Set<string>(),familyIds=new Set<string>(),editionIds=new Set<string>();
    const failures:string[]=[];
    for(const [slug,familyCount,editionCount] of expected){
      const collection=originalGroupCollection(slug)!;
      const entry=getEntryBySlug(slug)!;
      const evidence=countEvidence.collections.find(row=>row.collection===slug)!;
      expect(collection.sourceSha256).toBe(evidence.evidenceSha256);
      expect(collection.observedAt).toBe(evidence.observedAt);
      expect(collection.families).toHaveLength(familyCount);
      expect(collection.families.reduce((sum,f)=>sum+f.variants.length,0)).toBe(editionCount);
      expect(collection.itemCount).toBe(8170);
      const scoped=new Set<string>();
      for(const family of collection.families){
        if(family.slug!==slug||family.chainId!==entry.chainId||family.chain!=='zchain'||family.contract!==entry.contract?.toLowerCase())failures.push(`namespace:${family.id}`);
        if(familyIds.has(family.id))failures.push(`duplicate-family:${family.id}`);familyIds.add(family.id);
        if(!family.sourceAssetId||!family.name||!family.variants.length)failures.push(`incomplete-family:${family.id}`);
        if(family.count!==family.variants.reduce((sum,v)=>sum+v.members.length,0))failures.push(`family-count:${family.id}`);
        const distinctTraits=new Set<string>();
        for(const edition of family.variants){
          if(editionIds.has(edition.id))failures.push(`duplicate-edition:${edition.id}`);editionIds.add(edition.id);
          if(!edition.members.length)failures.push(`empty-edition:${edition.id}`);
          if(new Set(edition.traits.map(t=>t.type)).size!==edition.traits.length)failures.push(`duplicate-trait:${edition.id}`);
          if(edition.traits.find(t=>t.type==='Item')?.value!==family.name)failures.push(`item-name:${edition.id}`);
          if(canonical(edition.traits.filter(t=>!variantFields.has(t.type)))!==canonical(family.traits))failures.push(`mixed-family:${edition.id}`);
          if(![...variantFields].every(type=>edition.traits.some(t=>t.type===type)))failures.push(`missing-finish:${edition.id}`);
          const traits=canonical(edition.traits);
          if(distinctTraits.has(traits))failures.push(`split-identical-edition:${edition.id}`);distinctTraits.add(traits);
          for(const member of edition.members){
            if(!/^(0|[1-9]\d*)$/.test(member.tokenId)||BigInt(member.tokenId)>=BigInt(2)**BigInt(256)||typeof member.tag!=='string')failures.push(`invalid-id:${edition.id}`);
            if(scoped.has(member.tokenId))failures.push(`duplicate-member:${slug}:${member.tokenId}`);scoped.add(member.tokenId);
            globallyScoped.add(`${family.chainId}:${family.contract}:${member.tokenId}`);bareIds.add(member.tokenId);
          }
        }
      }
      expect(scoped.size).toBe(collection.itemCount);
    }
    expect(failures).toEqual([]);
    expect(globallyScoped.size).toBe(24510);
    // Opened packs reuse IDs in different contracts. Token ID alone is not identity.
    expect(bareIds.size).toBeLessThan(globallyScoped.size);
  });

  it('keeps named WILD editions separate when they share the same source mesh',()=>{
    const families=originalGroupCollection('pack-weapons')!.families.filter(f=>f.sourceAssetId==='Weapon_Ranged_AR-15');
    expect(families.map(f=>f.name).sort()).toEqual(['NKR-15 S1','WILD NKR-15 S1']);
    expect(new Set(families.map(f=>f.id)).size).toBe(2);
    const editions=families.flatMap(f=>f.variants.map(v=>v.id));
    expect(new Set(editions).size).toBe(editions.length);
  });

  it('keeps identical rarity with different material/color combinations as different versions',()=>{
    const family=originalGroupCollection('pack-avatars')!.families.find(f=>f.sourceAssetId==='APLV_TM2')!;
    const common=family.variants.filter(v=>v.traits.some(t=>t.type==='Rarity'&&t.value==='Common'));
    const neoflex=common.find(v=>v.traits.some(t=>t.type==='Primary Material'&&t.value==='Neoflex'))!;
    const kevron=common.find(v=>v.traits.some(t=>t.type==='Primary Material'&&t.value==='Kevron'))!;
    expect(neoflex.id).not.toBe(kevron.id);
    expect(originalEditionLabel(neoflex)).not.toBe(originalEditionLabel(kevron));
    const tokens=new Set(neoflex.members.map(m=>m.tokenId));
    expect(kevron.members.some(m=>tokens.has(m.tokenId))).toBe(false);
  });

  it('returns only configured own-property collections and retains grouped browse identity',()=>{
    for(const slug of ['packs','wilderworld','__proto__','constructor','toString','missing']){
      expect(originalGroupCollection(slug)).toBeNull();
      expect(findOriginalFamily(slug,'anything')).toBeNull();
    }
    const family=originalGroupCollection('pack-wheels')!.families[0];
    expect(findOriginalFamily('pack-wheels',family.id)).toBe(family);
    expect(findOriginalFamily('pack-avatars',family.id)).toBeNull();
    expect(familyBrowseItem(family)).toMatchObject({contract:family.contract,chain:family.chain,sourceAssetId:family.sourceAssetId,priceEth:null,productGroup:{id:family.id,observedCount:family.count,editionCount:family.variants.length}});
    expect(originalFamilyHref('pack-wheels',family.id)).toBe(`/store/market/pack-wheels/group/${family.id}`);
  });

  it('counts facet values across every copy rather than products or visible pages',()=>{
    for(const [slug] of expected){
      const categories=originalGroupTraitCategories(slug);
      expect(categories).toHaveLength(10);
      for(const category of categories)expect(category.values.reduce((sum,v)=>sum+v.count,0)).toBe(8170);
      const family=originalGroupCollection(slug)!.families.at(-1)!;
      const item=categories.find(c=>c.type==='Item')!.values.find(v=>v.value===family.name)!;
      expect(item.count).toBe(family.count);
    }
    expect(originalGroupTraitCategories('__proto__')).toEqual([]);
  });
});
