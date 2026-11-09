/** Review reads and local drafts only. Publishing, moderation and proof checks belong to a server. */
export type ReviewEvidence = { assertedBy:'server'; provider:string; evidenceId:string; verifiedAt:string };
export type ProductReview = {
  id:string; productId:string; variantId:string|null; authorDisplayName:string;
  rating:number; title:string; body:string; createdAt:string;
  moderation:'published'|'pending'|'rejected'; helpfulCount:number;
  viewerHelpful?:boolean;
  verifiedPurchase?:ReviewEvidence;
  verifiedOwnership?:ReviewEvidence;
};
export type ReviewTarget = { productId:string; variantIds:readonly string[] };
export type ReviewSnapshot = {
  status:'unconfigured'|'unavailable'|'live'; provider:string|null; asOf:string|null;
  reviews:readonly ProductReview[]; message:string;
};
export interface ProductReviewAdapter {
  readonly id:string;
  read(target:ReviewTarget,signal?:AbortSignal):Promise<ReviewSnapshot>;
}
export const unconfiguredReviewAdapter:ProductReviewAdapter = {
  id:'unconfigured', async read(){return emptyReviews();},
};
export function emptyReviews(status:'unconfigured'|'unavailable'='unconfigured'):ReviewSnapshot {
  return {status,provider:null,asOf:null,reviews:[],message:status==='unconfigured'?'Published reviews are not connected in this preview.':'Reviews could not be loaded. Please try again later.'};
}
const text = (value:unknown,max:number):value is string => typeof value==='string'&&value.trim().length>0&&value.length<=max;
const date = (value:unknown):number => typeof value==='string'?Date.parse(value):NaN;

function verifiedEvidence(evidence:ReviewEvidence|undefined,provider:string,asOf:number):ReviewEvidence|undefined {
  return evidence?.assertedBy==='server'&&evidence.provider===provider&&text(evidence.evidenceId,256)
    && Number.isFinite(date(evidence.verifiedAt))&&date(evidence.verifiedAt)<=asOf
    ? {...evidence} : undefined;
}

/** Accept only moderated records for this product and its known variants. Never infer a purchase from ownership. */
export function publishedReviews(snapshot:ReviewSnapshot,target:ReviewTarget,now=Date.now()):ProductReview[] {
  if(!snapshot)return [];
  const asOf=date(snapshot.asOf);
  if(snapshot.status!=='live'||!text(snapshot.provider,160)||!Number.isFinite(asOf)||asOf>now||!Array.isArray(snapshot.reviews))return [];
  const variants=new Set(target.variantIds);
  const ids=new Map<string,number>();
  for(const review of snapshot.reviews){if(review&&typeof review.id==='string')ids.set(review.id,(ids.get(review.id)??0)+1);}
  return snapshot.reviews.flatMap(review=>{
    if(!review||!text(review.id,256)||ids.get(review.id)!==1||review.productId!==target.productId||review.moderation!=='published'
      ||!Number.isInteger(review.rating)||review.rating<1||review.rating>5
      ||!text(review.authorDisplayName,100)||!text(review.title,120)||!text(review.body,5000)
      ||!Number.isFinite(date(review.createdAt))||date(review.createdAt)>asOf
      ||(review.variantId!==null&&(!text(review.variantId,256)||!variants.has(review.variantId)))
      ||!Number.isSafeInteger(review.helpfulCount)||review.helpfulCount<0)return [];
    return [{...review,
      verifiedPurchase:verifiedEvidence(review.verifiedPurchase,snapshot.provider!,asOf),
      verifiedOwnership:verifiedEvidence(review.verifiedOwnership,snapshot.provider!,asOf),
    }];
  });
}

export function validateReviewSnapshot(snapshot:ReviewSnapshot,now=Date.now()):ReviewSnapshot {
  if(!snapshot||!['unconfigured','unavailable','live'].includes(snapshot.status)||typeof snapshot.message!=='string'||!Array.isArray(snapshot.reviews))return emptyReviews('unavailable');
  if(snapshot.status!=='live')return emptyReviews(snapshot.status);
  if(!text(snapshot.provider,160)||!Number.isFinite(date(snapshot.asOf))||date(snapshot.asOf)>now)return emptyReviews('unavailable');
  return snapshot;
}

export function reviewSummary(reviews:readonly ProductReview[]) {
  const distribution:Record<number,number>={1:0,2:0,3:0,4:0,5:0};
  let sum=0;
  for(const review of reviews){distribution[review.rating]++;sum+=review.rating;}
  return {count:reviews.length,average:reviews.length?sum/reviews.length:null,distribution};
}
export type ReviewSort='recent'|'helpful'|'highest'|'lowest';
export function filterReviews(reviews:readonly ProductReview[],filter:{rating?:number;variantId?:string;sort?:ReviewSort}) {
  const result=reviews.filter(review=>(filter.rating===undefined||review.rating===filter.rating)&&(!filter.variantId||review.variantId===filter.variantId));
  const recent=(a:ProductReview,b:ProductReview)=>date(b.createdAt)-date(a.createdAt)||a.id.localeCompare(b.id);
  return result.sort((a,b)=>filter.sort==='helpful'?b.helpfulCount-a.helpfulCount||recent(a,b):filter.sort==='highest'?b.rating-a.rating||recent(a,b):filter.sort==='lowest'?a.rating-b.rating||recent(a,b):recent(a,b));
}
export type ReviewDraft={status:'local_draft';published:false;productId:string;variantId:string|null;rating:number;title:string;body:string;createdAt:string};
export function createReviewDraft(target:ReviewTarget,input:{variantId?:string;rating:number;title:string;body:string},now=new Date()):ReviewDraft {
  if(!text(target.productId,256))throw new Error('Choose a product.');
  if(!Number.isInteger(input.rating)||input.rating<1||input.rating>5)throw new Error('Choose a rating from one to five stars.');
  if(!text(input.title,120))throw new Error('Add a review title of up to 120 characters.');
  if(!text(input.body,5000))throw new Error('Write a review of up to 5,000 characters.');
  if(input.variantId&&!target.variantIds.includes(input.variantId))throw new Error('Choose a known product variant.');
  return {status:'local_draft',published:false,productId:target.productId,variantId:input.variantId??null,rating:input.rating,title:input.title.trim(),body:input.body.trim(),createdAt:now.toISOString()};
}
