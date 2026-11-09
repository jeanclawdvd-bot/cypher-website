'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,FlaskConical} from 'lucide-react';
import {formatLocalAmount} from '@/lib/store-backend/currency';
import {STORE_ACCOUNT_EVENT,StoreApiError,accountErrorMessage,hasLocalFeeQuote,isSessionExpired,validLocalQuote,notifyStoreAccount,storeAccountApi,type LocalListing,type LocalSession,type LocalCurrency,type LocalPurchaseQuote} from './account-client';
import LocalCurrencyPrice from './LocalCurrencyPrice';
import styles from './LocalListingPanel.module.css';
export type LocalListingPanelProps={productId:string;variantId:string;variantName:string};
export default function LocalListingPanel({productId,variantId,variantName}:LocalListingPanelProps){
  const [listings,setListings]=useState<LocalListing[]>([]),[session,setSession]=useState<LocalSession|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState<string|null>(null),[revision,setRevision]=useState(0);
  const [paymentCurrency,setPaymentCurrency]=useState<LocalCurrency>('USD'),[quote,setQuote]=useState<LocalPurchaseQuote|null>(null),[now,setNow]=useState(Date.now);
  const keys=useRef(new Map<string,string>()),generation=useRef(0);const [disabledService,setDisabledService]=useState(false);  const confirmation=useRef<HTMLDivElement|null>(null),purchaseTriggers=useRef(new Map<string,HTMLButtonElement>()),previousConfirmation=useRef<string|null>(null);  useEffect(()=>{if(confirm)confirmation.current?.focus();else if(previousConfirmation.current)purchaseTriggers.current.get(previousConfirmation.current)?.focus();previousConfirmation.current=confirm;},[confirm]);  function tradeFailure(reason:unknown,current:number){    if(current!==generation.current)return;    if(isSessionExpired(reason)||(reason instanceof StoreApiError&&(reason.status===409||reason.status===404))){      generation.current++;setConfirm(null);setQuote(null);setBusy(false);      setNotice(isSessionExpired(reason)?'Your session ended. Sign in again before buying.':`${accountErrorMessage(reason)} Listings have been refreshed; review the current offer before trying again.`);      setRevision(value=>value+1);      return;    }    setError(accountErrorMessage(reason));  }
  useEffect(()=>{const refresh=()=>{generation.current++;setConfirm(null);setQuote(null);setBusy(false);setRevision(value=>value+1);};const visible=()=>{if(document.visibilityState==='visible')refresh();};window.addEventListener(STORE_ACCOUNT_EVENT,refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);return()=>{window.removeEventListener(STORE_ACCOUNT_EVENT,refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible);};},[]);
  useEffect(()=>{generation.current++;setConfirm(null);setQuote(null);setNotice('');setBusy(false);keys.current.clear();},[productId,variantId]);
  useEffect(()=>{if(!quote)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[quote]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');setListings([]);setSession(null);
    Promise.all([storeAccountApi.listings(productId,variantId,controller.signal),storeAccountApi.session(controller.signal)]).then(([result,currentSession])=>{if(controller.signal.aborted)return;setDisabledService(false);setListings(result.listings.filter(item=>item.productId===productId&&item.variantId===variantId&&item.status==='active'&&item.simulated===true&&(item.currency==='USD'||item.currency==='WILD')));setSession(currentSession);}).catch(reason=>{if(!controller.signal.aborted){setDisabledService(reason instanceof StoreApiError&&(['unavailable','wrong_mode'].includes(reason.code)||reason.status===404));setError(accountErrorMessage(reason));}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[productId,variantId,revision]);
  async function requestQuote(listing:LocalListing,currency=paymentCurrency){
    if(!session?.user||!session.csrfToken||busy||!hasLocalFeeQuote(listing))return;
    const current=generation.current;setConfirm(listing.id);setQuote(null);setBusy(true);setError('');setPaymentCurrency(currency);
    try{const result=await storeAccountApi.quote(listing.id,{paymentCurrency:currency,expectedCurrency:listing.currency,expectedAmountAtomic:listing.amountAtomic},session.csrfToken);if(current!==generation.current)return;
      if(!validLocalQuote(result.quote,listing,session.user.id,currency))throw new Error('The purchase quote does not match this listing. Refresh and try again.');
      setQuote(result.quote);setNow(Date.now());
    }catch(reason){tradeFailure(reason,current);}finally{if(current===generation.current)setBusy(false);}
  }
  async function buy(listing:LocalListing){
    if(!session?.user||!session.csrfToken||busy||!hasLocalFeeQuote(listing)||!quote||!validLocalQuote(quote,listing,session.user.id,paymentCurrency))return;
    if(Date.parse(quote.expiresAt)<=Date.now()&&!keys.current.has(quote.id)){setError('This quote expired. Request a new quote.');return;}
    const current=generation.current;setBusy(true);setError('');
    try {
      let key=keys.current.get(quote.id);if(!key){key=crypto.randomUUID();keys.current.set(quote.id,key);}
      await storeAccountApi.buy(listing.id,{idempotencyKey:key,quoteId:quote.id,expectedAmountAtomic:listing.amountAtomic,expectedCurrency:listing.currency,paymentCurrency:quote.paymentCurrency,expectedPaymentAmountAtomic:quote.paymentAmountAtomic},session.csrfToken);
      if(generation.current!==current)return;
      setConfirm(null);setQuote(null);setNotice('Simulated purchase complete. The test item is now in your local inventory. No payment or blockchain transaction occurred.');notifyStoreAccount();
    }catch(reason){tradeFailure(reason,current);}
    finally{if(generation.current===current)setBusy(false);}
  }
  if(disabledService||(loading&&!session))return null;
  const expired=quote?Date.parse(quote.expiresAt)<=now:false;
  return <section className={styles.panel} aria-label="Local preview listings">
    <header className={styles.heading}><div><p className={styles.eyebrow}><FlaskConical size={12} aria-hidden/>Local preview</p><h2>Try the exchange</h2></div><Link href="/store/account">Your inventory <ArrowUpRight size={15} aria-hidden/></Link></header>
    <p className={styles.intro}>Test listings for <strong>{variantName}</strong>. New asks use WILD; buyers can simulate payment in USD or WILD. Historical USD listings retain their original terms. No money, NFTs or game entitlements change hands.</p>
    {notice&&<p role="status" className={styles.notice}>{notice}</p>}
    {error&&<div role="alert" className={styles.error}><p>{error}</p><button onClick={()=>setRevision(value=>value+1)} disabled={busy}>Refresh listings</button></div>}
    {loading?<p className={styles.empty} role="status">Loading local listings…</p>:!error&&!listings.length?<div className={styles.empty}><strong>No test listings for this finish.</strong><p>Create a local account, add test items and list an unlocked item from your inventory.</p><Link href="/store/account">Open your account <ArrowUpRight size={14} aria-hidden/></Link></div>:<div className={styles.listings}>{listings.map(listing=><article key={listing.id} className={styles.listing}>
      <div><span className={styles.seller}>{listing.sellerName}</span><small>Local test listing · {variantName}</small></div><div className={styles.price}>{hasLocalFeeQuote(listing)?<LocalCurrencyPrice amountAtomic={listing.amountAtomic} currency={listing.currency}/>:<small>Price details unavailable</small>}<small>Simulated</small></div>
      {listing.sellerId===session?.user?.id?<Link href="/store/account?tab=listings">Manage your listing <ArrowUpRight size={14} aria-hidden/></Link>:!session?.user?<Link href="/store/account">Sign in to try it <ArrowUpRight size={14} aria-hidden/></Link>:confirm===listing.id?<div ref={confirmation} tabIndex={-1} role="group" aria-label="Purchase confirmation" className={styles.confirm}>
        <span>This transfers one test item to your account.</span><fieldset className={styles.currencyChoice}><legend>Simulated payment currency</legend>{(['USD','WILD'] as const).map(currency=><button type="button" key={currency} disabled={busy} aria-pressed={paymentCurrency===currency} onClick={()=>requestQuote(listing,currency)}>{currency}</button>)}</fieldset>
        {quote?<><dl className={styles.fees} aria-label="Simulated purchase totals"><div><dt>Listing ask</dt><dd>{formatLocalAmount(listing.amountAtomic,listing.currency)}</dd></div><div><dt>Buyer marketplace fee</dt><dd>{formatLocalAmount('0',quote.paymentCurrency)}</dd></div><div><dt>You pay · simulated</dt><dd>{formatLocalAmount(quote.paymentAmountAtomic,quote.paymentCurrency)}</dd></div></dl>
        <span>Demo conversion: 1 WILD = $0.10. Not a live rate. USD payments round upward to a cent.</span><span>Quote {quote.id} · {expired?'Expired':`Valid until ${new Date(quote.expiresAt).toLocaleTimeString()}`}</span>
        <span>Seller fee: {listing.sellerFeeBps/100}% ({formatLocalAmount(listing.sellerFeeAtomic,listing.currency)}), deducted from the sale. Seller receives {formatLocalAmount(listing.sellerProceedsAtomic,listing.currency)}. Royalties, payment and network costs are not included.</span>
        {expired&&!keys.current.has(quote.id)?<button disabled={busy} onClick={()=>requestQuote(listing)}>Refresh purchase quote</button>:<button disabled={busy||!hasLocalFeeQuote(listing)} onClick={()=>buy(listing)}>{busy?'Simulating…':'Confirm simulated purchase'}</button>}</>:busy?<span role="status">Preparing your purchase quote…</span>:<button onClick={()=>requestQuote(listing)}>Get purchase quote</button>}
        <button className={styles.secondary} disabled={busy} onClick={()=>{setConfirm(null);setQuote(null);}}>Cancel</button>
      </div>:<button ref={node=>{if(node)purchaseTriggers.current.set(listing.id,node);else purchaseTriggers.current.delete(listing.id);}} disabled={busy||!session.csrfToken||!hasLocalFeeQuote(listing)} onClick={()=>requestQuote(listing)}>{hasLocalFeeQuote(listing)?'Simulate purchase':'Fee details unavailable'}</button>}
    </article>)}</div>}
  </section>;
}
