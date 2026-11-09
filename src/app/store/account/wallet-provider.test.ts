import {afterEach,describe,expect,it,vi} from 'vitest';
import {discoverWalletProviders,type EthereumProvider} from './wallet-provider';
afterEach(()=>{vi.restoreAllMocks();delete (window as Window&{ethereum?:unknown}).ethereum;});
describe('wallet provider discovery',()=>{
  it('deduplicates the browser fallback and announcements without executing wallet icons',()=>{
    const provider:EthereumProvider={request:vi.fn()},other:EthereumProvider={request:vi.fn()},update=vi.fn();
    Object.defineProperty(window,'ethereum',{value:provider,configurable:true});const stop=discoverWalletProviders(update);
    const announce=(uuid:string,name:string,value:unknown)=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid,name,icon:'javascript:throw new Error()'},provider:value}}));
    announce('id-1','Example wallet',provider);announce('id-1','Conflicting provider',other);announce('id-2','Second wallet',other);announce('bad','Invalid',{});
    expect(update.mock.lastCall?.[0]).toEqual([{id:'id-1',name:'Example wallet',provider},{id:'id-2',name:'Second wallet',provider:other}]);expect(provider.request).not.toHaveBeenCalled();
    const count=update.mock.calls.length;stop();announce('id-3','Removed listener',{request:vi.fn()});expect(update).toHaveBeenCalledTimes(count);
  });
});
