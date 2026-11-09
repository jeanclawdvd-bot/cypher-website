'use client';
import { useEffect, useId, useMemo, useState } from 'react';
import { Star, BadgeCheck, ThumbsUp } from 'lucide-react';
import {createReviewDraft,emptyReviews,filterReviews,publishedReviews,reviewSummary,validateReviewSnapshot,unconfiguredReviewAdapter,type ProductReviewAdapter,type ReviewDraft,type ReviewSnapshot,type ReviewSort} from './product-reviews';
import styles from './ProductReviews.module.css';
import { RatingStars as Stars } from './ProductRating';
import { previewReviews, productReviewsAnchor } from './preview-reviews';
import LocalReviewSubmission from './LocalReviewSubmission';
import { localReviewAdapter } from './local-review-adapter';
import { accountErrorMessage,STORE_ACCOUNT_EVENT,storeAccountApi,type LocalSession } from './account-client';

export type ProductReviewsProps={productId:string;variantId?:string;variantName?:string;variantOptions?:readonly {id:string;name:string}[];adapter?:ProductReviewAdapter;preview?:boolean};

export default function ProductReviews({productId,variantId,variantName,variantOptions,adapter=localReviewAdapter,preview=false}:ProductReviewsProps) {
  const targetKey=JSON.stringify([productId,variantOptions?.map(option=>option.id)??(variantId?[variantId]:[])]);
  const target=useMemo(()=>({productId,variantIds:variantOptions?.map(option=>option.id)??(variantId?[variantId]:[])}),[targetKey]);
  const options=variantOptions??(variantId?[{id:variantId,name:variantName??variantId}]:[]);
  const [snapshot,setSnapshot]=useState<ReviewSnapshot>(emptyReviews),[loadedKey,setLoadedKey]=useState(''),[loading,setLoading]=useState(true);
  const [ratingFilter,setRatingFilter]=useState('all'),[variantFilter,setVariantFilter]=useState('all'),[sort,setSort]=useState<ReviewSort>('recent');
  const [rating,setRating]=useState(0),[title,setTitle]=useState(''),[body,setBody]=useState(''),[draft,setDraft]=useState<ReviewDraft|null>(null),[error,setError]=useState(''),[savedInBrowser,setSavedInBrowser]=useState(false);
  const [writeOpen,setWriteOpen]=useState(false);
  const [showSamples,setShowSamples]=useState(preview),[reviewLimit,setReviewLimit]=useState(6);
  useEffect(()=>setReviewLimit(6),[productId,ratingFilter,variantFilter,sort,showSamples]);
  const [session,setSession]=useState<LocalSession|null>(null),[voteBusy,setVoteBusy]=useState<string|null>(null),[voteError,setVoteError]=useState('');
  const headingId=useId(),formId=useId();
  useEffect(()=>{
    if(adapter.id!==localReviewAdapter.id)return;
    const controller=new AbortController();
    const refresh=()=>storeAccountApi.session(controller.signal).then(value=>{if(!controller.signal.aborted)setSession(value);}).catch(()=>{if(!controller.signal.aborted)setSession(null);});
    refresh();window.addEventListener(STORE_ACCOUNT_EVENT,refresh);
    return()=>{controller.abort();window.removeEventListener(STORE_ACCOUNT_EVENT,refresh);};
  },[adapter]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setSnapshot(emptyReviews());setLoadedKey('');
    Promise.resolve().then(()=>adapter.read(target,controller.signal)).then(result=>{if(!controller.signal.aborted){setSnapshot(validateReviewSnapshot(result));setLoadedKey(targetKey);}}).catch(()=>{if(!controller.signal.aborted){setSnapshot(emptyReviews('unavailable'));setLoadedKey(targetKey);}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[adapter,targetKey]);
  useEffect(()=>{setRatingFilter('all');setVariantFilter('all');setRating(0);setTitle('');setBody('');setDraft(null);setError('');setSavedInBrowser(false);},[productId]);
  useEffect(()=>{setDraft(null);setError('');setSavedInBrowser(false);},[variantId]);
  const current=loadedKey===targetKey?snapshot:emptyReviews();
  const communityReviews=useMemo(()=>publishedReviews(current,target),[current,target]);
  const reviews=useMemo(()=>showSamples?previewReviews(target):communityReviews,[showSamples,target,communityReviews]);
  const summary=reviewSummary(reviews);
  const filtered=filterReviews(reviews,{rating:ratingFilter==='all'?undefined:Number(ratingFilter),variantId:variantFilter==='all'?undefined:variantFilter,sort});
  async function helpful(id:string,value:boolean){
    if(showSamples||!session?.user||voteBusy)return;setVoteBusy(id);setVoteError('');
    try{const result=await storeAccountApi.helpful(id,value,session.csrfToken);setSnapshot(previous=>({...previous,reviews:previous.reviews.map(review=>review.id===result.reviewId?{...review,helpfulCount:result.helpfulCount,viewerHelpful:result.viewerHelpful}:review)}));}
    catch(reason){setVoteError(accountErrorMessage(reason));}finally{setVoteBusy(null);}
  }
  const saveDraft=(event:React.FormEvent)=>{
    event.preventDefault();
    try {
      const next=createReviewDraft(target,{variantId,rating,title,body});setDraft(next);setError('');
      try {localStorage.setItem(`ww-review-draft:${productId}:${variantId??'all'}`,JSON.stringify(next));setSavedInBrowser(true);}catch{setSavedInBrowser(false);}
    } catch(error){setDraft(null);setError(error instanceof Error?error.message:'Check your review.');}
  };
  return <section id={productReviewsAnchor(productId)} className={styles.panel} aria-labelledby={headingId}>
    <header className={styles.heading}><div><p className={styles.eyebrow}>From the community</p><h2 id={headingId}>Ratings & reviews</h2></div><a href={`#${formId}`} onClick={()=>setWriteOpen(true)}>Write a review</a></header>
    {preview&&<div className={styles.reviewSource}><button type="button" aria-pressed={showSamples} onClick={()=>setShowSamples(true)}>Sample reviews</button><button type="button" aria-pressed={!showSamples} onClick={()=>setShowSamples(false)}>Community reviews ({communityReviews.length})</button></div>}
    <div className={styles.overview}>
      <div className={styles.score}><strong>{summary.average===null?'—':summary.average.toFixed(1)}</strong><div><Stars rating={summary.average} unavailable={!showSamples&&current.status!=='live'}/><p>{showSamples||current.status==='live'?`${summary.count} ${summary.count===1?'review':'reviews'}`:current.status==='unconfigured'?'Reviews coming soon':'Rating unavailable'}</p></div></div>
      <div className={styles.breakdown} aria-label="Rating distribution">{[5,4,3,2,1].map(star=><button key={star} onClick={()=>setRatingFilter(ratingFilter===String(star)?'all':String(star))} aria-label={`Filter ${star}-star reviews`} aria-pressed={ratingFilter===String(star)}><span>{star} star</span><span className={styles.track}><span style={{width:`${summary.count?summary.distribution[star]/summary.count*100:0}%`}}/></span><span>{showSamples||current.status==='live'?`${summary.count?Math.round(summary.distribution[star]/summary.count*100):0}%`:'—'}</span></button>)}</div>
      <p className={styles.proofNote}>{showSamples?"Sample reviews · Not customer feedback.":"Reviews reflect this product and its variants. Purchase and ownership verification are shown separately when supported by verified records."}</p>
    </div>
    <p className={styles.status} role="status">{showSamples?'Sample data':loading?'Loading reviews…':current.status==='live'?`Published reviews${current.provider?` · ${current.provider}`:''}`:current.message}</p>
    <div className={styles.filters}>
      <label>Sort by<select aria-label="Sort reviews" value={sort} onChange={event=>setSort(event.target.value as ReviewSort)}><option value="recent">Most recent</option><option value="helpful">Most helpful</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option></select></label>
      <label>Rating<select aria-label="Filter reviews by rating" value={ratingFilter} onChange={event=>setRatingFilter(event.target.value)}><option value="all">All ratings</option>{[5,4,3,2,1].map(star=><option key={star} value={star}>{star} stars</option>)}</select></label>
      {options.length>0&&<label>Variant<select aria-label="Filter reviews by variant" value={variantFilter} onChange={event=>setVariantFilter(event.target.value)}><option value="all">All variants</option>{options.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}</select></label>}
    </div>
    <div className={styles.reviews}>
      {filtered.length?filtered.slice(0,reviewLimit).map(review=><article key={review.id} className={styles.review}>
        <div className={styles.reviewByline}><strong>{review.authorDisplayName}</strong><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})}</time></div>
        <div className={styles.reviewTitle}><Stars rating={review.rating}/><h3>{review.title}</h3></div>
        <div className={styles.reviewMeta}>{showSamples&&<span className={styles.sampleLabel}>Sample review</span>}{review.variantId&&<span>{options.find(option=>option.id===review.variantId)?.name??review.variantId}</span>}{review.verifiedPurchase&&<span className={styles.verified}><BadgeCheck size={13} aria-hidden/>Verified purchase</span>}{review.verifiedOwnership&&<span className={styles.verified} title="Verified ownership does not establish a purchase."><BadgeCheck size={13} aria-hidden/>Verified owner</span>}</div>
        <p className={styles.reviewBody}>{review.body}</p>
        <button className={styles.helpful} disabled={showSamples||!session?.user||!!voteBusy||adapter.id!==localReviewAdapter.id} aria-pressed={!!review.viewerHelpful} onClick={()=>helpful(review.id,!review.viewerHelpful)} title={session?.user?'Mark or unmark this local review as helpful.':'Sign in to mark a review helpful.'}><ThumbsUp size={13} aria-hidden/>Helpful{review.helpfulCount>0?` (${review.helpfulCount})`:''}</button>
      </article>):<div className={styles.empty}><Star size={25} strokeWidth={1} aria-hidden/><strong>{reviews.length?'No reviews match these filters.':current.status==='live'?'No published reviews yet.':'No reviews loaded.'}</strong><p>{reviews.length?'Try another rating or variant.':'Only published, moderated reviews contribute to the rating.'}</p></div>}
    </div>
    {filtered.length>reviewLimit&&<button className={styles.moreReviews} type="button" onClick={()=>setReviewLimit(value=>value+6)}>See more reviews</button>}
    {voteError&&<p className={styles.error} role="alert">{voteError}</p>}
    <div id={formId} className={styles.draftSection}>
      <details open={writeOpen} onToggle={event=>setWriteOpen(event.currentTarget.open)}><summary>Write a review </summary><form onSubmit={saveDraft}>
        <p className={styles.draftNote}>Save a draft or sign in to submit your review for moderation.</p>
        {variantName&&<p className={styles.selectedVariant}>Reviewing: {variantName}</p>}
        <fieldset className={styles.ratingInput}><legend>Your rating</legend>{[1,2,3,4,5].map(star=><button type="button" key={star} aria-label={`Rate ${star} ${star===1?'star':'stars'}`} aria-pressed={rating===star} onClick={()=>setRating(star)}><Star size={25} fill={star<=rating?'currentColor':'none'} strokeWidth={1.4}/></button>)}</fieldset>
        <label>Review title<input aria-label="Review title" value={title} onChange={event=>setTitle(event.target.value)} maxLength={120} placeholder="What should other collectors know?" required/></label>
        <label>Your review<textarea aria-label="Your review" value={body} onChange={event=>setBody(event.target.value)} maxLength={5000} rows={4} placeholder="Share your experience with this item." required/></label>
        {error&&<p role="alert" className={styles.error}>{error}</p>}
        <button className={styles.save} type="submit">Save draft</button>
        {draft&&<p className={styles.saved} role="status">{savedInBrowser?'Draft saved in this browser.':'Draft saved for this session.'} Not published. No verification badge or rating has been added.</p>}
        <LocalReviewSubmission productId={productId} variantId={variantId} rating={rating} title={title} body={body}/>
      </form></details>
    </div>
  </section>;
}
