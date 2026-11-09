import {describe,expect,it} from 'vitest';
import {reviewSubjectPresentation} from './review-subjects';
import identities from '@/lib/store-backend/original-review-identities.json';

describe('friendly review subject presentation',()=>{
  it('links the exact original edition and never falls back to a different finish',()=>{
    const [productId,variants]=Object.entries(identities.families).find(([,ids])=>ids.length>1)!;
    const subject=(identities.presentation as Record<string,{name:string;href:string;editionLabels:string[]}>)[productId];
    const variantId=variants.at(-1)!;
    expect(reviewSubjectPresentation(productId,variantId)).toEqual({name:subject.name,href:`${subject.href}?variant=${variantId}`,variantLabel:subject.editionLabels.at(-1)});
    expect(reviewSubjectPresentation(productId,'unknown-edition')).toEqual({name:subject.name,href:subject.href,variantLabel:undefined});
  });
  it('keeps raw chain and contract identities out of unknown subject labels and links',()=>{
    const productId=Object.keys(identities.families)[0];
    expect(reviewSubjectPresentation(productId.replace(':9369:',':1:'),'unknown')).toEqual({name:'Original collectible'});
    expect(reviewSubjectPresentation('legacy:9369:0x'+'a'.repeat(40)+':123','123')).toEqual({name:'Original collectible'});
    expect(reviewSubjectPresentation('unknown-removed-product','missing')).toEqual({name:'Archived product'});
  });
});
