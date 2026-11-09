'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Check,Link2,Wallet} from 'lucide-react';
import {storeAccountApi,notifyStoreAccount,isSessionExpired,type LocalLinkedWallet,type LocalWalletChallenge} from '@/sites/wilderworld/marketplace/account-client';
import {discoverWalletProviders,ETHEREUM_MAINNET,readWalletConnection,requireWalletContext,validateWalletChallenge,walletErrorMessage,walletMessageHex,type WalletProviderChoice} from './wallet-provider';
import styles from './Wallets.module.css';

type Connection={choice:WalletProviderChoice;address:string;chainId:string};
type Operation='idle'|'connecting'|'switching'|'preparing'|'signing'|'linking'|'unlinking';
export default function Wallets({userId,csrfToken}:{userId:string;csrfToken:string}){
  const [wallets,setWallets]=useState<LocalLinkedWallet[]>([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
  const [providers,setProviders]=useState<WalletProviderChoice[]>([]),[picker,setPicker]=useState(false),[discovery,setDiscovery]=useState(0);
  const [connection,setConnection]=useState<Connection|null>(null),[challenge,setChallenge]=useState<LocalWalletChallenge|null>(null);
  const [operation,setOperationState]=useState<Operation>('idle'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[unlinkId,setUnlinkId]=useState<string|null>(null),[now,setNow]=useState(Date.now());
  const mounted=useRef(true),generation=useRef(0),operationRef=useRef<Operation>('idle'),readController=useRef<AbortController|null>(null);
  const busy=operation!=='idle',expired=!!challenge&&Date.parse(challenge.expiresAt)<=now;
  function setOperation(value:Operation){operationRef.current=value;setOperationState(value);}
  function current(id:number){return mounted.current&&generation.current===id;}
  async function refresh(){
    readController.current?.abort();const controller=new AbortController();readController.current=controller;setLoading(true);setLoadError('');
    try{const result=await storeAccountApi.wallets(controller.signal);if(!controller.signal.aborted&&mounted.current)setWallets(result.wallets);}
    catch(reason){if(!controller.signal.aborted&&mounted.current){setLoadError(walletErrorMessage(reason));if(isSessionExpired(reason))notifyStoreAccount();}}
    finally{if(!controller.signal.aborted&&mounted.current)setLoading(false);}
  }
  useEffect(()=>{mounted.current=true;refresh();return()=>{mounted.current=false;generation.current++;readController.current?.abort();};},[userId]);
  useEffect(()=>{if(!picker)return;setProviders([]);return discoverWalletProviders(setProviders);},[picker,discovery]);
  useEffect(()=>{if(!challenge)return;setNow(Date.now());const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[challenge]);
  useEffect(()=>{
    if(!connection)return;const provider=connection.choice.provider;
    const changed=()=>{if(operationRef.current==='connecting'||operationRef.current==='switching')return;if(operationRef.current==='linking'||operationRef.current==='unlinking'){setConnection(null);setChallenge(null);return;}generation.current++;setConnection(null);setChallenge(null);setOperation('idle');setError('Your wallet account or network changed. Connect again before linking.');};
    provider.on?.('accountsChanged',changed);provider.on?.('chainChanged',changed);provider.on?.('disconnect',changed);
    return()=>{provider.removeListener?.('accountsChanged',changed);provider.removeListener?.('chainChanged',changed);provider.removeListener?.('disconnect',changed);};
  },[connection]);
  function fail(reason:unknown,id:number){if(current(id)){setError(walletErrorMessage(reason));setOperation('idle');if(isSessionExpired(reason))notifyStoreAccount();}}
  async function connect(choice:WalletProviderChoice){
    if(busy)return;const id=++generation.current;setOperation('connecting');setError('');setNotice('');setChallenge(null);
    try{const result=await readWalletConnection(choice.provider,true);if(!current(id))return;setConnection({choice,...result});setPicker(false);setOperation('idle');}catch(reason){fail(reason,id);}
  }
  async function switchMainnet(){
    if(!connection||busy)return;const id=++generation.current;setOperation('switching');setError('');setChallenge(null);
    try{await connection.choice.provider.request({method:'wallet_switchEthereumChain',params:[{chainId:ETHEREUM_MAINNET}]});if(!current(id))return;const result=await readWalletConnection(connection.choice.provider);if(!current(id))return;if(result.chainId!==ETHEREUM_MAINNET)throw new Error('Your wallet is still on another network. Choose Ethereum Mainnet to continue.');setConnection({...connection,...result});setOperation('idle');}catch(reason){fail(reason,id);}
  }
  async function prepare(){
    if(!connection||busy)return;const id=++generation.current;setOperation('preparing');setError('');setNotice('');setChallenge(null);
    try{await requireWalletContext(connection.choice.provider,connection.address);if(!current(id))return;const result=await storeAccountApi.walletChallenge({address:connection.address,chainId:1},csrfToken);if(!current(id))return;validateWalletChallenge(result.challenge,connection.address,userId);setChallenge(result.challenge);setOperation('idle');}catch(reason){fail(reason,id);}
  }
  async function signAndLink(){
    if(!connection||!challenge||busy)return;const id=++generation.current;setOperation('signing');setError('');setNotice('');
    try{
      validateWalletChallenge(challenge,connection.address,userId);await requireWalletContext(connection.choice.provider,connection.address);if(!current(id))return;
      const signature=await connection.choice.provider.request({method:'personal_sign',params:[walletMessageHex(challenge.message),connection.address]});if(!current(id))return;
      if(typeof signature!=='string'||!/^0x[0-9a-f]{130}$/i.test(signature))throw new Error('The wallet returned an unsupported signature. Use an Ethereum account controlled by your own keys.');
      await requireWalletContext(connection.choice.provider,connection.address);if(!current(id))return;validateWalletChallenge(challenge,connection.address,userId);
      setOperation('linking');const result=await storeAccountApi.linkWallet({challengeId:challenge.id,signature},csrfToken);if(!mounted.current)return;
      setWallets(previous=>[...previous.filter(wallet=>wallet.id!==result.wallet.id&&wallet.address.toLowerCase()!==result.wallet.address.toLowerCase()),result.wallet]);
      setChallenge(null);setConnection(null);setOperation('idle');setNotice('Wallet linked to this local account. Item sync and delivery to your game account are not connected yet.');
      await refresh();
    }catch(reason){fail(reason,id);}
  }
  async function unlink(wallet:LocalLinkedWallet){
    if(busy)return;const id=++generation.current;setOperation('unlinking');setError('');setNotice('');
    try{await storeAccountApi.unlinkWallet(wallet.id,csrfToken);if(!mounted.current)return;setWallets(previous=>previous.filter(item=>item.id!==wallet.id));setUnlinkId(null);setOperation('idle');setNotice('Wallet unlinked from this local account. No assets were moved and wallet permissions were not changed.');}catch(reason){fail(reason,id);}
  }
  function resetConnection(){generation.current++;setChallenge(null);setConnection(null);setPicker(false);setError('');setOperation('idle');}
  return <div className={styles.root}>
    <header className={styles.heading}><div><h2>Wallets</h2><p>Connect the wallets that hold your Wilder World items.</p></div><span className={styles.network}>Ethereum Mainnet</span></header>
    <div className={styles.preview}><Link2 size={19} aria-hidden/><div><strong>Your keys stay with you.</strong><p>A signature proves you control an address. It does not transfer assets, approve spending or give this site access to your funds.</p><p>This links a wallet to your <strong>local test account</strong>. Production game-account linking, item sync and entitlement delivery are not connected yet.</p></div></div>
    <dl className={styles.status}><div><dt>Wallet proof</dt><dd>Signed ownership check</dd></div><div><dt>Ethereum item sync</dt><dd>Not connected</dd></div><div><dt>Game-account delivery</dt><dd>Not connected</dd></div></dl>
    {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status" className={styles.notice}>{notice}</p>}
    {loadError&&<div role="alert" className={styles.error}><p>{loadError}</p><button type="button" className={styles.secondary} disabled={busy||loading} onClick={refresh}>Reload linked wallets</button></div>}
    {loading?<p role="status" className={styles.muted}>Loading linked wallets…</p>:wallets.length?<div className={styles.walletList}>{wallets.map(wallet=><article className={styles.wallet} key={wallet.id}>
      <div className={styles.walletIcon}><Wallet size={24} aria-hidden/></div><div className={styles.walletInfo}><p className={styles.eyebrow}>Ethereum Mainnet</p><strong className={styles.address}>{wallet.address}</strong><span className={styles.verified}><Check size={13} aria-hidden/>Signature verified · Local link</span><small>Linked {new Date(wallet.linkedAt).toLocaleDateString()}</small></div>
      {unlinkId===wallet.id?<div className={styles.unlink} role="group" aria-label={`Unlink wallet ${wallet.address}`}><p>Remove this account link? Your wallet keeps its assets.</p><button className={styles.secondary} type="button" disabled={busy} onClick={()=>unlink(wallet)}>Confirm unlink</button><button className={styles.textButton} type="button" disabled={busy} onClick={()=>setUnlinkId(null)}>Cancel</button></div>:<button className={styles.secondary} type="button" disabled={busy} onClick={()=>setUnlinkId(wallet.id)}>Unlink wallet</button>}
    </article>)}</div>:!loadError&&<p className={styles.empty}>No wallets linked yet. Connect one to verify your address.</p>}
    <section className={styles.connect} aria-label="Connect a self-custody wallet"><h3>Connect a wallet</h3><p>Use an Ethereum browser wallet or a wallet’s in-app browser. QR connection and smart-contract wallets are not supported in this local preview.</p>
      {!connection&&!picker&&<button type="button" className={styles.primary} disabled={busy||loading||!!loadError} onClick={()=>{setPicker(true);setError('');setNotice('');}}>Choose a wallet <ArrowUpRight size={15} aria-hidden/></button>}
      {picker&&!connection&&<div className={styles.picker}><div className={styles.providers}>{providers.map(choice=><button type="button" className={styles.secondary} disabled={busy} key={choice.id} onClick={()=>connect(choice)}><Wallet size={17} aria-hidden/>{choice.name}</button>)}</div>{!providers.length&&<p className={styles.muted}>No compatible wallet was found. Open this page in your wallet’s browser, or enable its browser extension, then check again.</p>}<div className={styles.actions}><button type="button" className={styles.textButton} disabled={busy} onClick={()=>setDiscovery(value=>value+1)}>Check for wallets</button><button type="button" className={styles.textButton} onClick={resetConnection}>Cancel</button></div></div>}
      {connection&&<div className={styles.connection}><p className={styles.eyebrow}>{connection.choice.name}</p><strong className={styles.address}>{connection.address}</strong><p className={styles.muted}>{connection.chainId===ETHEREUM_MAINNET?'Ethereum Mainnet · Ready to verify':'Choose Ethereum Mainnet to verify this wallet.'}</p>
        {connection.chainId!==ETHEREUM_MAINNET?<button type="button" className={styles.primary} disabled={busy} onClick={switchMainnet}>Switch to Ethereum Mainnet</button>:challenge?<><details className={styles.proof}><summary>View signature request</summary><pre>{challenge.message}</pre></details><p className={styles.muted}>{expired?'This request expired. Refresh it before signing.':`Request expires at ${new Date(challenge.expiresAt).toLocaleTimeString()}.`}</p><div className={styles.actions}>{expired?<button type="button" className={styles.primary} disabled={busy} onClick={prepare}>Refresh signature request</button>:<button type="button" className={styles.primary} disabled={busy} onClick={signAndLink}>Sign and link wallet</button>}</div></>:<button type="button" className={styles.primary} disabled={busy} onClick={prepare}>Review wallet link</button>}
        <button type="button" className={styles.textButton} disabled={operation==='linking'||operation==='unlinking'} onClick={resetConnection}>Cancel connection</button>
      </div>}
      {busy&&<p role="status" className={styles.muted}>{operation==='signing'?'Review the message in your wallet. No transaction is requested.':operation==='linking'?'Verifying and saving your wallet link…':operation==='unlinking'?'Removing the local wallet link…':operation==='preparing'?'Preparing your signed proof…':'Continue in your wallet…'}</p>}
    </section>
  </div>;
}
