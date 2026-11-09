import {afterEach,describe,expect,it,vi} from 'vitest';
import {StoreApiError,canListLocalItem,hasLocalFeeQuote,listingAmountAtomic,storeAccountApi,validateAuth,type LocalInventoryItem} from './account-client';
afterEach(()=>vi.unstubAllGlobals());
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
describe('local account client boundary',()=>{
  it('uses dedicated authenticated photo writes and preserves ordinary profile fields',async()=>{
    const fetch=vi.fn().mockImplementation(async()=>json({mode:'local'}));vi.stubGlobal('fetch',fetch);
    await storeAccountApi.uploadProfilePhoto('data:image/jpeg;base64,test','csrf');expect(fetch).toHaveBeenLastCalledWith('/api/store/v1/profile/photo',expect.objectContaining({method:'PUT',body:JSON.stringify({dataUrl:'data:image/jpeg;base64,test'}),headers:expect.objectContaining({'X-CSRF-Token':'csrf'})}));
    await storeAccountApi.removeProfilePhoto('csrf');expect(fetch).toHaveBeenLastCalledWith('/api/store/v1/profile/photo',expect.objectContaining({method:'DELETE',body:'{}',headers:expect.objectContaining({'X-CSRF-Token':'csrf'})}));
    const count=fetch.mock.calls.length;expect(()=>storeAccountApi.uploadProfilePhoto('anything')).toThrow(/Sign in again/);expect(()=>storeAccountApi.removeProfilePhoto()).toThrow(/Sign in again/);expect(fetch).toHaveBeenCalledTimes(count);
  });

  it('keeps wallet proof and unlink calls session-scoped with CSRF and no transaction payload',async()=>{
    const fetch=vi.fn().mockImplementation(async()=>json({mode:'local'}));vi.stubGlobal('fetch',fetch);
    await storeAccountApi.wallets();expect(fetch).toHaveBeenLastCalledWith('/api/store/v1/wallets',expect.objectContaining({method:'GET',credentials:'same-origin',cache:'no-store'}));
    await storeAccountApi.walletChallenge({address:'0x1111111111111111111111111111111111111111',chainId:1},'csrf');
    expect(fetch).toHaveBeenLastCalledWith('/api/store/v1/wallets/challenges',expect.objectContaining({method:'POST',headers:expect.objectContaining({'X-CSRF-Token':'csrf'})}));
    await storeAccountApi.linkWallet({challengeId:'challenge-1',signature:'0x123'},'csrf');expect(JSON.parse(fetch.mock.lastCall![1].body)).toEqual({challengeId:'challenge-1',signature:'0x123'});
    await storeAccountApi.unlinkWallet('wallet/1','csrf');expect(fetch).toHaveBeenLastCalledWith('/api/store/v1/wallets/wallet%2F1',expect.objectContaining({method:'DELETE',body:'{}',headers:expect.objectContaining({'X-CSRF-Token':'csrf'})}));
    const count=fetch.mock.calls.length;expect(()=>storeAccountApi.linkWallet({challengeId:'x',signature:'x'})).toThrow(/Sign in again/);expect(()=>storeAccountApi.unlinkWallet('x')).toThrow(/Sign in again/);expect(fetch).toHaveBeenCalledTimes(count);
  });

  it('accepts stored legacy zero-fee terms but rejects missing or inconsistent fee snapshots',()=>{
    const legacy={currency:'USD' as const,amountAtomic:'2500',sellerFeeAtomic:'0',sellerProceedsAtomic:'2500',priceCents:2500,feePolicyVersion:'legacy-zero',sellerFeeBps:0,sellerFeeCents:0,sellerProceedsCents:2500};
    expect(hasLocalFeeQuote(legacy)).toBe(true);
    expect(hasLocalFeeQuote({...legacy,feePolicyVersion:'2026-11-08-seller-1pct',sellerFeeBps:100,sellerFeeCents:25,sellerProceedsCents:2475,sellerFeeAtomic:'25',sellerProceedsAtomic:'2475'})).toBe(true);
    expect(hasLocalFeeQuote({priceCents:2500})).toBe(false);
    expect(hasLocalFeeQuote({...legacy,sellerFeeCents:25})).toBe(false);
    expect(hasLocalFeeQuote({...legacy,sellerProceedsCents:-1})).toBe(false);
    expect(hasLocalFeeQuote({...legacy,sellerFeeBps:100,sellerFeeCents:1250,sellerProceedsCents:1250,sellerFeeAtomic:'1250',sellerProceedsAtomic:'1250'})).toBe(false);
    // Validate the stored rate, including historical rates and half-up rounding.
    expect(hasLocalFeeQuote({...legacy,amountAtomic:'100',priceCents:100,sellerFeeBps:250,sellerFeeCents:3,sellerProceedsCents:97,sellerFeeAtomic:'3',sellerProceedsAtomic:'97'})).toBe(true);
  });
  it('uses same-origin cookie sessions, no cache, and explicit CSRF for authenticated writes',async()=>{
    const fetch=vi.fn().mockImplementation(async()=>json({mode:'local',user:null}));vi.stubGlobal('fetch',fetch);
    await storeAccountApi.session();expect(fetch).toHaveBeenLastCalledWith('/api/store/v1/session',expect.objectContaining({credentials:'same-origin',cache:'no-store'}));
    await storeAccountApi.profile({displayName:'Test person',bio:'Preview'},'csrf-test');
    expect(fetch).toHaveBeenLastCalledWith('/api/store/v1/profile',expect.objectContaining({method:'PATCH',headers:expect.objectContaining({'X-CSRF-Token':'csrf-test','Content-Type':'application/json'})}));
  });
  it('fails closed without CSRF and never sends the mutation',()=>{const fetch=vi.fn();vi.stubGlobal('fetch',fetch);expect(()=>storeAccountApi.seed()).toThrow(/Sign in again/);expect(fetch).not.toHaveBeenCalled();});
  it('does not treat another API mode or malformed success as a local session',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(json({mode:'production',user:{id:'1'}})));await expect(storeAccountApi.session()).rejects.toMatchObject({code:'wrong_mode'});});
  it('exposes safe structured errors and preserves network failures as failures',async()=>{
    const fetch=vi.fn().mockResolvedValueOnce(json({error:{code:'conflict',message:'This item is already listed.'}},409)).mockRejectedValueOnce(new TypeError('network'));vi.stubGlobal('fetch',fetch);
    await expect(storeAccountApi.createListing({itemId:'1',amountAtomic:'1234',currency:'WILD'},'token')).rejects.toMatchObject({code:'conflict',status:409,message:'This item is already listed.'});
    await expect(storeAccountApi.session()).rejects.toBeInstanceOf(StoreApiError);
  });
  it('scopes variant queries and sends idempotency plus expected price for simulated buys',async()=>{const fetch=vi.fn().mockImplementation(async()=>json({mode:'local'}));vi.stubGlobal('fetch',fetch);await storeAccountApi.listings('hat / 1','silver&gold');expect(fetch.mock.calls[0][0]).toContain('variantId=silver%26gold');await storeAccountApi.buy('listing/1',{idempotencyKey:'test-key-123',quoteId:'quote-1',expectedAmountAtomic:'1200',expectedCurrency:'WILD',paymentCurrency:'USD',expectedPaymentAmountAtomic:'1'},'csrf');expect(fetch.mock.calls[1][0]).toBe('/api/store/v1/listings/listing%2F1/buy');expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({idempotencyKey:'test-key-123',quoteId:'quote-1',expectedAmountAtomic:'1200',expectedCurrency:'WILD',paymentCurrency:'USD',expectedPaymentAmountAtomic:'1'});});
  it('validates auth input without normalizing passwords',()=>{expect(()=>validateAuth({email:'bad',password:'123456789012',displayName:'Test'},true)).toThrow(/email/);expect(()=>validateAuth({email:'a@example.test',password:'12345678901',displayName:'Test'},true)).toThrow(/12/);expect(validateAuth({email:' a@example.test ',password:' 123456789012 ',displayName:' Test '},true)).toEqual({email:'a@example.test',password:' 123456789012 ',displayName:'Test'});});
  it('parses exact WILD units and rejects malformed, overprecise or free amounts',()=>{expect(listingAmountAtomic('12.01')).toBe('12010000000000000000');expect(listingAmountAtomic('0.000000000000000001')).toBe('1');for(const value of ['0','-1','1e3','12.1234567890123456789','NaN','01'])expect(()=>listingAmountAtomic(value)).toThrow();});
  it('blocks listing when an item is in use or already listed',()=>{const item={usage:'unlocked',listingId:null} as LocalInventoryItem;expect(canListLocalItem(item)).toBe(true);for(const usage of ['installed','placed','equipped'] as const)expect(canListLocalItem({...item,usage})).toBe(false);expect(canListLocalItem({...item,listingId:'listing-1'})).toBe(false);});
});
