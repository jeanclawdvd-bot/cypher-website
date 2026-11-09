import {afterEach,describe,expect,it,vi} from 'vitest';
import {parseWildRate} from '@/lib/wild-price.server';
import {WILD_PRICE_ID,WILD_RATE_MAX_AGE_MS} from '@/lib/wild-price';
import {createWildRateStore} from './useWildUsdRate';

const NOW=Date.parse('2026-11-08T12:00:00Z');
const rate=(price=.05,now=NOW)=>parseWildRate({coins:{['ethereum:'+WILD_PRICE_ID.contract]:{price,timestamp:now/1000,symbol:'WILD',decimals:18,confidence:.99}}},'defillama',now)!;
const response=(data:unknown)=>new Response(JSON.stringify(data));
afterEach(()=>vi.useRealTimers());
describe('shared client market rate',()=>{
  it('shares one in-flight request across cards and refreshes while the page stays open',async()=>{
    vi.useFakeTimers();let now=NOW;let resolve!:(value:Response)=>void;
    const fetcher=vi.fn<typeof fetch>().mockImplementationOnce(()=>new Promise(done=>{resolve=done;})).mockImplementation(async()=>response({status:'fresh',rate:rate(.04,now)}));
    const store=createWildRateStore(fetcher,()=>now),a=store.subscribe(vi.fn()),b=store.subscribe(vi.fn());expect(fetcher).toHaveBeenCalledTimes(1);expect(store.getSnapshot().status).toBe('loading');
    resolve(response({status:'fresh',rate:rate()}));await store.refresh();expect(store.getSnapshot().rate?.usdPerWild).toBe('0.05');
    now+=60000;await vi.advanceTimersByTimeAsync(60000);expect(fetcher).toHaveBeenCalledTimes(2);expect(store.getSnapshot().rate?.usdPerWild).toBe('0.04');
    a();b();await vi.advanceTimersByTimeAsync(60000);expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('preserves a cached rate as stale only until source expiry',async()=>{
    let now=NOW;const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(response({status:'fresh',rate:rate()})).mockRejectedValue(new Error('offline'));
    const store=createWildRateStore(fetcher,()=>now);await store.refresh();now+=60000;await store.refresh();expect(store.getSnapshot().status).toBe('stale');
    now+=WILD_RATE_MAX_AGE_MS;await store.refresh();expect(store.getSnapshot()).toEqual({status:'unavailable',rate:null});
  });
  it('does not trust an expired, altered-token or forged-source response',async()=>{
    for(const bad of [{...rate(),contract:'0xOTHER'},{...rate(),sourceUrl:'https://other.invalid'},{...rate(),expiresAt:new Date(NOW-1).toISOString()}]){
      const store=createWildRateStore(vi.fn().mockResolvedValue(response({status:'fresh',rate:bad})),()=>NOW);await store.refresh();expect(store.getSnapshot()).toEqual({status:'unavailable',rate:null});
    }
  });
});
