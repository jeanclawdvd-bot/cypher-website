import {describe,expect,it} from 'vitest';
import {atomicAmount,formatLocalAmount,localAtomicFeeQuote,localCurrency,localDemoPaymentAmount,MAX_ATOMIC,parseWildAmount} from './currency';

describe('local currency arithmetic',()=>{
  it('keeps one atomic unit and uint256 amounts exact',()=>{
    expect(parseWildAmount('0.000000000000000001')).toBe('1');
    expect(atomicAmount(MAX_ATOMIC)).toBe(MAX_ATOMIC);
    expect(formatLocalAmount('123456789012345678123456789012345678','WILD')).toBe('123,456,789,012,345,678 WILD');
    expect(formatLocalAmount('499999999999999999','WILD')).toBe('0 WILD');
    expect(formatLocalAmount('500000000000000000','WILD')).toBe('1 WILD');
    expect(formatLocalAmount('999500000000000000000','WILD')).toBe('1,000 WILD');
    expect(formatLocalAmount('1250','USD')).toBe('$12.50');
    expect(()=>atomicAmount((BigInt(MAX_ATOMIC)+BigInt(1)).toString())).toThrow();
  });
  it('rounds USD payment up without changing the listing ask',()=>{
    expect(localDemoPaymentAmount('1000000000000000000','WILD','USD')).toBe('10');
    expect(localDemoPaymentAmount('1000000000000000001','WILD','USD')).toBe('11');
    expect(localDemoPaymentAmount('1','WILD','USD')).toBe('1');
    expect(localDemoPaymentAmount(MAX_ATOMIC,'WILD','WILD')).toBe(MAX_ATOMIC);
    expect(localDemoPaymentAmount('100','USD','WILD')).toBe('10000000000000000000');
  });
  it('rounds a one-percent fee at the atomic unit and conserves all proceeds',()=>{
    expect(localAtomicFeeQuote('149')).toMatchObject({sellerFeeAtomic:'1',sellerProceedsAtomic:'148'});
    expect(localAtomicFeeQuote('150')).toMatchObject({sellerFeeAtomic:'2',sellerProceedsAtomic:'148'});
    const quote=localAtomicFeeQuote(MAX_ATOMIC);
    expect(BigInt(quote.sellerFeeAtomic)+BigInt(quote.sellerProceedsAtomic)).toBe(BigInt(MAX_ATOMIC));
  });
  it('rejects unsupported currency, noncanonical input, unsafe numbers and excess precision',()=>{
    for(const value of ['01','1.0','-1','1e18','',null,100])expect(()=>atomicAmount(value)).toThrow();
    for(const value of ['0','1.0000000000000000001','01','-1'])expect(()=>parseWildAmount(value)).toThrow();
    expect(()=>localCurrency('ETH')).toThrow();
  });
});
