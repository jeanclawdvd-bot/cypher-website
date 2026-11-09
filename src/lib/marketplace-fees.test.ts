import {describe,expect,it} from 'vitest';
import {localMarketplaceFeeQuote,marketplaceFeeBreakdown,MARKETPLACE_FEE_POLICY} from './marketplace-fees';

describe('approved one-percent marketplace fee',()=>{
  it('deducts the seller fee without adding to the buyer price',()=>{
    expect(MARKETPLACE_FEE_POLICY).toEqual({version:'2026-11-08-seller-1pct',sellerFeeBps:100,buyerFeeBps:0});
    expect(localMarketplaceFeeQuote(10_000)).toEqual({feePolicyVersion:MARKETPLACE_FEE_POLICY.version,sellerFeeBps:100,sellerFeeCents:100,sellerProceedsCents:9900});
    expect(marketplaceFeeBreakdown(BigInt(10_000))).toEqual({sellerFeeMinor:BigInt(100),sellerProceedsMinor:BigInt(9900),buyerTotalMinor:BigInt(10_000)});
  });
  it('rounds half up once with no minimum fee and conserves every minor unit',()=>{
    for(const [price,fee] of [[1,0],[49,0],[50,1],[149,1],[150,2],[300,3],[12345,123],[12350,124],[100_000_000,1_000_000]]){
      const quote=localMarketplaceFeeQuote(price);
      expect(quote.sellerFeeCents).toBe(fee);
      expect(quote.sellerFeeCents+quote.sellerProceedsCents).toBe(price);
    }
  });
  it('keeps high-precision token amounts exact and accepts an explicit zero legacy rate',()=>{
    const amount=BigInt('123456789012345678901234567890');
    const quote=marketplaceFeeBreakdown(amount);
    expect(quote.sellerFeeMinor).toBe(BigInt('1234567890123456789012345679'));
    expect(quote.sellerFeeMinor+quote.sellerProceedsMinor).toBe(amount);
    expect(marketplaceFeeBreakdown(amount,0).sellerProceedsMinor).toBe(amount);
  });
  it('rejects invalid amounts and rates instead of silently rounding input',()=>{
    for(const amount of [0,-1,1.5,NaN,Infinity,100_000_001,Number.MAX_SAFE_INTEGER])expect(()=>localMarketplaceFeeQuote(amount)).toThrow();
    expect(()=>marketplaceFeeBreakdown(BigInt(-1))).toThrow();
    for(const rate of [-1,0.5,10_001,NaN,Infinity])expect(()=>marketplaceFeeBreakdown(BigInt(100),rate)).toThrow();
  });
});
