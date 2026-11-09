import {describe,expect,it} from 'vitest';
import {actionEligibility,activeOrders,compareMoney,currencyKey,emptyMarket,formatMoney,makeMarketDraft,marketStats,marketTargetKey,parseMoney,sampleChartPoints,tokenMarketKey,tradeChartPoints,unconfiguredMarketAdapter,USD,validateSnapshot,type MarketSnapshot,type MarketTarget,type MarketCurrency} from './market-data';

const contract='0x'+'a1'.repeat(20), maker='0x'+'b2'.repeat(20), wallet='0x'+'c3'.repeat(20);
const target:MarketTarget={productId:'test-product',variantId:'test-finish',identity:{chainId:1,contract,tokenId:'9007199254740993'}};
const now=Date.parse('2026-11-07T10:00:00Z');
const money=(amount:string)=>({amount,currency:USD});
function live():MarketSnapshot{return {target,status:'live',provider:'test-provider',asOf:new Date(now).toISOString(),currency:USD,historyWindow:{from:'2026-10-07T10:00:00Z',to:'2026-11-07T10:00:00Z',complete:true},message:'Test fixture',orders:[{id:'ask-1',targetKey:marketTargetKey(target),side:'ask',price:money('1250'),maker,createdAt:'2026-11-07T09:00:00Z',checkedAt:'2026-11-07T09:59:45Z',expiresAt:'2026-11-07T11:00:00Z',status:'active',provider:'test-provider'}],trades:[{id:'trade-1',targetKey:marketTargetKey(target),price:money('1100'),quantity:2,timestamp:'2026-11-06T10:00:00Z',chainId:1,txHash:'0x'+'de'.repeat(32),logIndex:2,provider:'test-provider',finalized:true}]};}

describe('market identities and exact currency amounts',()=>{
  it('keeps chain, collection, token and edition separate without number rounding',()=>{
    expect(tokenMarketKey(target.identity!)).toContain('9007199254740993');
    expect(tokenMarketKey({...target.identity!,contract:contract.toUpperCase().replace('0X','0x')})).toBe(tokenMarketKey(target.identity!));
    expect(tokenMarketKey({...target.identity!,chainId:9369})).not.toBe(tokenMarketKey(target.identity!));
    expect(tokenMarketKey({...target.identity!,editionGroup:'edition-A'})).not.toBe(tokenMarketKey(target.identity!));
    expect(()=>tokenMarketKey({chainId:1,contract})).toThrow(/identity/);
    expect(()=>tokenMarketKey({...target.identity!,tokenId:'01'})).toThrow(/identifier/);
  });
  it('scopes every order book to the exact selected finish',()=>{
    expect(marketTargetKey({...target,variantId:'other-finish'})).not.toBe(marketTargetKey(target));
    expect(()=>validateSnapshot(live(),{...target,variantId:'other-finish'})).toThrow(/identity mismatch/);
  });
  it('parses atomic values without floating point loss',()=>{
    expect(parseMoney('9007199254740993.01',USD).amount).toBe('900719925474099301');
    expect(formatMoney(parseMoney('9007199254740993.01',USD))).toBe('$9,007,199,254,740,993.01');
    const eth:MarketCurrency={kind:'native',symbol:'ETH',decimals:18,chainId:1};
    expect(parseMoney('0.000000000000000001',eth).amount).toBe('1');
    expect(formatMoney(parseMoney('0.000000000000000001',eth))).toBe('0.000000000000000001 ETH');
    for(const invalid of ['-1','1e3','0','1.001','01.1','NaN'])expect(()=>parseMoney(invalid,USD)).toThrow();
  });
  it('never combines token currencies solely by their symbol',()=>{
    const a:MarketCurrency={kind:'erc20',chainId:1,contract,symbol:'USD',decimals:6};
    const b={...a,chainId:9369};
    expect(currencyKey(a)).not.toBe(currencyKey(b));
    expect(()=>compareMoney({amount:'100',currency:a},{amount:'100',currency:b})).toThrow(/different currencies/);
    expect(()=>currencyKey({...a,contract:undefined})).toThrow(/contract/);
  });
});

describe('market evidence, stale orders and transaction boundaries',()=>{
  it('returns an honest unconfigured market without synthesized prices or trades',async()=>{
    const result=await unconfiguredMarketAdapter.read(target);
    expect(result.status).toBe('unconfigured');expect(result.orders).toEqual([]);expect(result.trades).toEqual([]);
    expect(marketStats(result,now)).toMatchObject({lowestAsk:null,highestBid:null,lastSale:null,volume:null});
  });
  it('validates live identity, finalized trade provenance and exact currencies',()=>{
    expect(validateSnapshot(live(),target).status).toBe('live');
    const mismatch=live();mismatch.orders=[{...mismatch.orders[0],targetKey:'another-product'}];
    expect(()=>validateSnapshot(mismatch,target)).toThrow(/order/);
    const unfinalized=live();unfinalized.trades=[{...unfinalized.trades[0],finalized:false}];
    expect(()=>validateSnapshot(unfinalized,target)).toThrow(/trade provenance/);
    const wrongChain=live();wrongChain.trades=[{...wrongChain.trades[0],chainId:9369}];
    expect(()=>validateSnapshot(wrongChain,target)).toThrow(/trade provenance/);
    const wrongCurrency=live();wrongCurrency.orders=[{...wrongCurrency.orders[0],price:{amount:'1',currency:{...USD,symbol:'EUR'}}}];
    expect(()=>validateSnapshot(wrongCurrency,target)).toThrow(/order/);
  });
  it('excludes stale, expired, future-checked and cancelled asks',()=>{
    for(const changes of [{checkedAt:'2026-11-07T09:58:00Z'},{expiresAt:'2026-11-07T10:00:00Z'},{status:'cancelled' as const}]){
      const snapshot=live();snapshot.orders=[{...snapshot.orders[0],...changes}];
      expect(activeOrders(snapshot,now)).toEqual([]);
      expect(marketStats(snapshot,now).lowestAsk).toBeNull();
      expect(actionEligibility('buy',snapshot,{wallet,ownership:'unknown',usage:'unlocked'},now).canPrepare).toBe(false);
    }
  });
  it('fails closed for malformed identities, duplicate events and impossible timestamps',()=>{
    const malformed=live();malformed.target={...target,identity:{...target.identity!,contract:'not-a-contract'}};
    expect(actionEligibility('list',malformed,{wallet,ownership:'verified',usage:'unlocked'},now).canPrepare).toBe(false);
    expect(()=>marketStats(malformed,now)).toThrow();
    expect(()=>tradeChartPoints(malformed,'ALL',now)).toThrow();
    const duplicate=live();duplicate.trades=[duplicate.trades[0],{...duplicate.trades[0],id:'different-provider-id'}];
    expect(()=>marketStats(duplicate,now)).toThrow(/Duplicate completed/);
    const future=live();future.trades=[{...future.trades[0],timestamp:'2026-11-08T10:00:00Z'}];
    expect(()=>tradeChartPoints(future,'ALL',now)).toThrow(/timestamp/);
    const futureOrder=live();futureOrder.orders=[{...futureOrder.orders[0],checkedAt:'2026-11-07T10:01:00Z'}];
    expect(actionEligibility('buy',futureOrder,{wallet,ownership:'unknown',usage:'unlocked'},now).canPrepare).toBe(false);
    const backwards=live();backwards.orders=[{...backwards.orders[0],expiresAt:'2026-11-07T08:00:00Z'}];
    expect(()=>validateSnapshot(backwards,target,now)).toThrow(/timestamps/);
    const window=live();window.historyWindow={from:'2026-11-07T10:00:00Z',to:'2026-10-07T10:00:00Z',complete:true};
    expect(()=>marketStats(window,now)).toThrow(/window/);
  });
  it('requires ownership and removal from active use to list or sell',()=>{
    for(const usage of ['equipped','installed','placed','unknown'] as const){
      const gate=actionEligibility('list',live(),{wallet,ownership:'verified',usage},now);
      expect(gate.canPrepare).toBe(false);expect(gate.canSubmit).toBe(false);
    }
    expect(actionEligibility('list',live(),{wallet,ownership:'not_owned',usage:'unlocked'},now).canPrepare).toBe(false);
    expect(actionEligibility('buy',live(),{wallet,ownership:'unknown',usage:'installed'},now).canPrepare).toBe(false);
  });
  it('does not permit own-order fills or turn valid read data into signing permission',()=>{
    expect(actionEligibility('buy',live(),{wallet:maker,ownership:'verified',usage:'unlocked'},now).canPrepare).toBe(false);
    const gate=actionEligibility('buy',live(),{wallet,ownership:'unknown',usage:'unlocked'},now);
    expect(gate.canPrepare).toBe(true);expect(gate.canSubmit).toBe(false);
    expect(actionEligibility('buy',live(),{ownership:'unknown',usage:'unlocked'},now).canPrepare).toBe(false);
  });
  it('only reports volume when the provider declares complete history',()=>{
    expect(marketStats(live(),now).volume?.amount).toBe('2200');
    expect(marketStats({...live(),historyWindow:{from:'2026-10-07T10:00:00Z',to:'2026-11-07T10:00:00Z',complete:false}},now).volume).toBeNull();
    expect(tradeChartPoints(live(),'1M',now)).toHaveLength(1);
  });
  it('separates sample illustration from orders, completed trades and live stats',()=>{
    const sample:MarketSnapshot={...emptyMarket(target),status:'sample'};
    expect(sampleChartPoints('1M').every(point=>point.source==='sample')).toBe(true);
    expect(tradeChartPoints(sample,'ALL')).toEqual([]);
    expect(marketStats(sample,now).lastSale).toBeNull();
    expect(actionEligibility('buy',sample,{wallet,ownership:'verified',usage:'unlocked'},now).canSubmit).toBe(false);
    expect(()=>validateSnapshot({...sample,trades:live().trades},target)).toThrow(/Non-live/);
  });
  it('keeps local drafts unsubmitted and bound to the selected variant',()=>{
    const draft=makeMarketDraft('bid',target,'12.34',USD,new Date(now).toISOString());
    expect(draft).toMatchObject({kind:'local_draft',targetKey:marketTargetKey(target),amount:{amount:'1234'},submitted:false,expiresAt:null});
    expect(draft).not.toHaveProperty('signature');expect(draft).not.toHaveProperty('txHash');
  });
});
