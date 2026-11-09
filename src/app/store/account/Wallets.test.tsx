import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import Wallets from './Wallets';
import {storeAccountApi,StoreApiError,type LocalWalletChallenge} from '@/sites/wilderworld/marketplace/account-client';
import {walletMessageHex,type EthereumProvider} from './wallet-provider';
const address='0x1111111111111111111111111111111111111111';
const other='0x2222222222222222222222222222222222222222';
const signature='0x'+'11'.repeat(65);
const wallet={id:'wallet-1',address,chainId:1 as const,linkedAt:'2026-11-08T10:00:00Z',proofType:'eip191' as const};
function challenge(overrides:Partial<LocalWalletChallenge>={}):LocalWalletChallenge{
  const issuedAt=new Date().toISOString(),expiresAt=new Date(Date.now()+300000).toISOString();
  const value={id:'proof-1',address,chainId:1 as const,domain:location.host,origin:location.origin,nonce:'a'.repeat(32),issuedAt,expiresAt,...overrides};
  return {...value,message:`${value.domain} wants you to sign in with your Ethereum account:\n${value.address}\n\nLink this wallet to your Wilder World local account. This signature does not authorize transactions or access to funds.\n\nURI: ${value.origin}/store/account\nVersion: 1\nChain ID: 1\nNonce: ${value.nonce}\nIssued At: ${value.issuedAt}\nExpiration Time: ${value.expiresAt}\nRequest ID: ${value.id}\nResources:\n- urn:wilderworld:local-account:account-1`,...overrides};
}
function providerFixture(){
  const state={address,chain:'0x1'};const listeners=new Map<string,Set<(...args:unknown[])=>void>>();
  const request=vi.fn(async({method}: {method:string;params?:readonly unknown[]}):Promise<unknown>=>{
    if(method==='eth_requestAccounts'||method==='eth_accounts')return [state.address];
    if(method==='eth_chainId')return state.chain;
    if(method==='wallet_switchEthereumChain'){state.chain='0x1';return null;}
    if(method==='personal_sign')return signature;
    throw new Error('Unexpected wallet method: '+method);
  });
  const provider:EthereumProvider={request,on:(event,fn)=>{if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event)!.add(fn);},removeListener:(event,fn)=>{listeners.get(event)?.delete(fn);}};
  return {provider,request,state,emit:(event:string,...args:unknown[])=>listeners.get(event)?.forEach(fn=>fn(...args))};
}
let fixture:ReturnType<typeof providerFixture>;
beforeEach(()=>{
  fixture=providerFixture();Object.defineProperty(window,'ethereum',{value:fixture.provider,configurable:true});
  vi.spyOn(storeAccountApi,'wallets').mockResolvedValue({mode:'local',wallets:[],assetSyncStatus:'unconfigured',gameDeliveryStatus:'unconfigured'});
  vi.spyOn(storeAccountApi,'walletChallenge').mockImplementation(async()=>({mode:'local',challenge:challenge()}));
  vi.spyOn(storeAccountApi,'linkWallet').mockResolvedValue({mode:'local',wallet});
  vi.spyOn(storeAccountApi,'unlinkWallet').mockResolvedValue({mode:'local',removed:true});
});
afterEach(()=>{vi.restoreAllMocks();delete (window as Window&{ethereum?:unknown}).ethereum;});
async function connect(){fireEvent.click(await screen.findByRole('button',{name:/Choose a wallet/}));fireEvent.click(screen.getByRole('button',{name:'Browser wallet'}));await screen.findByRole('button',{name:'Review wallet link'});}
async function prepare(){await connect();fireEvent.click(screen.getByRole('button',{name:'Review wallet link'}));await screen.findByRole('button',{name:'Sign and link wallet'});}

describe('Wallets',()=>{
  it('can dismiss a pending connection request without accepting its late result',async()=>{
    let finish!:(value:unknown)=>void;const original=fixture.request.getMockImplementation()!;fixture.request.mockImplementation(args=>args.method==='eth_requestAccounts'?new Promise(resolve=>{finish=resolve;}):original(args));
    render(<Wallets userId="account-1" csrfToken="csrf"/>);fireEvent.click(await screen.findByRole('button',{name:/Choose a wallet/}));fireEvent.click(screen.getByRole('button',{name:'Browser wallet'}));
    await waitFor(()=>expect(finish).toBeTypeOf('function'));fireEvent.click(screen.getByRole('button',{name:'Cancel'}));await act(async()=>finish([address]));
    expect(screen.queryByRole('button',{name:'Review wallet link'})).toBeNull();expect(screen.getByRole('button',{name:/Choose a wallet/})).toBeEnabled();expect(storeAccountApi.walletChallenge).not.toHaveBeenCalled();
  });
  it.each([true,false])('keeps an already submitted link save stable if the provider changes (success %s)',async success=>{
    let finish!:(value:unknown)=>void;vi.mocked(storeAccountApi.linkWallet).mockImplementation(()=>new Promise((resolve,reject)=>{finish=value=>success?resolve(value as Awaited<ReturnType<typeof storeAccountApi.linkWallet>>):reject(value);}));
    render(<Wallets userId="account-1" csrfToken="csrf"/>);await prepare();fireEvent.click(screen.getByRole('button',{name:'Sign and link wallet'}));await waitFor(()=>expect(finish).toBeTypeOf('function'));
    act(()=>fixture.emit('accountsChanged',[other]));expect(screen.getByRole('button',{name:/Choose a wallet/})).toBeDisabled();
    if(success){vi.mocked(storeAccountApi.wallets).mockResolvedValue({mode:'local',wallets:[wallet],assetSyncStatus:'unconfigured',gameDeliveryStatus:'unconfigured'});await act(async()=>finish({mode:'local',wallet}));await screen.findByText('Signature verified · Local link');}
    else{await act(async()=>finish(new Error('Save failed')));await screen.findByText('Save failed');}
    expect(screen.getByRole('button',{name:/Choose a wallet/})).toBeEnabled();
  });

  it('links only after an explicit signed proof and keeps sync and game delivery unconfigured',async()=>{
    const proof=challenge();vi.mocked(storeAccountApi.walletChallenge).mockResolvedValue({mode:'local',challenge:proof});
    vi.mocked(storeAccountApi.wallets).mockResolvedValueOnce({mode:'local',wallets:[],assetSyncStatus:'unconfigured',gameDeliveryStatus:'unconfigured'}).mockResolvedValue({mode:'local',wallets:[wallet],assetSyncStatus:'unconfigured',gameDeliveryStatus:'unconfigured'});
    render(<Wallets userId="account-1" csrfToken="csrf"/>);await prepare();
    expect(storeAccountApi.linkWallet).not.toHaveBeenCalled();expect(fixture.request).not.toHaveBeenCalledWith(expect.objectContaining({method:'personal_sign'}));
    expect(screen.getByText((_,node)=>node?.tagName==='PRE'&&node.textContent===proof.message)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Sign and link wallet'}));
    await screen.findByText('Signature verified · Local link');
    expect(fixture.request).toHaveBeenCalledWith({method:'personal_sign',params:[walletMessageHex(proof.message),address]});
    expect(storeAccountApi.linkWallet).toHaveBeenCalledWith({challengeId:proof.id,signature},'csrf');
    expect(screen.getAllByText('Not connected')).toHaveLength(2);expect(screen.getByText(address)).toBeTruthy();
    expect(fixture.request.mock.calls.every(([call])=>['eth_accounts','eth_requestAccounts','eth_chainId','personal_sign'].includes(call.method))).toBe(true);
  });
  it('requires an explicit switch to Ethereum Mainnet before preparing proof',async()=>{
    fixture.state.chain='0x89';render(<Wallets userId="account-1" csrfToken="csrf"/>);
    fireEvent.click(await screen.findByRole('button',{name:/Choose a wallet/}));fireEvent.click(screen.getByRole('button',{name:'Browser wallet'}));
    await screen.findByRole('button',{name:'Switch to Ethereum Mainnet'});expect(screen.queryByRole('button',{name:'Review wallet link'})).toBeNull();expect(storeAccountApi.walletChallenge).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Switch to Ethereum Mainnet'}));await screen.findByRole('button',{name:'Review wallet link'});
    expect(fixture.request).toHaveBeenCalledWith({method:'wallet_switchEthereumChain',params:[{chainId:'0x1'}]});
  });
  it('discards a pending signature when the wallet account changes',async()=>{
    let finish!:(value:unknown)=>void;
    const original=fixture.request.getMockImplementation()!;fixture.request.mockImplementation(args=>args.method==='personal_sign'?new Promise(resolve=>{finish=resolve;}):original(args));
    render(<Wallets userId="account-1" csrfToken="csrf"/>);await prepare();fireEvent.click(screen.getByRole('button',{name:'Sign and link wallet'}));
    await waitFor(()=>expect(finish).toBeTypeOf('function'));act(()=>{fixture.state.address=other;fixture.emit('accountsChanged',[other]);});
    await screen.findByText('Your wallet account or network changed. Connect again before linking.');await act(async()=>finish(signature));
    expect(storeAccountApi.linkWallet).not.toHaveBeenCalled();expect(screen.queryByText('Signature verified · Local link')).toBeNull();
  });
  it('rejects a silently changed account even if the wallet never emits an event',async()=>{
    const original=fixture.request.getMockImplementation()!;fixture.request.mockImplementation(async args=>{if(args.method==='personal_sign'){fixture.state.address=other;return signature;}return original(args);});
    render(<Wallets userId="account-1" csrfToken="csrf"/>);await prepare();fireEvent.click(screen.getByRole('button',{name:'Sign and link wallet'}));
    await screen.findByText('Your selected wallet account changed. Connect again before linking.');expect(storeAccountApi.linkWallet).not.toHaveBeenCalled();
  });
  it('handles a rejected signature without creating a link',async()=>{
    const original=fixture.request.getMockImplementation()!;fixture.request.mockImplementation(async args=>{if(args.method==='personal_sign')throw {code:4001};return original(args);});
    render(<Wallets userId="account-1" csrfToken="csrf"/>);await prepare();fireEvent.click(screen.getByRole('button',{name:'Sign and link wallet'}));
    await screen.findByText('The wallet request was cancelled. Nothing was linked; you can try again.');expect(storeAccountApi.linkWallet).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Sign and link wallet'})).toBeEnabled();
  });
  it.each(['origin','statement','account','expired'])('does not sign a mismatched %s challenge',async kind=>{
    const proof=challenge();if(kind==='origin')proof.origin='https://other.example';if(kind==='statement')proof.message=proof.message.replace('does not authorize','authorizes');if(kind==='account')proof.message=proof.message.replace('account-1','account-2');if(kind==='expired')proof.expiresAt=new Date(Date.now()-1000).toISOString();
    vi.mocked(storeAccountApi.walletChallenge).mockResolvedValue({mode:'local',challenge:proof});render(<Wallets userId="account-1" csrfToken="csrf"/>);await connect();fireEvent.click(screen.getByRole('button',{name:'Review wallet link'}));
    await screen.findByRole('alert');expect(screen.queryByRole('button',{name:'Sign and link wallet'})).toBeNull();expect(storeAccountApi.linkWallet).not.toHaveBeenCalled();expect(fixture.request).not.toHaveBeenCalledWith(expect.objectContaining({method:'personal_sign'}));
  });
  it('requires confirmation before removing a local link',async()=>{
    vi.mocked(storeAccountApi.wallets).mockResolvedValue({mode:'local',wallets:[wallet],assetSyncStatus:'unconfigured',gameDeliveryStatus:'unconfigured'});
    render(<Wallets userId="account-1" csrfToken="csrf"/>);fireEvent.click(await screen.findByRole('button',{name:'Unlink wallet'}));expect(storeAccountApi.unlinkWallet).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Confirm unlink'}));await screen.findByText('Wallet unlinked from this local account. No assets were moved and wallet permissions were not changed.');
    expect(storeAccountApi.unlinkWallet).toHaveBeenCalledWith('wallet-1','csrf');expect(screen.queryByText(address)).toBeNull();expect(fixture.request).not.toHaveBeenCalled();
  });
  it('keeps wallet actions unavailable until the server list can be read',async()=>{
    vi.mocked(storeAccountApi.wallets).mockRejectedValueOnce(new StoreApiError('Offline',0,'network'));
    render(<Wallets userId="account-1" csrfToken="csrf"/>);await screen.findByText('Offline');expect(screen.getByRole('button',{name:/Choose a wallet/})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Reload linked wallets'}));await waitFor(()=>expect(screen.getByRole('button',{name:/Choose a wallet/})).toBeEnabled());
  });
  it('does not submit a signature after leaving the Wallets view',async()=>{
    let finish!:(value:unknown)=>void;const original=fixture.request.getMockImplementation()!;fixture.request.mockImplementation(args=>args.method==='personal_sign'?new Promise(resolve=>{finish=resolve;}):original(args));
    const {unmount}=render(<Wallets userId="account-1" csrfToken="csrf"/>);await prepare();fireEvent.click(screen.getByRole('button',{name:'Sign and link wallet'}));await waitFor(()=>expect(finish).toBeTypeOf('function'));unmount();await act(async()=>finish(signature));expect(storeAccountApi.linkWallet).not.toHaveBeenCalled();
  });
});
