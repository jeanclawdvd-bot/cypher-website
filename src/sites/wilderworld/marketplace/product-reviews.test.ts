import {describe,expect,it} from 'vitest';
import {createReviewDraft,emptyReviews,filterReviews,publishedReviews,reviewSummary,validateReviewSnapshot,type ProductReview,type ReviewSnapshot} from './product-reviews';
const now=Date.parse('2026-11-07T12:00:00Z');
const target={productId:'coat',variantIds:['black','chalk']};
const review=(overrides:Partial<ProductReview>={}):ProductReview=>({id:'r1',productId:'coat',variantId:'black',authorDisplayName:'Collector',rating:4,title:'Good construction',body:'Test fixture for the moderation/read contract.',createdAt:'2026-01-01T12:00:00Z',moderation:'published',helpfulCount:1,...overrides});
const snapshot=(reviews:ProductReview[]):ReviewSnapshot=>({status:'live',provider:'review-service',asOf:'2026-11-07T11:00:00Z',reviews,message:'Published reviews'});
describe('moderated product review reads',()=>{
  it('fails closed for unavailable, unconfigured or future-dated snapshots',()=>{
    expect(publishedReviews(emptyReviews(),target,now)).toEqual([]);
    expect(publishedReviews({...snapshot([review()]),asOf:'2030-01-01'},target,now)).toEqual([]);
    expect(validateReviewSnapshot({...snapshot([]),reviews:null} as unknown as ReviewSnapshot,now).status).toBe('unavailable');
  });
  it('excludes duplicates, other products, unknown variants, unmoderated records and invalid ratings or dates',()=>{
    const rows=[review(),review({id:'other-product',productId:'shoe'}),review({id:'unknown-variant',variantId:'fake'}),review({id:'pending',moderation:'pending'}),review({id:'rating',rating:6}),review({id:'fraction',rating:4.5}),review({id:'future',createdAt:'2027-01-01'}),review({id:'dup'}),review({id:'dup',rating:1})];
    expect(publishedReviews(snapshot(rows),target,now).map(r=>r.id)).toEqual(['r1']);
  });
  it('counts only published known variants and separates ownership from purchase evidence',()=>{
    const rows=publishedReviews(snapshot([review({verifiedOwnership:{assertedBy:'server',provider:'review-service',evidenceId:'owner-proof',verifiedAt:'2026-02-01'}}),review({id:'r2',variantId:'chalk',rating:2,verifiedPurchase:{assertedBy:'server',provider:'different-service',evidenceId:'untrusted',verifiedAt:'2026-02-01'}})]),target,now);
    expect(rows[0].verifiedOwnership).toBeTruthy();expect(rows[0].verifiedPurchase).toBeUndefined();expect(rows[1].verifiedPurchase).toBeUndefined();
    expect(reviewSummary(rows)).toEqual({count:2,average:3,distribution:{1:0,2:1,3:0,4:1,5:0}});
  });
  it('filters rating and variant while preserving stable sort order',()=>{
    const rows=[review({id:'old',rating:5,helpfulCount:3}),review({id:'new',variantId:'chalk',rating:2,createdAt:'2026-05-01',helpfulCount:9})];
    expect(filterReviews(rows,{sort:'recent'}).map(r=>r.id)).toEqual(['new','old']);
    expect(filterReviews(rows,{sort:'highest'}).map(r=>r.id)).toEqual(['old','new']);
    expect(filterReviews(rows,{rating:2,variantId:'chalk',sort:'helpful'}).map(r=>r.id)).toEqual(['new']);
  });
});
describe('local review drafts',()=>{
  it('cannot grant publication or proof and do not enter aggregates',()=>{
    const draft=createReviewDraft(target,{variantId:'chalk',rating:5,title:'Title',body:'Draft body',verifiedPurchase:true,moderation:'published'} as Parameters<typeof createReviewDraft>[1]);
    expect(draft).toMatchObject({status:'local_draft',published:false,productId:'coat',variantId:'chalk'});
    expect(draft).not.toHaveProperty('verifiedPurchase');expect(draft).not.toHaveProperty('moderation');
    expect(publishedReviews(snapshot([draft as unknown as ProductReview]),target,now)).toEqual([]);
  });
  it('validates rating, text limits and variant before saving',()=>{
    expect(()=>createReviewDraft(target,{rating:0,title:'Title',body:'Body'})).toThrow('rating');
    expect(()=>createReviewDraft(target,{rating:5,title:'Title',body:'Body',variantId:'fake'})).toThrow('known product variant');
    expect(()=>createReviewDraft(target,{rating:5,title:' ',body:'Body'})).toThrow('title');
  });
});
