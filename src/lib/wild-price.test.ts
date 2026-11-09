import {describe,expect,it,vi} from 'vitest';
import {priceDecimal,validWildRate,wildEquivalent,usdEquivalent,WILD_PRICE_ID,WILD_RATE_SOURCES,WILD_RATE_MAX_AGE_MS} from './wild-price';
import {createWildRateService,parseWildRate} from './wild-price.server';

const NOW=Date.parse('2026-11-08T12:00:00Z'),key='ethereum:'+WILD_PRICE_ID.contract;
const llama=(price=.05,at=NOW)=>({coins:{[key]:{price,timestamp:at/1000,symbol:'WILD',decimals:18,confidence:.99}}});
const gecko=(price=.06,at=NOW)=>({'wilder-world':{usd:price,last_updated_at:at/1000}});
const response=(data:unknown)=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
describe('indicative WILD price data',()=>{
  it('anchors new catalog dollars while WILD floats, and leaves native asks unchanged',()=>{
    const a=parseWildRate(llama(.05),'defillama',NOW)!,b=parseWildRate(llama(.04),'defillama',NOW)!;
    expect(wildEquivalent(1200,a)).toBe('240 WILD');expect(wildEquivalent(1200,b)).toBe('300 WILD');
    expect(usdEquivalent('240000000000000000000',a)).toBe('$12.00');expect(usdEquivalent('240000000000000000000',b)).toBe('$9.60');
    expect(usdEquivalent('123456789012345678123456789012345678',a)).toBe('$6,172,839,450,617,283.91');
    expect(wildEquivalent(1,parseWildRate(llama(.03),'defillama',NOW)!)).toBe('0 WILD');
    expect(wildEquivalent(1,parseWildRate(llama(.02),'defillama',NOW)!)).toBe('1 WILD');
    expect(wildEquivalent(1999,parseWildRate(llama(.02),'defillama',NOW)!)).toBe('1,000 WILD');
    expect(priceDecimal(.1)).toBe('0.1');expect(priceDecimal(1e-8)).toBe('0.00000001');
    for(const invalid of [0,-1,NaN,Infinity,'0.1',1e-20])expect(priceDecimal(invalid)).toBeNull();
    expect(()=>wildEquivalent(Number.MAX_SAFE_INTEGER+1,a)).toThrow('Invalid price');
  });
  it('requires the exact token, confidence, positive rate and recent provider timestamp',()=>{
    const good=parseWildRate(llama(),'defillama',NOW)!;expect(validWildRate(good,NOW)).toBe(true);
    expect(parseWildRate({coins:{'ethereum:other':llama().coins[key]}},'defillama',NOW)).toBeNull();
    for(const patch of [{symbol:'OTHER'},{decimals:6},{confidence:.8},{confidence:NaN},{price:0},{timestamp:(NOW-WILD_RATE_MAX_AGE_MS)/1000},{timestamp:(NOW+120000)/1000}])expect(parseWildRate({coins:{[key]:{...llama().coins[key],...patch}}},'defillama',NOW)).toBeNull();
    expect(validWildRate({...good,provider:'toString'},NOW)).toBe(false);expect(validWildRate({...good,sourceUrl:'https://untrusted.invalid'},NOW)).toBe(false);
    expect(validWildRate({...good,expiresAt:new Date(NOW+86400000).toISOString()},NOW)).toBe(false);
    expect(validWildRate(good,NOW+WILD_RATE_MAX_AGE_MS)).toBe(false);
  });
  it('shares a single read and refreshes after its cache window',async()=>{
    let now=NOW;const fetcher=vi.fn(async()=>response(llama(.05,now)));const service=createWildRateService(fetcher,()=>now);
    const [one,two]=await Promise.all([service.read(),service.read()]);expect(one).toEqual(two);expect(fetcher).toHaveBeenCalledTimes(1);expect(one.status).toBe('fresh');
    await service.read();expect(fetcher).toHaveBeenCalledTimes(1);now+=60000;await service.read();expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.length).toBeGreaterThan(0);
  });
  it('uses the exact-id secondary source only when the contract feed fails',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(response(gecko()));
    const result=await createWildRateService(fetcher,()=>NOW).read();expect(result.rate?.provider).toBe('coingecko');expect(result.rate?.usdPerWild).toBe('0.06');
    expect(fetcher.mock.calls.map(call=>call[0])).toEqual([WILD_RATE_SOURCES.defillama,WILD_RATE_SOURCES.coingecko]);
    expect(fetcher.mock.calls[0][1]).toMatchObject({cache:'no-store',signal:expect.any(AbortSignal)});
  });
  it('marks retained market data stale after errors, then expires without a fabricated fallback',async()=>{
    let now=NOW;const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(response(llama())).mockRejectedValue(new Error('network'));
    const service=createWildRateService(fetcher,()=>now);expect((await service.read()).status).toBe('fresh');now+=60000;
    const stale=await service.read();expect(stale.status).toBe('stale');expect(stale.rate?.sourceUpdatedAt).toBe(new Date(NOW).toISOString());
    now=NOW+WILD_RATE_MAX_AGE_MS;expect(await service.read()).toEqual({status:'unavailable',rate:null});
    expect(await createWildRateService(vi.fn().mockRejectedValue(new Error('offline')),()=>NOW).read()).toEqual({status:'unavailable',rate:null});
  });
  it('rejects oversized and malformed provider responses',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('{}',{headers:{'content-length':'70000'}})).mockResolvedValueOnce(new Response('not-json'));
    expect(await createWildRateService(fetcher,()=>NOW).read()).toEqual({status:'unavailable',rate:null});
  });
});
