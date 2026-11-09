import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { marketProducts } from './catalog';
import { productEditorials } from './campaign-media';
import femaleRestorations from './female-restorations.json';

describe('live catalog material and editorial coverage',()=>{
  it('keeps nine explicit plans per product and exposes only reviewed clothing imagery',()=>{
    const items=marketProducts.map(product=>{
      const planned=product.plannedVariants??[];
      const visible=product.variants;
      const expectedCount=9;
      expect(planned,product.id).toHaveLength(expectedCount);
      expect(new Set(planned.map(v=>v.id)).size,product.id).toBe(expectedCount);
      for(const variant of visible){
        expect(variant.image,variant.id).toBeTruthy();
        expect(existsSync(path.join(process.cwd(),'public',variant.image!)),variant.id).toBe(true);
        if(product.department==='clothing')expect(planned.find(v=>v.id===variant.id)?.storefrontEligible,variant.id).toBe(true);
      }
      const editorials=[...new Map([undefined,...planned.map(v=>v.id)].flatMap(color=>productEditorials(product.id,color)).map(scene=>[scene.image,scene])).values()];
      return {id:product.id,name:product.name,department:product.department,subcategory:product.subcategory,image:product.image,sourceIds:product.sourceIds,sourceVariants:product.sourceVariants,plannedCount:planned.length,visibleCount:visible.length,fullyNine:visible.length===9,allApprovedPreviewsVisible:visible.length===expectedCount,visible:visible.map(v=>({id:v.id,image:v.image})),withheld:planned.filter(v=>!v.storefrontEligible).map(v=>({id:v.id,image:v.image,renderStatus:v.renderStatus,presentationStatus:v.presentationStatus})),editorials};
    });
    const categories=Object.fromEntries([...new Set(items.map(p=>`${p.department}/${p.subcategory}`))].map(key=>{
      const products=items.filter(p=>`${p.department}/${p.subcategory}`===key);
      return [key,{products:products.length,fullyNine:products.filter(p=>p.fullyNine).length,visibleVariants:products.reduce((a,p)=>a+p.visibleCount,0),plannedVariants:products.reduce((a,p)=>a+p.plannedCount,0),missingFaithfulVariants:products.reduce((a,p)=>a+p.plannedCount-p.visibleCount,0),editorialProducts:products.filter(p=>p.editorials.length).length}];
    }));
    const report={products:items.length,plannedVariants:items.reduce((a,p)=>a+p.plannedCount,0),visibleVariants:items.reduce((a,p)=>a+p.visibleCount,0),fullyNineProducts:items.filter(p=>p.fullyNine).length,completePreviewProducts:items.filter(p=>p.allApprovedPreviewsVisible).length,missingFaithfulVariants:items.reduce((a,p)=>a+p.plannedCount-p.visibleCount,0),editorialProducts:items.filter(p=>p.editorials.length).length,missingEditorialProducts:items.filter(p=>!p.editorials.length).length,categories,items};
    expect(items).toHaveLength(223 + femaleRestorations.products.length);
    if(process.env.WW_RUNTIME_AUDIT_PATH){const out=path.resolve(process.env.WW_RUNTIME_AUDIT_PATH);mkdirSync(path.dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
    console.info('Runtime coverage:',JSON.stringify({...report,items:undefined}));
  });
});
