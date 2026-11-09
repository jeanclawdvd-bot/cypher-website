import { describe, expect, it } from 'vitest';
import { applyMaterialConcepts, isReviewedClothingReferenceEdit, materialConceptsFor } from './material-variants';

describe('material concept catalog', () => {
  it('keeps existing clothing identities and never substitutes a base photo for a pending render', () => {
    const source = { id: 'test-shirt', department: 'clothing', subcategory: 'topwear', image: '/base.webp', status: 'Color concepts', variants: [1,2,3].map(n=>({id:`EXISTING-${n}`,name:`Existing ${n}`,image:`/${n}.webp`,swatch:'#334455',status:'Color concept'})) };
    const result=applyMaterialConcepts(source);
    expect(result.variants).toHaveLength(3);
    expect(result.plannedVariants).toHaveLength(9);
    expect(result.variants.slice(0,3).map(v=>v.id)).toEqual(['EXISTING-1','EXISTING-2','EXISTING-3']);
    expect(result.variants.slice(0,3).every(v=>v.materialSpec.baseColor==='#334455'&&v.materialSpec.roughness===null&&v.materialSpec.metallic===null&&v.materialSpec.pattern===null)).toBe(true);
    expect(result.plannedVariants.slice(3).every(v=>v.image===null&&v.renderStatus==='pending'&&!v.storefrontEligible)).toBe(true);
    expect(result.sourceVariants).toEqual(source.variants);
    expect(source.variants).toHaveLength(3);
  });
  it('preserves source alternatives separately from material proposals and legacy ownership state', () => {
    const source = { id:'legacy-totem',department:'totems',subcategory:'totems',image:null,status:'Existing collectible',variants:[{id:'source-1',name:'Source',image:'/source.webp',swatch:'#555555',status:'Source option'}] };
    const result=applyMaterialConcepts(source);
    expect(result.variants).toHaveLength(9);
    expect(new Set(result.variants.map(v=>v.id)).size).toBe(9);
    expect(result.status).toBe('Existing collectible');
    expect(result.sourceVariants[0].id).toBe('source-1');
    expect(result.variants.every(v=>v.materialSpec.metallic!==null&&v.materialSpec.metallic>=0&&v.materialSpec.metallic<=1)).toBe(true);
  });
  it('identifies car paint images as concepts rather than verified native geometry', () => {
    for (const id of ['vehicle-ghostline','vehicle-vera-solis']) {
      const result=applyMaterialConcepts({id,department:'vehicles',subcategory:'cars',image:'/marketing.webp',status:'Collection preview',variants:[]});
      expect(result.variants).toHaveLength(9);
      expect(result.variants.every(v=>!!v.image&&v.renderStatus==='rendered'&&v.renderMethod==='image_concept')).toBe(true);
      expect(result.variants.every(v=>v.materialSpec.textureBasis.includes('bindings remain unverified'))).toBe(true);
    }
  });
  it('keeps proposed helmet shell and textile glove surface targets distinct from reviewed photo overrides', () => {
    const product={department:'clothing',image:null,status:'Material concepts',variants:[]};
    const helmet=materialConceptsFor({...product,id:'HDWR_006_A',subcategory:'headwear'});
    const gloves=materialConceptsFor({...product,id:'XTRA_010_A',subcategory:'extra'});
    const shellTargets=helmet.filter(v=>v.renderMethod!=='image_concept');
    const fabricTargets=gloves.filter(v=>v.renderMethod!=='image_concept');
    expect(shellTargets.length).toBeGreaterThan(0);expect(fabricTargets.length).toBeGreaterThan(0);
    expect(shellTargets.every(v=>v.materialSpec.roughness!==null&&v.materialSpec.roughness<=.5)).toBe(true);
    expect(fabricTargets.every(v=>v.materialSpec.roughness!==null&&v.materialSpec.roughness>=.68&&v.materialSpec.metallic!==null&&v.materialSpec.metallic<=.15)).toBe(true);
    for(const preview of [...helmet,...gloves].filter(v=>v.renderMethod==='image_concept'))expect(preview.materialSpec.textureBasis).toContain('remain unverified');
  });
  it('hides unapproved clothing presentation without deleting the planned finish or substituting an approved photo',()=>{
    const originals=[1,2,3].map(n=>({id:`CONCEPT-BTWR_001_A-0${n}`,name:`Approved ${n}`,image:`/approved-${n}.webp`,swatch:'#334455',status:'Color concept'}));
    const result=applyMaterialConcepts({id:'BTWR_001_A',department:'clothing',subcategory:'bottomwear',image:originals[0].image,status:'Color concepts',variants:originals});
    expect(result.variants.map(v=>v.id)).toEqual(originals.map(v=>v.id));
    expect(result.plannedVariants).toHaveLength(9);
    const archived=result.plannedVariants.slice(3);
    expect(archived.every(v=>!!v.image&&!v.storefrontEligible&&v.presentationStatus==='reference_edit_pending')).toBe(true);
    expect(archived.every(v=>!originals.some(old=>old.image===v.image))).toBe(true);
  });
  it('requires exact approved-reference provenance for new visible photo edits',()=>{
    const original='/approved.webp';
    const edited={image:'/edited.webp',renderMethod:'image_concept' as const,sourceReference:original,presentationStatus:'reference_edit_verified'};
    expect(isReviewedClothingReferenceEdit('MAT-new-oxide',edited,[original])).toBe(true);
    expect(isReviewedClothingReferenceEdit('MAT-new-oxide',{...edited,sourceReference:'/different.webp'},[original])).toBe(false);
    expect(isReviewedClothingReferenceEdit('MAT-new-oxide',{...edited,image:original},[original])).toBe(false);
    expect(isReviewedClothingReferenceEdit('MAT-new-oxide',{...edited,renderMethod:'native_3d'},[original])).toBe(false);
    expect(isReviewedClothingReferenceEdit('MAT-new-oxide',{...edited,presentationStatus:undefined},[original])).toBe(false);
  });
  it('uses the rug-specific original pattern and material evidence ahead of generic finishes',()=>{
    const rug=applyMaterialConcepts({id:'home-object-050-sm-carpet',department:'furniture',subcategory:'rugs',image:null,status:'Collection preview',variants:[]});
    expect(rug.variants).toHaveLength(9);
    expect(rug.variants[0]).toMatchObject({name:'Study Original',swatch:'#754335',materialSpec:{roughness:null,metallic:null,pattern:'Authored medallion and floral border'}});
    expect(rug.variants.every(v=>v.image?.includes('/rug-materials/')&&v.materialSpec.textureBasis.includes('MI_Carpet01'))).toBe(true);
  });
});
