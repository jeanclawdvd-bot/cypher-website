import {describe,expect,it} from 'vitest';
import {marketProducts} from './catalog';
import {getProductGameDetails} from './product-game-details';
import legacyRegistry from '../collections/registry.json';

describe('evidence-based product game details',()=>{
  it('covers retained products without converting source evidence into a live release',()=>{
    for(const product of marketProducts){
      const details=getProductGameDetails(product.id)!;
      expect(details,product.id).toBeDefined();
      expect(details.readiness.live).toBe(false);
      expect(details.readiness.gameReady).toBeNull();
      expect(details.badges.some(b=>/game ready/i.test(b.label))).toBe(false);
      expect(details.pending.length).toBeGreaterThan(0);
      expect(details.traceability.sourceIds).toEqual(product.sourceIds);
    }
    expect(getProductGameDetails('missing')).toBeUndefined();
    expect(getProductGameDetails('vehicle-preview-temerario')).toBeUndefined();
  });
  it('uses exact avatar flags, verified human labels and raw traceability without inheriting parent fits',()=>{
    const exact=getProductGameDetails('BTWR_001')!;
    expect(exact.traceability.assetStatus).toBe('identified');
    expect(exact.compatibility.scope).toBe('Exact source record');
    expect(exact.compatibility.supportedFits).toEqual(['Male human avatar','Female human avatar']);
    expect(exact.traceability.recordedAvatarFlags).toMatchObject({HM:true,HF:true,WM:true});
    expect(exact.traceability.evidenceReferences.some(path=>path.endsWith('DT_AvatarMeshes.json'))).toBe(true);
    const femaleSource=getProductGameDetails('BTWR_001_F')!;
    expect(femaleSource.traceability.assetStatus).toBe('identified');
    expect(femaleSource.compatibility.supportedFits).toEqual([]);
    expect(femaleSource.compatibility.scope).toBe('Family evidence only');
    expect(femaleSource.badges.some(b=>b.label==='Compatibility recorded')).toBe(false);
  });
  it('preserves negative accessory-combination evidence and keeps proposed colors distinct from entitlements',()=>{
    const helmet=getProductGameDetails('HDWR_001_A')!;
    expect(helmet.compatibility.supportedFits).toEqual(['Glasses','Masks']);
    expect(helmet.compatibility.unsupportedFits).toEqual(['Headphones']);
    expect(helmet.colorPolicy).toContain('one selected, approved color');
    expect(helmet.colorPolicy).toContain('do not prove');
    expect(getProductGameDetails('SUIT_001')!.includedContents).toContain('Shoes and gloves are separate products.');
  });
  it('does not turn rim source names or a four-wheel proposal into approved fit or contents',()=>{
    const rim=getProductGameDetails('rim-preview-wertone-wantide-2010')!;
    expect(rim.itemTypeLabel).toBe('Digital rim set');
    expect(rim.compatibility.supportedFits).toEqual([]);
    expect(rim.compatibility.summary).toContain('Wertone Wantide 2010');
    expect(rim.compatibility.summary).toContain('do not certify fit');
    expect(rim.includedContents.join(' ')).toContain('Final set quantity');
    expect(rim.includedContents.join(' ')).not.toMatch(/four|4 rims/i);
    expect(rim.ownership.limitations.join(' ')).toContain('independently transferred');
  });
  it('separates saved furniture placements from eligibility and property rights',()=>{
    const chair=getProductGameDetails('furniture-chair')!;
    expect(chair.badges.some(b=>b.label==='Scene use recorded')).toBe(true);
    expect(chair.compatibility.summary).toContain('saved apartment scene');
    expect(chair.compatibility.summary).toContain('remain unapproved');
    expect(chair.includedContents.join(' ')).toContain('business permissions are not included');
    expect(chair.ownership.limitations.join(' ')).toContain('Pickup and transfer');
  });
  it('keeps removed Trinity and chain styles out of the store without granting remint rights',()=>{
    expect(getProductGameDetails('totem-trinity-legacy')).toBeUndefined();
    const legacy=legacyRegistry.products.find(product=>product.id==='totem-trinity-legacy')!;
    expect(legacy.legacy?.remintAllowed).toBe(false);
    expect(legacy.legacy?.newIssuanceAllowed).toBe(false);
    expect(getProductGameDetails('totem-chain-jwlr-002')).toBeUndefined();
    expect(getProductGameDetails('totem-chain-jwlr-002-a')).toBeUndefined();
  });
  it('does not infer native game binding for presentation-only cars or unresolved clothing styles',()=>{
    expect(getProductGameDetails('vehicle-ghostline')!.traceability.assetStatus).toBe('unverified');
    expect(getProductGameDetails('vehicle-ghostline')!.compatibility.summary).toContain('not yet bound');
    expect(getProductGameDetails('JCKT_005')!.traceability.assetStatus).toBe('unverified');
  });
  it('recognizes restored female source meshes without inferring supported fits from the folder or storefront gender',()=>{
    for(const id of ['BTWR_003_F','TPWR_005','TPWR_006']){
      const details=getProductGameDetails(id)!;
      expect(details.traceability.assetStatus).toBe('identified');
      expect(details.traceability.sourceIds).toEqual([id]);
      expect(details.traceability.recordedAvatarFlags).toEqual({});
      expect(details.compatibility.supportedFits).toEqual([]);
      expect(details.compatibility.scope).toBe('Exact fit unconfirmed');
      expect(details.badges.some(b=>b.label==='Compatibility recorded')).toBe(false);
      expect(details.readiness).toMatchObject({live:false,gameReady:null});
    }
  });
});
